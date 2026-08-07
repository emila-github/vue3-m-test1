<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { showToast, showLoadingToast, closeToast, showFailToast } from 'vant'
import { useScreenRecord } from '@/plugins/record'
import { listScreenRecords } from '@/api/modules/demo-record'
import type { RecordState, ScreenRecordResult, ScreenRecordListItem } from '@/plugins/record'

const record = useScreenRecord()

const supported = ref(record.isSupported())
const state = ref<RecordState>('idle')
const elapsedMs = ref(0)
const result = ref<ScreenRecordResult | null>(null)
const uploading = ref(false)
const uploadedTo = ref<ScreenRecordResult['uploaded'] | null>(null)
const errorMsg = ref('')

// 实时预览
const liveVideoRef = ref<HTMLVideoElement | null>(null)
const liveStream = ref<MediaStream | null>(null)
// 业务操作包裹演示
const bizTitle = ref('投保单提交')
const operating = ref(false)
// 手动录制的「停止后自动上传」开关
const autoUpload = ref(true)

// 已上传列表
const recordList = ref<ScreenRecordListItem[]>([])
const listLoading = ref(false)

let off: (() => void) | null = null

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const ss = (s % 60).toString().padStart(2, '0')
  const msPart = Math.floor((ms % 1000) / 100)
  return `${m.toString().padStart(2, '0')}:${ss}.${msPart}`
}

const elapsedText = computed(() => fmt(elapsedMs.value))
const canStart = computed(
  () => supported.value && (state.value === 'idle' || state.value === 'stopped'),
)
const canStop = computed(() => state.value === 'recording' || state.value === 'paused')

async function bindLivePreview() {
  const v = liveVideoRef.value
  if (!v) return
  // 把当前屏幕流接到 video 元素做实时预览（浏览器特性，jsdom 下无效，需特性探测）
  if ('srcObject' in v && liveStream.value) {
    try {
      ;(v as any).srcObject = liveStream.value
      await v.play().catch(() => {})
    } catch {
      /* 预览失败不影响录制 */
    }
  }
}

async function startRecord() {
  errorMsg.value = ''
  try {
    await record.start({
      autoUpload: autoUpload.value,
      meta: { bizType: 'manual', title: bizTitle.value || '手动录屏' },
    })
  } catch (e: any) {
    errorMsg.value = e?.message || '开始录屏失败'
    showFailToast(errorMsg.value)
  }
}

function togglePause() {
  if (state.value === 'recording') record.pause()
  else if (state.value === 'paused') record.resume()
}

async function stopRecord() {
  errorMsg.value = ''
  try {
    await record.stop()
  } catch (e: any) {
    errorMsg.value = e?.message || '停止录屏失败'
    showFailToast(errorMsg.value)
  }
}

async function reUpload() {
  if (!result.value || uploading.value) return
  uploading.value = true
  errorMsg.value = ''
  try {
    const up = await record.upload()
    if (up) {
      uploadedTo.value = up
      showToast('上传成功')
    }
  } catch (e: any) {
    errorMsg.value = e?.message || '上传失败'
    showFailToast(errorMsg.value)
  } finally {
    uploading.value = false
  }
}

function downloadRecord() {
  const r = result.value
  if (!r) return
  const a = document.createElement('a')
  a.href = r.url
  const ext = r.mimeType.includes('mp4') ? 'mp4' : 'webm'
  a.download = `${r.title || 'screen-record'}-${r.sessionId}.${ext}`
  document.body.appendChild(a)
  a.click()
  a.remove()
}

// 业务操作包裹：操作发起即录屏，结束（成败）自动停止并上传
async function runBizOperation() {
  if (!canStart.value || operating.value) return
  operating.value = true
  errorMsg.value = ''
  const opToast = showLoadingToast({ message: '业务处理中并录屏…', duration: 0, forbidClick: true })
  try {
    const { operation } = await record.recordOperation(
      async () => {
        // 模拟一次「投保提交」业务动作（真实项目中替换为 submitClaim() 等）
        await new Promise((r) => setTimeout(r, 3000))
        return { policyNo: 'PICC' + Date.now() }
      },
      { meta: { bizType: 'insurance-claim', title: bizTitle.value || '投保单提交' } },
    )
    closeToast()
    showToast(`业务完成，保单号 ${(operation as any).policyNo}`)
  } catch (e: any) {
    closeToast()
    errorMsg.value = e?.message || '业务操作失败'
    showFailToast('业务失败，但录屏已尝试上传用于回溯')
  } finally {
    operating.value = false
    void loadList()
  }
}

async function loadList() {
  if (!supported.value) return
  listLoading.value = true
  try {
    const res = await listScreenRecords()
    recordList.value = res?.list ?? []
  } catch {
    /* 列表查询失败不阻塞主流程 */
  } finally {
    listLoading.value = false
  }
}

onMounted(() => {
  if (!supported.value) {
    showToast('当前环境不支持屏幕录制（需 HTTPS/localhost + 支持 getDisplayMedia 的浏览器）')
  }
  off = record.on((e) => {
    switch (e.type) {
      case 'statechange':
        state.value = e.state
        if (e.state === 'recording') {
          liveStream.value = record.recorder.stream
          void bindLivePreview()
        }
        if (e.state === 'stopped' || e.state === 'error') {
          liveStream.value = null
          if (liveVideoRef.value) (liveVideoRef.value as any).srcObject = null
        }
        break
      case 'tick':
        elapsedMs.value = e.elapsedMs
        break
      case 'complete':
        result.value = e.result
        uploadedTo.value = e.result.uploaded ?? null
        elapsedMs.value = e.result.durationMs
        break
      case 'uploading':
        uploading.value = true
        break
      case 'uploaded':
        uploading.value = false
        uploadedTo.value = e.result
        showToast('录屏已上传后端')
        void loadList()
        break
      case 'error':
        uploading.value = false
        errorMsg.value = e.error.message
        break
    }
  })
  void loadList()
})

onBeforeUnmount(() => {
  off?.()
  record.recorder.dispose()
})
</script>

<template>
  <div class="record-demo">
    <van-nav-bar
      title="屏幕录屏插件 ScreenRecord"
      left-text="返回"
      left-arrow
      @click-left="$router.back()"
    />

    <div class="wrap">
      <!-- 不支持提示 -->
      <van-notice-bar v-if="!supported" type="danger" :scrollable="false">
        当前环境不支持屏幕录制：需通过 HTTPS 或 localhost 访问，且浏览器需实现 getDisplayMedia +
        MediaRecorder。
      </van-notice-bar>

      <!-- 实时预览 / 录制结果预览 -->
      <section class="card preview-card">
        <h3>预览</h3>
        <div class="preview-box">
          <video
            v-show="state === 'recording' || state === 'paused'"
            ref="liveVideoRef"
            class="preview-video"
            muted
            playsinline
          />
          <video v-if="result" :src="result.url" class="preview-video" controls playsinline />
          <van-empty
            v-if="state !== 'recording' && state !== 'paused' && !result"
            description="尚未录制"
            image="search"
          />
        </div>
        <div class="status-row">
          <van-tag
            :type="state === 'recording' ? 'success' : state === 'error' ? 'danger' : 'primary'"
          >
            {{ state }}
          </van-tag>
          <span class="timer" :class="{ live: state === 'recording' }">⏱ {{ elapsedText }}</span>
          <van-button
            v-if="state === 'recording' || state === 'paused'"
            size="mini"
            plain
            type="warning"
            @click="togglePause"
          >
            {{ state === 'recording' ? '暂停' : '继续' }}
          </van-button>
        </div>
        <p v-if="errorMsg" class="err">⚠ {{ errorMsg }}</p>
      </section>

      <!-- 手动录屏控制 -->
      <section class="card">
        <h3>手动录屏（页面操作发起）</h3>
        <van-field v-model="bizTitle" label="录屏标题" placeholder="如：投保单提交" />
        <van-cell center title="停止后自动上传后端">
          <template #right-icon>
            <van-switch
              v-model="autoUpload"
              :disabled="state === 'recording' || state === 'paused'"
              size="20"
            />
          </template>
        </van-cell>
        <div class="btn-row">
          <van-button type="primary" :disabled="!canStart" @click="startRecord"
            >开始录屏</van-button
          >
          <van-button type="success" :disabled="!canStop" @click="stopRecord">
            {{ state === 'paused' ? '停止录制' : '停止录制' }}
          </van-button>
        </div>
        <p class="tip">
          点击「开始录屏」后浏览器会弹出「选择共享内容」；录制中可随时「停止录制」。
          若开启自动上传，停止后录屏 Blob 经内置上传器自动 POST 到
          <code>/demo/screen-record/upload</code>； 关闭则停止后保留本地副本，可手动「上传到后端」。
        </p>
      </section>

      <!-- 业务操作包裹录制 -->
      <section class="card">
        <h3>业务操作包裹（recordOperation）</h3>
        <p class="tip">
          最贴近真实诉求的用法：把一次「页面操作」整体包进 <code>recordOperation(fn)</code>，
          操作发起即自动开始录屏，操作结束（无论成败）自动停止并上传，全程无需手动起停。
        </p>
        <van-button
          type="danger"
          block
          :loading="operating"
          :disabled="!canStart || operating"
          loading-text="业务处理中并录屏…"
          @click="runBizOperation"
        >
          发起投保业务并自动录屏上传
        </van-button>
      </section>

      <!-- 录制结果 -->
      <section v-if="result" class="card">
        <h3>本次录制结果</h3>
        <van-cell-group inset>
          <van-cell title="会话 ID" :label="result.sessionId" />
          <van-cell title="编码" :value="result.mimeType" />
          <van-cell title="大小" :value="(result.size / 1024).toFixed(1) + ' KB'" />
          <van-cell title="时长" :value="fmt(result.durationMs)" />
          <van-cell v-if="uploadedTo" title="已上传后端" :label="uploadedTo.url" />
        </van-cell-group>
        <div class="btn-row">
          <van-button
            size="small"
            type="primary"
            plain
            :disabled="uploading || !!uploadedTo"
            @click="reUpload"
          >
            {{ uploadedTo ? '已上传' : uploading ? '上传中…' : '重新上传' }}
          </van-button>
          <van-button size="small" type="default" plain @click="downloadRecord"
            >下载本地副本</van-button
          >
        </div>
      </section>

      <!-- 已上传列表 -->
      <section class="card">
        <div class="list-head">
          <h3>已上传后端列表</h3>
          <van-button size="mini" :loading="listLoading" @click="loadList">刷新</van-button>
        </div>
        <van-empty v-if="!recordList.length" description="暂无上传记录" />
        <van-cell-group v-else inset>
          <van-cell
            v-for="item in recordList"
            :key="item.fileId"
            :title="item.title || item.fileName"
            :label="`${(item.size / 1024).toFixed(1)}KB · ${fmt(item.durationMs)} · ${item.bizType || '-'}`"
            :url="item.url"
            is-link
          />
        </van-cell-group>
      </section>
    </div>
  </div>
</template>

<style scoped>
.record-demo {
  min-height: 100vh;
  background: var(--app-bg, #f7f8fa);
}
.wrap {
  padding: 12px;
}
.card {
  background: var(--app-surface, #fff);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.card h3 {
  margin: 0 0 12px;
  font-size: 15px;
  color: var(--app-text, #323233);
}
.preview-card .preview-box {
  background: #000;
  border-radius: 8px;
  aspect-ratio: 16 / 9;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.preview-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}
.status-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}
.timer {
  font-variant-numeric: tabular-nums;
  color: #646566;
}
.timer.live {
  color: #ee0a24;
  font-weight: 600;
}
.err {
  color: #ee0a24;
  font-size: 13px;
  margin: 8px 0 0;
}
.btn-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 4px;
}
.tip {
  font-size: 12px;
  color: var(--app-text-3, #969799);
  line-height: 1.6;
  margin: 10px 0 0;
}
.tip code,
.err code {
  background: #f0f0f0;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 12px;
}
.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.list-head h3 {
  margin: 0;
}
</style>
