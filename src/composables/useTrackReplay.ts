// 页面操作记录 - 回放状态管理（模块级单例 + 本地持久化）
//
// 设计要点：
// 1. 回放状态（会话、事件序列、进度、是否播放中）提升为模块级单例，
//    跨 SPA 路由切换（组件卸载）依然存活 —— 这样回放过程中发生「页面跳转」
//    （page_view 真实导航到其它路由）时，不会丢失回放进度与驱动定时器。
// 2. 同时把断点（事件序列 + 当前索引）写入 localStorage，
//    应对整页刷新等极端场景；恢复时定位到断点，用户点「播放」即可续播。
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useTrack, replayTrackEvents } from '@/plugins/track'
import type { TrackEvent } from '@/plugins/track'
import { getTrackSessionEvents, listTrackSessions } from '@/api/modules/track'
import { getUserInfo } from '@/api/core/token'

const STORAGE_KEY = 'vant-track-replay'

interface SessionSummary {
  sessionId: string
  startedAt: number
  eventCount: number
}
interface PersistShape {
  events: TrackEvent[]
  index: number
  total: number
}

// ===== 模块级单例状态（跨组件卸载存活） =====
const sessions = ref<SessionSummary[]>([])
const replayEvents = ref<TrackEvent[]>([])
const replayIndex = ref(0)
const replayTotal = ref(0)
const replaying = ref(false)
const listVisible = ref(false)
const popupView = ref<'sessions' | 'events'>('sessions')
let handle: ReturnType<typeof replayTrackEvents> | null = null
let restored = false

function persist() {
  try {
    const data: PersistShape = {
      events: replayEvents.value,
      index: replayIndex.value,
      total: replayTotal.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    /* 容量超限等忽略 */
  }
}

function restore() {
  if (restored) return
  restored = true
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const data = JSON.parse(raw) as PersistShape
    if (data.events?.length) {
      replayEvents.value = data.events
      replayTotal.value = data.total || data.events.length
      // 定位到断点，但不自动续播，避免刷新后意外跳转 / 重复操作；用户点「播放」从断点继续
      replayIndex.value = Math.min(data.index, replayEvents.value.length)
      replaying.value = false
    }
  } catch {
    /* 忽略损坏数据 */
  }
}

export function useTrackReplay() {
  const track = useTrack()
  const router = useRouter()
  const user = getUserInfo()

  restore()

  async function loadSessions() {
    const res = await listTrackSessions({ userId: user?.userId })
    sessions.value = res.list ?? []
    popupView.value = 'sessions'
    listVisible.value = true
    // 回放需关闭记录，避免重复记录；开启状态提示用户先关闭操作记录
    if (track.isEnabled()) showToast('回放前请先关闭操作记录')
    else if (!sessions.value.length) showToast('暂无会话，请先开启记录并操作')
  }

  async function loadReplay(id: string) {
    // 载入新会话前先停止旧回放，避免定时器叠加
    handle?.stop()
    replaying.value = false
    const res = await getTrackSessionEvents(id)
    replayEvents.value = res.events ?? []
    replayIndex.value = 0
    replayTotal.value = replayEvents.value.length
    // 选择记录后默认隐藏回放列表，仅保留浮动控制条；点开「列表」可展开
    listVisible.value = false
    persist()
    showToast(`载入 ${replayEvents.value.length} 条操作`)
  }

  function playReplay() {
    if (!replayEvents.value.length) return
    // 回放前自动关闭操作记录，避免重复记录（无需手动关闭）
    if (track.isEnabled()) {
      track.disable()
      showToast('已自动关闭操作记录，开始回放')
    }
    // 回放完成后再点播放：进度已到末尾，从头重新回放
    if (replayIndex.value >= replayTotal.value) {
      replayIndex.value = 0
    }
    // 跨页面回放：以 document 为根（page_view 会跳转其它路由，元素不在沙箱内）；
    // navigate 在 page_view 时真实跳转路由，还原用户导航轨迹
    handle = replayTrackEvents(replayEvents.value, {
      root: document,
      speed: 1,
      minStep: 400,
      navigate: (fullPath: string) => router.push(fullPath),
      onStep: (_ev: TrackEvent, i: number) => {
        replayIndex.value = i + 1
        persist()
      },
      onDone: () => {
        replaying.value = false
        persist()
        showToast('回放完成')
      },
    })
    replaying.value = true
    // 从断点续播：刷新 / 跨页跳转恢复后 replayIndex 已定位到断点
    handle.play(replayIndex.value)
    persist()
  }

  function stopReplay() {
    handle?.stop()
    replaying.value = false
    replayIndex.value = 0
    // 退出回放后保留已载入会话，浮动条回到「会话 + 播放」状态（不清空）
    listVisible.value = false
    persist()
  }

  // 打开列表：依据是否正在回放，决定默认展示会话列表或回放事件列表
  function openList() {
    popupView.value = replaying.value ? 'events' : 'sessions'
    listVisible.value = true
  }

  return {
    sessions,
    replayEvents,
    replayIndex,
    replayTotal,
    replaying,
    listVisible,
    popupView,
    loadSessions,
    loadReplay,
    playReplay,
    stopReplay,
    openList,
  }
}
