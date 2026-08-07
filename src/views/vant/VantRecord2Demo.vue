<script setup lang="ts">
/**
 * VantRecord2Demo —— 表单操作录屏示例
 *
 * 进入页面弹出"开始操作录屏"确认框，用户确认后自动开始录屏；
 * 填写保险报案表单并提交，表单提交成功后自动停止录屏并上传到后端。
 *
 * 录屏上传接口 /demo/form-record/upload 暂走 mock，后续可替换为 CDN 直传。
 */
import { reactive, ref, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import { showToast, showLoadingToast, closeToast, showFailToast } from 'vant/es/toast'
import { showDialog } from 'vant/es/dialog'
import { useScreenRecord } from '@/plugins/record'
import { uploadFormRecord } from '@/api/modules/demo-record'
import type { RecordState } from '@/plugins/record'

const record = useScreenRecord()

// ---------- 录屏状态 ----------
const supported = ref(record.isSupported())
const state = ref<RecordState>('idle')
const elapsedMs = ref(0)
const elapsedText = computed(() => {
  const s = Math.floor(elapsedMs.value / 1000)
  const m = Math.floor(s / 60)
  const ss = (s % 60).toString().padStart(2, '0')
  const msPart = Math.floor((elapsedMs.value % 1000) / 100)
  return `${m.toString().padStart(2, '0')}:${ss}.${msPart}`
})
const recordingUploading = ref(false)
const uploadedResult = ref<{ url?: string; fileId?: string } | null>(null)
const errorMsg = ref('')
const canStart = computed(
  () => supported.value && (state.value === 'idle' || state.value === 'stopped'),
)
const isRecording = computed(() => state.value === 'recording')

// ---------- 表单数据 ----------
const submitting = ref(false)
const form = reactive({
  reporterName: '',
  phone: '',
  idCard: '',
  accidentDate: '',
  accidentPlace: '',
  description: '',
})

function resetForm() {
  form.reporterName = ''
  form.phone = ''
  form.idCard = ''
  form.accidentDate = ''
  form.accidentPlace = ''
  form.description = ''
}

// ---------- 录屏生命周期 ----------
let off: (() => void) | null = null

onMounted(() => {
  if (!supported.value) {
    showToast('当前环境不支持屏幕录制（需 HTTPS/localhost + 支持 getDisplayMedia 的浏览器）')
    return
  }
  off = record.on((e) => {
    switch (e.type) {
      case 'statechange':
        state.value = e.state
        break
      case 'tick':
        elapsedMs.value = e.elapsedMs
        break
      case 'complete':
        elapsedMs.value = e.result.durationMs
        break
      case 'uploading':
        recordingUploading.value = true
        break
      case 'uploaded':
        recordingUploading.value = false
        uploadedResult.value = e.result
        showToast('录屏已上传')
        break
      case 'error':
        recordingUploading.value = false
        errorMsg.value = e.error.message
        showFailToast('录屏出错：' + e.error.message)
        break
    }
  })
  // 进入页面提示开始录屏
  promptStartRecord()
})

onBeforeUnmount(() => {
  off?.()
  record.recorder.dispose()
})

/** 进入页面弹出确认框，用户同意后自动开始录屏 */
async function promptStartRecord() {
  if (!supported.value || state.value !== 'idle') return
  try {
    await nextTick()
    await showDialog({
      title: '操作录屏',
      message:
        '本次表单操作将进行全程录屏，用于操作回溯与合规审计。点击"开始"后，请在浏览器弹出窗口中选择需要共享的屏幕/窗口。',
      confirmButtonText: '开始录屏并继续',
      cancelButtonText: '暂不录屏',
      showCancelButton: true,
    })
    await startRecord()
  } catch {
    // 用户点击「暂不录屏」或关闭弹框，不强制录制
    showToast('已跳过录屏，表单可正常提交')
  }
}

async function startRecord() {
  errorMsg.value = ''
  try {
    await record.start({
      autoUpload: false, // 表单提交成功后再手动上传
      meta: { bizType: 'form-operation', title: '保险报案操作录屏' },
    })
  } catch (e: any) {
    errorMsg.value = e?.message || '开始录屏失败'
    showFailToast(errorMsg.value)
    throw e
  }
}

async function stopAndUpload() {
  if (state.value !== 'recording' && state.value !== 'paused') return null
  errorMsg.value = ''
  try {
    const result = await record.stop()
    if (!result) return null
    // 表单提交成功后，上传录屏到 /demo/form-record/upload
    const up = await uploadFormRecord({
      title: '保险报案操作录屏',
      bizType: 'form-operation',
      formData: JSON.parse(JSON.stringify(form)) as Record<string, unknown>,
      sessionId: result.sessionId,
      durationMs: result.durationMs,
    })
    uploadedResult.value = up
    showToast('录屏已上传后端')
    return up
  } catch (e: any) {
    errorMsg.value = e?.message || '上传录屏失败'
    showFailToast('表单已提交，但录屏上传失败：' + errorMsg.value)
    return null
  }
}

// ---------- 表单提交 ----------
function onFormSubmit() {
  if (!form.reporterName || !form.phone) {
    showToast('请填写报案人姓名和手机号')
    return
  }
  // 模拟校验通过
  startSubmit()
}

async function startSubmit() {
  if (submitting.value) return
  submitting.value = true
  showLoadingToast({ message: '提交中…', forbidClick: true, duration: 0 })
  try {
    // 模拟表单提交（实际项目中替换为真实 API）
    await new Promise((r) => setTimeout(r, 1500))
    closeToast()
    showToast('报案提交成功')
    // 提交成功后停止录屏并上传
    if (state.value === 'recording' || state.value === 'paused') {
      await stopAndUpload()
    }
  } catch (e: any) {
    closeToast()
    showFailToast('提交失败：' + (e?.message || '未知错误'))
  } finally {
    submitting.value = false
  }
}

// ---------- 手动控制 ----------
async function manualStart() {
  promptStartRecord()
}

async function manualStop() {
  errorMsg.value = ''
  try {
    await record.stop()
    showToast('录屏已停止（未自动上传）')
  } catch (e: any) {
    errorMsg.value = e?.message || '停止录屏失败'
    showFailToast(errorMsg.value)
  }
}
</script>

<template>
  <div class="record2-demo">
    <van-nav-bar title="表单操作录屏" left-text="返回" left-arrow @click-left="$router.back()">
      <template #right>
        <van-tag v-if="isRecording" type="success" round>录屏中</van-tag>
        <van-tag v-else type="primary" round>未录制</van-tag>
      </template>
    </van-nav-bar>

    <!-- 不支持提示 -->
    <van-notice-bar v-if="!supported" type="danger" :scrollable="false">
      当前环境不支持屏幕录制：需通过 HTTPS 或 localhost 访问。
    </van-notice-bar>

    <!-- 录屏状态条 -->
    <div v-if="supported" class="record-bar" :class="{ live: isRecording }">
      <div class="record-bar__info">
        <span class="record-dot" :class="{ blink: isRecording }" />
        <span>{{ isRecording ? '录屏中' : state === 'idle' ? '等待开始录屏' : state }}</span>
        <span v-if="isRecording" class="timer">⏱ {{ elapsedText }}</span>
      </div>
      <div class="record-bar__actions">
        <van-button v-if="canStart" size="small" type="primary" round @click="manualStart">
          开始录屏
        </van-button>
        <van-button v-if="isRecording" size="small" type="warning" round @click="manualStop">
          停止录制
        </van-button>
      </div>
    </div>

    <p v-if="errorMsg" class="err-msg">⚠ {{ errorMsg }}</p>

    <!-- 已上传结果 -->
    <div v-if="uploadedResult" class="upload-result">
      <van-tag type="success" size="medium">录屏已上传</van-tag>
      <span class="upload-id">fileId: {{ uploadedResult.fileId }}</span>
    </div>

    <!-- 报案表单 -->
    <div class="form-wrap">
      <van-cell-group title="报案人信息" inset>
        <van-field
          v-model="form.reporterName"
          label="报案人"
          placeholder="请输入姓名"
          required
          clearable
        />
        <van-field
          v-model="form.phone"
          label="手机号"
          type="tel"
          placeholder="请输入手机号"
          required
          clearable
        />
        <van-field v-model="form.idCard" label="证件号码" placeholder="请输入身份证号" clearable />
      </van-cell-group>

      <van-cell-group title="出险信息" inset>
        <van-field
          v-model="form.accidentDate"
          label="出险日期"
          placeholder="如 2026-08-07"
          clearable
        />
        <van-field
          v-model="form.accidentPlace"
          label="出险地点"
          placeholder="请输入出险地点"
          clearable
        />
        <van-field
          v-model="form.description"
          label="事故经过"
          type="textarea"
          rows="3"
          autosize
          placeholder="请描述事故发生的经过"
        />
      </van-cell-group>

      <!-- 提交按钮 -->
      <div class="form-actions">
        <van-button type="default" block @click="resetForm">清空</van-button>
        <van-button
          type="primary"
          block
          :loading="submitting"
          loading-text="提交中…"
          @click="onFormSubmit"
        >
          {{ isRecording ? '提交成功后自动上传录屏' : '提交报案' }}
        </van-button>
      </div>
    </div>

    <!-- 使用说明 -->
    <div class="usage-section">
      <div class="section-title">使用说明</div>
      <div class="usage-card">
        <p>
          本页面演示「表单操作 → 录屏 → 上传」的完整闭环：<br />
          1. 进入页面自动弹出确认框，用户点击「开始录屏」后开始录制。<br />
          2. 填写报案表单并提交。<br />
          3. 表单提交成功后自动停止录屏，并上传到 <code>/demo/form-record/upload</code>（mock）。
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.record2-demo {
  min-height: 100vh;
  background: var(--app-bg, #f7f8fa);
  padding-bottom: 24px;
}

/* 录屏状态条 */
.record-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  margin: 8px 12px;
  background: var(--app-surface, #fff);
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.record-bar.live {
  border: 1px solid #07c160;
  background: #f0faf4;
}
.record-bar__info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--app-text, #323233);
}
.record-bar__actions {
  display: flex;
  gap: 8px;
}

.record-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #c8c9cc;
}
.record-dot.blink {
  background: #ee0a24;
  animation: blink 1s infinite;
}
@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

.timer {
  font-variant-numeric: tabular-nums;
  color: #ee0a24;
  font-weight: 600;
}

.err-msg {
  color: #ee0a24;
  font-size: 13px;
  margin: 4px 16px 0;
}

/* 上传结果 */
.upload-result {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  margin: 8px 12px;
  background: #f0faf4;
  border-radius: 10px;
}
.upload-id {
  font-size: 13px;
  color: #646566;
}

/* 表单 */
.form-wrap {
  padding: 0 0 12px;
}
.form-actions {
  display: flex;
  gap: 12px;
  padding: 16px;
}

/* 使用说明 */
.usage-section {
  padding: 0 12px;
}
.usage-section .section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--app-text);
  margin: 18px 0 8px;
}
.usage-card {
  background: var(--app-surface, #fff);
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  font-size: 13px;
  color: var(--app-text-3, #969799);
  line-height: 1.8;
}
.usage-card code {
  color: #07c160;
  background: #f2f3f5;
  padding: 1px 6px;
  border-radius: 4px;
  word-break: break-all;
}
</style>
