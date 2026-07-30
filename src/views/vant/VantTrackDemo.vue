<script setup lang="ts">
/**
 * 页面操作记录插件 - 演示 / 联调页
 *
 * 演示「默认开启，开启后无感知记录全站操作并上报后端，再由后端数据回放用户操作」。
 *  - 顶部开关：启用 / 关闭记录（track.enable() / track.disable()），可配置记录输入值与记录类型
 *  - 沙箱区：产生 click / input / change / submit / scroll 操作，被记录后实时展示
 *  - 回放区：从 mock 后端拉取会话，按事件序列在沙箱上重演用户操作
 */
import { onMounted, onUnmounted, ref } from 'vue'
import { showToast } from 'vant'
import { useTrack, replayTrackEvents } from '@/plugins/track'
import type { TrackEvent, TrackEventType } from '@/plugins/track'
import { listTrackSessions, getTrackSessionEvents } from '@/api/modules/track'
import { getUserInfo } from '@/api/core/token'

const track = useTrack()
const user = getUserInfo()

// ===== 开关状态 =====
const enabled = ref(track.isEnabled())
// 输入值记录开关：默认开启（记录表单填写内容）；密码值需 recordPassword 单独开启
const captureValues = ref(true)
// 密码框明文值记录：默认关闭（密码默认只记行为，需手动开启）
const recordPassword = ref(false)
// 各事件类型是否记录（可在页面勾选配置，默认全开）
const allEventTypes: { type: TrackEventType; label: string }[] = [
  { type: 'page_view', label: '页面切换' },
  { type: 'click', label: '点击' },
  { type: 'input', label: '表单输入' },
  { type: 'change', label: '值变更' },
  { type: 'submit', label: '表单提交' },
  { type: 'scroll', label: '滚屏' },
]
const recordEvents = ref<TrackEventType[]>([
  'page_view',
  'click',
  'input',
  'change',
  'submit',
  'scroll',
])
// 已在记录中：用 setOptions 实时更新配置，不重启会话、不触发上报
function applyConfig() {
  if (!enabled.value) return
  track.setOptions({
    captureValues: captureValues.value,
    recordPassword: recordPassword.value,
    events: recordEvents.value,
  })
}
function toggleEnabled(v: boolean) {
  v
    ? track.enable({
        captureValues: captureValues.value,
        recordPassword: recordPassword.value,
        events: recordEvents.value,
      })
    : track.disable()
  enabled.value = track.isEnabled()
  showToast(v ? '已开启无感知记录' : '已关闭并记录落盘')
}
// 关闭记录时也可预配置，启动后生效（enable 时带上最新配置）
function toggleCapture(v: boolean) {
  captureValues.value = v
  if (enabled.value) {
    applyConfig()
    showToast(v ? '已开启输入值记录' : '已关闭输入值记录（仅记行为）')
  } else {
    showToast(v ? '已开启输入值记录（启动后生效）' : '已关闭输入值记录（启动后生效）')
  }
}
function toggleRecordPassword(v: boolean) {
  if (v && !captureValues.value) {
    showToast('请先开启输入值记录')
    recordPassword.value = false
    return
  }
  recordPassword.value = v
  if (enabled.value) {
    applyConfig()
    showToast(v ? '已开启密码明文记录' : '已关闭密码明文记录（仅记行为）')
  } else {
    showToast(v ? '已开启密码明文记录（启动后生效）' : '已关闭密码明文记录（启动后生效）')
  }
}
function onEventsChange() {
  if (enabled.value) applyConfig()
}

// ===== 实时事件流 =====
const liveEvents = ref<TrackEvent[]>([])
let unsub: (() => void) | null = null
onMounted(() => {
  unsub = track.subscribe((events) => {
    // 仅展示最近 50 条，避免 DOM 无限增长导致频繁重排
    liveEvents.value = events.slice(-50).reverse()
  })
})
onUnmounted(() => unsub?.())

const typeColor: Record<string, string> = {
  page_view: '#1989fa',
  click: '#07c160',
  input: '#ff976a',
  change: '#7232dd',
  submit: '#ee0a24',
  scroll: '#969799',
}

// ===== 沙箱表单（产生操作记录） =====
const form = ref({ name: '', city: '', pwd: '', agree: false })
const clickCount = ref(0)
function onClickDemo() {
  clickCount.value++
  showToast(`演示按钮被点击（${clickCount.value} 次）`)
}
function onSubmit() {
  showToast('表单已提交（已记录 submit）')
}

// ===== 上报 / 清空（这些按钮自身不记录） =====
function flushNow() {
  track.flush(true)
  showToast('已手动上报缓冲')
}
function clearNow() {
  track.clear()
  showToast('已清空本地缓冲')
}

// ===== 会话查询与回放 =====
const sessions = ref<{ sessionId: string; startedAt: number; eventCount: number }[]>([])
const loadingSessions = ref(false)
async function loadSessions() {
  loadingSessions.value = true
  try {
    const res = await listTrackSessions({ userId: user?.userId })
    sessions.value = res.list ?? []
    // 拉取完成后直接展开弹出层，默认显示会话列表（可切换）
    popupView.value = 'sessions'
    listVisible.value = true
    // 回放需关闭记录，避免重复记录；开启状态提示用户先关闭操作记录
    if (enabled.value) showToast('回放前请先关闭操作记录')
    else if (!sessions.value.length) showToast('暂无会话，请先开启记录并操作')
  } finally {
    loadingSessions.value = false
  }
}

const replayEvents = ref<TrackEvent[]>([])
const replayIndex = ref(0)
const replayTotal = ref(0)
const replaying = ref(false)
const listVisible = ref(false)
// 弹出层视图：sessions=会话列表（可切换）/ events=回放事件列表（看进度）
const popupView = ref<'sessions' | 'events'>('sessions')
const sandboxRef = ref<HTMLElement | null>(null)
let handle: ReturnType<typeof replayTrackEvents> | null = null

async function loadReplay(id: string) {
  const res = await getTrackSessionEvents(id)
  replayEvents.value = res.events ?? []
  replayIndex.value = 0
  replayTotal.value = replayEvents.value.length
  // 选择记录后默认隐藏回放列表，仅保留浮动控制条；点开「列表」可展开
  listVisible.value = false
  showToast(`载入 ${replayEvents.value.length} 条操作`)
}

function playReplay() {
  if (!replayEvents.value.length) return
  // 回放前自动关闭操作记录，避免重复记录（无需手动关闭）
  if (enabled.value) {
    track.disable()
    enabled.value = track.isEnabled()
    showToast('已自动关闭操作记录，开始回放')
  }
  handle = replayTrackEvents(replayEvents.value, {
    root: sandboxRef.value ?? undefined,
    speed: 1,
    minStep: 400,
    onStep: (_ev, i) => {
      replayIndex.value = i + 1
    },
    onDone: () => {
      replaying.value = false
      showToast('回放完成')
    },
  })
  replaying.value = true
  handle.play()
}
function stopReplay() {
  handle?.stop()
  replaying.value = false
  replayIndex.value = 0
  // 退出回放后保留已载入会话，浮动条回到「会话 + 播放」状态（不清空）
  listVisible.value = false
}
// 打开列表：依据是否正在回放，决定默认展示会话列表或回放事件列表
function openList() {
  popupView.value = replaying.value ? 'events' : 'sessions'
  listVisible.value = true
}
</script>

<template>
  <div class="track-demo">
    <van-nav-bar title="页面操作记录" />

    <!-- 统一浮动控制条：拉取列表 / 会话 / 回放 / 退出回放 在一起浮动（不透明、紧凑小巧） -->
    <div class="replay-fab" data-track-ignore>
      <!-- 未拉取：仅显示小巧「拉取列表」按钮 -->
      <van-button
        v-if="!replayEvents.length && !sessions.length"
        size="mini"
        type="primary"
        icon="video-o"
        @click="loadSessions"
      >
        拉取列表
      </van-button>

      <!-- 已拉取到会话：小巧按钮，点「展开」弹出全屏会话列表 -->
      <div v-else-if="!replayEvents.length && sessions.length" class="replay-fab-bar">
        <van-button size="mini" type="primary" icon="video-o" @click="loadSessions"
          >会话 {{ sessions.length }}</van-button
        >
        <van-button size="mini" plain @click="listVisible = true">展开</van-button>
      </div>

      <!-- 已载入会话：未播放显示「会话 + 播放」；播放中显示「会话 + 退出播放」（无播放按钮） -->
      <template v-else>
        <div class="replay-fab-bar">
          <span class="replay-fab-title">回放 {{ replayIndex }} / {{ replayTotal }}</span>
          <div class="replay-fab-actions">
            <van-button size="mini" plain icon="video-o" @click="openList">会话</van-button>
            <van-button v-if="!replaying" size="mini" type="primary" icon="play" @click="playReplay"
              >播放</van-button
            >
            <van-button v-else size="mini" type="danger" icon="stop" @click="stopReplay"
              >退出播放</van-button
            >
          </div>
        </div>
      </template>
    </div>

    <!-- 全屏宽弹出层：会话列表 / 回放事件列表（白底、文字清晰、不挤在浮动条里） -->
    <van-popup v-model:show="listVisible" position="bottom" :style="{ height: '85%' }" round>
      <div class="popup-head">
        <span class="popup-title">{{
          popupView === 'sessions' ? '会话列表' : '回放事件列表'
        }}</span>
        <van-icon name="cross" class="popup-close" @click="listVisible = false" />
      </div>
      <div class="popup-body">
        <!-- 会话列表：可点选切换会话 -->
        <template v-if="popupView === 'sessions'">
          <div
            v-for="s in sessions"
            :key="s.sessionId"
            class="replay-session"
            @click="loadReplay(s.sessionId)"
          >
            <div class="replay-session-time">{{ new Date(s.startedAt).toLocaleString() }}</div>
            <div class="replay-session-count">{{ s.eventCount }} 条操作</div>
          </div>
          <van-button
            v-if="replayEvents.length"
            size="small"
            block
            class="popup-refresh"
            @click="popupView = 'events'"
            >查看回放事件</van-button
          >
          <van-button size="small" block class="popup-refresh" @click="loadSessions"
            >重新拉取</van-button
          >
        </template>
        <!-- 回放事件列表：查看当前回放内容 / 进度 -->
        <template v-else>
          <div
            v-for="(e, i) in replayEvents"
            :key="i"
            class="replay-item"
            :class="{ 'replay-item--active': i === replayIndex - 1 }"
          >
            <span class="event-badge" :style="{ background: typeColor[e.type] }">{{ e.type }}</span>
            <span class="event-sel">
              <template v-if="e.scrollY !== undefined"
                >滚屏 ({{ e.scrollX }}, {{ e.scrollY }})</template
              >
              <template v-else-if="e.isPassword">密码（已记录）</template>
              <template v-else-if="e.value">值：{{ e.value }}</template>
              <template v-else>{{ e.selector }}</template>
            </span>
          </div>
          <van-button size="small" block class="popup-refresh" @click="popupView = 'sessions'"
            >返回会话列表</van-button
          >
        </template>
      </div>
    </van-popup>

    <!-- 开关（本区域操作不记录：加 data-track-ignore） -->
    <van-cell-group inset class="block block--top" data-track-ignore>
      <van-cell title="启用操作记录" label="默认开启，对全站进行无感知记录并上报；可随时关闭">
        <template #value>
          <van-switch :model-value="enabled" @update:model-value="toggleEnabled" />
        </template>
      </van-cell>
      <van-cell title="记录输入值" label="默认开启，记录表单填写内容（供回放回填）">
        <template #value>
          <van-switch :model-value="captureValues" @update:model-value="toggleCapture" />
        </template>
      </van-cell>
      <van-cell title="记录密码值" label="默认关闭，密码框仅记行为；手动开启才记录明文">
        <template #value>
          <van-switch
            :model-value="recordPassword"
            :disabled="!captureValues"
            @update:model-value="toggleRecordPassword"
          />
        </template>
      </van-cell>
      <van-cell title="记录类型" label="勾选需要记录的操作类型（修改即时生效）">
        <template #label>
          <van-checkbox-group
            v-model="recordEvents"
            direction="horizontal"
            @change="onEventsChange"
          >
            <van-checkbox
              v-for="opt in allEventTypes"
              :key="opt.type"
              :name="opt.type"
              class="cfg-check"
            >
              {{ opt.label }}
            </van-checkbox>
          </van-checkbox-group>
        </template>
      </van-cell>
      <van-cell v-if="!enabled" title="状态" value="未开启" />
      <van-cell
        v-else
        title="状态"
        :value="captureValues ? '记录中（含输入值）' : '记录中（仅行为）'"
      />
    </van-cell-group>

    <!-- 沙箱：产生操作 -->
    <van-cell-group inset title="操作沙箱（在此操作会被记录）" class="block">
      <form id="track-form" ref="sandboxRef" class="sandbox" @submit.prevent="onSubmit">
        <van-field id="track-name" v-model="form.name" label="姓名" placeholder="输入触发 input" />
        <van-field id="track-city" v-model="form.city" label="城市" placeholder="输入触发 input" />
        <van-field
          id="track-pwd"
          v-model="form.pwd"
          type="password"
          label="密码"
          placeholder="开启输入值记录后才记明文"
        />
        <van-checkbox id="track-agree" v-model="form.agree" class="sandbox-check">
          同意条款（触发 change）
        </van-checkbox>
        <van-button
          id="track-btn"
          type="primary"
          size="small"
          class="sandbox-btn"
          @click="onClickDemo"
        >
          点击按钮（触发 click）
        </van-button>
        <div class="sandbox-hint">演示按钮点击次数：{{ clickCount }}</div>
        <van-button
          id="track-submit"
          type="success"
          size="small"
          native-type="submit"
          class="sandbox-btn"
        >
          提交表单（触发 submit）
        </van-button>
      </form>
    </van-cell-group>

    <!-- 上报 / 清空（不记录自身） -->
    <div class="actions" data-track-ignore>
      <van-button size="small" @click="flushNow">立即上报</van-button>
      <van-button size="small" @click="clearNow">清空缓冲</van-button>
    </div>

    <!-- 实时事件流 -->
    <van-cell-group inset :title="`实时记录（${liveEvents.length}）`" class="block">
      <div class="events">
        <div v-if="!liveEvents.length" class="events-empty">开启记录并在上方操作即可看到</div>
        <div v-for="e in liveEvents" :key="e.ts" class="event">
          <span class="event-badge" :style="{ background: typeColor[e.type] }">{{ e.type }}</span>
          <span class="event-meta">
            <template v-if="e.text">「{{ e.text }}」</template>
            <template v-else-if="e.value"
              >值：{{ e.isPassword ? '••••（密码已记录）' : e.value }}</template
            >
            <template v-else-if="e.scrollY !== undefined"
              >滚屏 ({{ e.scrollX }}, {{ e.scrollY }})</template
            >
            <span class="event-sel">{{ e.selector }}</span>
            <span class="event-t">+{{ e.t }}ms</span>
          </span>
        </div>
      </div>
    </van-cell-group>
  </div>
</template>

<style scoped>
.track-demo {
  min-height: 100vh;
  background: var(--van-background, #f7f8fa);
  /* 底部留白，避免右下角浮动控制条遮挡「上报 / 清空」 */
  padding-bottom: 80px;
}
.block {
  margin-top: 12px;
}
/* 首个配置区顶部留白，避开右上角浮动按钮，避免遮挡 */
.block--top {
  margin-top: 12px;
}
.sandbox {
  padding: 12px 16px 16px;
}
.sandbox-check {
  margin: 12px 0;
}
.sandbox-btn {
  margin-right: 10px;
  margin-top: 6px;
}
.sandbox-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--van-text-color-2, #646566);
}
.events {
  min-height: 120px;
  max-height: 280px;
  overflow-y: auto;
  overflow-anchor: none;
  padding: 12px;
  background: var(--van-background, #f7f8fa);
}
.events-empty {
  color: var(--van-text-color-3, #969799);
  font-size: 13px;
  padding: 12px 0;
  text-align: center;
}
/* 实时事件项：与弹出层统一的白卡片 + 圆角 + 轻阴影 */
.event {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 6px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}
.event-badge {
  flex: none;
  color: #fff;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
}
.event-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  font-size: 13px;
  color: var(--van-text-color, #323233);
}
.event-sel {
  color: var(--van-text-color-2, #646566);
  word-break: break-all;
}
.event-t {
  color: var(--van-primary-color);
  font-weight: 600;
}
.actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin: 16px 16px 0;
}
.cfg-check {
  margin: 8px 14px 4px 0;
}
/* 回放浮动面板：拉取/会话/回放控制 在一起浮动，固定右下角，不透明、显示区域尽量小 */
.replay-fab {
  position: fixed;
  bottom: 12px;
  right: 12px;
  z-index: 100;
  width: auto;
  max-width: min(70vw, 220px);
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
  border-radius: 6px;
  background: #fff;
  overflow: hidden;
  font-size: 11px;
}
.replay-fab-refresh {
  align-self: stretch;
}
/* 浮动控制条上的紧凑迷你按钮容器 */
.replay-fab-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 5px 8px;
  background: var(--van-primary-color, #1989fa);
  color: #fff;
}
.replay-fab-title {
  font-size: 11px;
}
.replay-fab-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}
/* ===== 全屏弹出层（会话列表 / 回放列表）===== 配色对齐「选择皮肤」弹窗（跟随皮肤变量） ===== */
.popup-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--van-border-color, #ebedf0);
  position: sticky;
  top: 0;
  background: var(--van-background-2, #fff);
  z-index: 1;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}
.popup-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--van-text-color, #323233);
}
.popup-close {
  font-size: 20px;
  color: var(--van-text-color-3, #969799);
}
/* 弹出层画布：跟随皮肤画布色（浅灰），内容用表面色白卡片，避免纯白单调 */
.popup-body {
  height: calc(100% - 53px);
  overflow-y: auto;
  padding: 12px;
  background: var(--van-background, #f7f8fa);
}
.popup-refresh {
  margin-top: 12px;
}
/* 弹出层内会话项：表面色白卡片 + 圆角 + 轻阴影 */
.replay-session {
  padding: 12px 14px;
  margin-bottom: 10px;
  background: var(--van-background-2, #fff);
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  cursor: pointer;
}
.replay-session:active {
  background: var(--van-active-color, #f2f3f5);
}
.replay-session-time {
  font-size: 14px;
  font-weight: 600;
  color: var(--van-text-color, #323233);
}
.replay-session-count {
  margin-top: 4px;
  font-size: 12px;
  color: var(--van-text-color-2, #646566);
}
/* 回放事件项：表面色白卡片 + 圆角 + 轻阴影，当前项高亮（与皮肤选中态一致） */
.replay-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 6px;
  font-size: 13px;
  color: var(--van-text-color, #323233);
  background: var(--van-background-2, #fff);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}
.replay-item--active {
  background: rgba(var(--app-primary-rgb, 25, 137, 250), 0.08);
  box-shadow: 0 0 0 2px rgba(var(--app-primary-rgb, 25, 137, 250), 0.18) inset;
  border-radius: 8px;
}
.replay-item--active {
  background: rgba(var(--app-primary-rgb, 25, 137, 250), 0.08);
  border-radius: 4px;
}
</style>
