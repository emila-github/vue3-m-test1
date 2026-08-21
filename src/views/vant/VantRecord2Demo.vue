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
import { uploadFormRecord, blobToBase64 } from '@/api/modules/demo-record'
import VantSignature from '@/components/VantSignature.vue'
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
  signature: '',
})

/** 签名人姓名：优先展示报案人姓名，未填时为 '' */
const signatureName = computed(() => form.reporterName || '')

function resetForm() {
  form.reporterName = ''
  form.phone = ''
  form.idCard = ''
  form.accidentDate = ''
  form.accidentPlace = ''
  form.description = ''
  form.signature = ''
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
  if (!canStart.value) return
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
    // 将录制视频 blob 转为 base64，随表单数据一并上传
    const base64 = await blobToBase64(result.blob)
    const up = await uploadFormRecord({
      title: '保险报案操作录屏',
      bizType: 'form-operation',
      formData: JSON.parse(JSON.stringify(form)) as Record<string, unknown>,
      sessionId: result.sessionId,
      durationMs: result.durationMs,
      base64,
      mimeType: result.mimeType,
      fileName: `${result.sessionId}.webm`,
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
  if (!form.signature) {
    showToast('请完成报案人电子签名')
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

      <!-- 电子签名 -->
      <van-cell-group title="签名确认" inset>
        <vant-signature
          v-model="form.signature"
          label="报案人签名"
          name="signature"
          required
          :signature-name="signatureName"
          title="电子签名"
          placeholder="点击此处签名"
          bake-watermark
          watermark="书写正楷"
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
      <div class="section-title">页面示例说明</div>
      <div class="usage-card">
        <p>
          本页面演示「表单操作 → 录屏 → 上传」的完整闭环：<br />
          1. 进入页面自动弹出确认框，用户点击「开始录屏」后开始录制。<br />
          2. 填写报案表单并提交。<br />
          3. 表单提交成功后自动停止录屏，并上传到 <code>/demo/form-record/upload</code>（mock）。
        </p>
      </div>

      <div class="section-title">@/plugins/record 插件使用说明</div>
      <div class="usage-card">
        <h4>1. 插件安装（main.ts）</h4>
        <pre><code>import { createScreenRecordPlugin } from '@/plugins/record'
app.use(createScreenRecordPlugin({ autoUpload: true }))</code></pre>
        <ul>
          <li><code>autoUpload</code>：停止录制后是否自动上传后端，默认 <code>true</code></li>
          <li><code>uploader</code>：自定义上传函数，默认内置 demo 上传器（base64 + JSON）</li>
          <li><code>defaultMeta</code>：默认附带的业务元数据（如统一 userId）</li>
        </ul>
        <p class="note">
          插件内部维护模块级单例，<code>useScreenRecord()</code> 在任意组件中拿到的都是同一实例。
        </p>

        <h4>2. 在组件中使用</h4>
        <pre><code>import { useScreenRecord } from '@/plugins/record'
const record = useScreenRecord()</code></pre>

        <h4>3. 核心 API</h4>
        <div class="api-table">
          <table>
            <thead>
              <tr>
                <th>方法</th>
                <th>说明</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>record.start(opts?)</code></td>
                <td>
                  发起录屏（弹出浏览器屏幕选择框）。opts 可配置分辨率、音频、时长限制、业务元数据等
                </td>
              </tr>
              <tr>
                <td><code>record.stop()</code></td>
                <td>
                  停止录制，返回 <code>ScreenRecordResult</code>（含 blob、objectURL、时长等）
                </td>
              </tr>
              <tr>
                <td><code>record.pause()</code></td>
                <td>暂停录制（MediaRecorder.pause），时序计时器停止</td>
              </tr>
              <tr>
                <td><code>record.resume()</code></td>
                <td>恢复录制（MediaRecorder.resume），时序计时器恢复</td>
              </tr>
              <tr>
                <td><code>record.upload(uploader?)</code></td>
                <td>手动上传最后一次录制产物。可传入自定义 uploader</td>
              </tr>
              <tr>
                <td><code>record.recordOperation(op, opts?)</code></td>
                <td>包裹一次业务操作：自动开始录屏→执行业务→停止→上传。业务成败均上传</td>
              </tr>
              <tr>
                <td><code>record.on(callback)</code></td>
                <td>订阅录制事件，返回取消订阅函数</td>
              </tr>
              <tr>
                <td><code>record.isSupported()</code></td>
                <td>当前环境是否支持屏幕录制（需 HTTPS/localhost + getDisplayMedia）</td>
              </tr>
              <tr>
                <td><code>record.recorder</code></td>
                <td>底层 <code>ScreenRecorder</code> 实例，可访问 state、stream、lastResult 等</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h4>4. start() 参数 ScreenRecordOptions</h4>
        <div class="api-table">
          <table>
            <thead>
              <tr>
                <th>参数</th>
                <th>类型</th>
                <th>默认值</th>
                <th>说明</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>videoConstraints</code></td>
                <td>Object</td>
                <td>1280x720@15fps</td>
                <td>视频清晰度/帧率约束</td>
              </tr>
              <tr>
                <td><code>audio</code></td>
                <td>boolean</td>
                <td>false</td>
                <td>是否录制系统/麦克风音频</td>
              </tr>
              <tr>
                <td><code>mimeType</code></td>
                <td>string</td>
                <td>自动协商</td>
                <td>期望编码格式（优先级 vp9→vp8→webm→mp4）</td>
              </tr>
              <tr>
                <td><code>maxDurationMs</code></td>
                <td>number</td>
                <td>0（不限）</td>
                <td>单次最长录制时长(ms)，超时自动停止</td>
              </tr>
              <tr>
                <td><code>timesliceMs</code></td>
                <td>number</td>
                <td>1000</td>
                <td>MediaRecorder 数据切片间隔(ms)</td>
              </tr>
              <tr>
                <td><code>autoUpload</code></td>
                <td>boolean</td>
                <td>插件配置</td>
                <td>停止后是否自动上传（可覆盖插件级配置）</td>
              </tr>
              <tr>
                <td><code>uploader</code></td>
                <td>function</td>
                <td>插件默认</td>
                <td>自定义上传函数</td>
              </tr>
              <tr>
                <td><code>meta</code></td>
                <td>ScreenRecordMeta</td>
                <td>{}</td>
                <td>业务元数据：bizType、bizId、title、userId 等</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h4>5. 录制生命周期状态 RecordState</h4>
        <div class="api-table">
          <table>
            <thead>
              <tr>
                <th>状态</th>
                <th>含义</th>
                <th>可执行操作</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>idle</code></td>
                <td>
                  空闲态，插件初始化完成但尚未开始任何录制。此时可调用 <code>start()</code> 发起录屏
                </td>
                <td>→ start()</td>
              </tr>
              <tr>
                <td><code>recording</code></td>
                <td>
                  正在录制中。MediaRecorder 处于 recording 状态，每
                  <code>timesliceMs</code> 产生数据分片，计时器定时派发 tick 事件。此时可进行暂停 or
                  停止操作
                </td>
                <td>→ pause() / stop()</td>
              </tr>
              <tr>
                <td><code>paused</code></td>
                <td>
                  录制已暂停。MediaRecorder 暂停，tick
                  计时器停止，但媒体流保持连接。用户可恢复继续录制，或停止结束录制
                </td>
                <td>→ resume() / stop()</td>
              </tr>
              <tr>
                <td><code>stopped</code></td>
                <td>
                  录制已停止（正常结束 or 超时自动停止）。Blob 已产出，objectURL 已创建，<code
                    >lastResult</code
                  >
                  可用。可重新 <code>start()</code> 开始新一轮录制
                </td>
                <td>→ start() / upload()</td>
              </tr>
              <tr>
                <td><code>error</code></td>
                <td>
                  录制过程中发生异常（如 MediaRecorder error
                  事件、用户关闭共享标签页导致轨道结束）。需重新
                  <code>start()</code> 来开启新的录制会话
                </td>
                <td>→ start()</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="state-diagram">
          <b>状态流转：</b> <code>idle</code> → (start) → <code>recording</code> ⇄ (pause/resume) ⇄
          <code>paused</code> → (stop) → <code>stopped</code> → (start) → <code>recording</code> …
          <br /><code>recording</code> / <code>paused</code> → (异常) → <code>error</code> → (start)
          → <code>recording</code> …
        </p>

        <h4>6. 事件类型 ScreenRecordEvent</h4>
        <div class="api-table">
          <table>
            <thead>
              <tr>
                <th>事件</th>
                <th>字段</th>
                <th>触发时机</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>statechange</code></td>
                <td>state, prev</td>
                <td>状态发生变化时（含新旧状态对比）</td>
              </tr>
              <tr>
                <td><code>tick</code></td>
                <td>elapsedMs</td>
                <td>录制中每 200ms 触发，携带已录制毫秒数</td>
              </tr>
              <tr>
                <td><code>complete</code></td>
                <td>result</td>
                <td>录制停止且 Blob 产出完毕（<code>recorder.onstop</code> 回调）</td>
              </tr>
              <tr>
                <td><code>uploading</code></td>
                <td>—</td>
                <td>开始上传录制文件到后端</td>
              </tr>
              <tr>
                <td><code>uploaded</code></td>
                <td>result</td>
                <td>上传成功，携带后端返回的 fileId、url 等</td>
              </tr>
              <tr>
                <td><code>error</code></td>
                <td>error</td>
                <td>录制或上传过程中发生异常</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h4>7. 停止录制产物 ScreenRecordResult</h4>
        <div class="api-table">
          <table>
            <thead>
              <tr>
                <th>字段</th>
                <th>说明</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>sessionId</code></td>
                <td>录制会话 ID（自动生成 or meta 传入）</td>
              </tr>
              <tr>
                <td><code>blob</code></td>
                <td>录制视频 Blob 对象，可进一步上传或下载</td>
              </tr>
              <tr>
                <td><code>url</code></td>
                <td>本地预览用的 object URL（页面卸载前有效）</td>
              </tr>
              <tr>
                <td><code>mimeType</code></td>
                <td>视频编码类型（如 <code>video/webm;codecs=vp9</code>）</td>
              </tr>
              <tr>
                <td><code>size</code></td>
                <td>文件大小（字节）</td>
              </tr>
              <tr>
                <td><code>durationMs</code></td>
                <td>实际录制时长（毫秒）</td>
              </tr>
              <tr>
                <td><code>startedAt / endedAt</code></td>
                <td>录制起止时间戳</td>
              </tr>
              <tr>
                <td><code>uploaded</code></td>
                <td>上传后回填的后端结果（fileId、url、fileName、size）</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h4>8. 两种典型集成模式</h4>
        <ul>
          <li>
            <b>手动控制（本页面模式）：</b>页面自行调用
            <code>start()</code>→<code>stop()</code>→<code>upload()</code>，灵活控制每个步骤的时机和
            UI 反馈
          </li>
          <li>
            <b>自动包裹：</b>使用
            <code>recordOperation(async () => submitForm(), opts)</code
            >，自动完成录制→业务执行→停止→上传全流程
          </li>
        </ul>
        <p class="note">
          注意：本页面将 <code>autoUpload</code> 设为 <code>false</code>，在表单提交成功后手动调用
          <code>stopAndUpload()</code> 转换 blob 为 base64 并上传到自定义接口，以实现「表单数据 +
          录屏文件」联合提交。
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
.usage-card h4 {
  font-size: 14px;
  color: var(--app-text, #323233);
  margin: 16px 0 6px;
  border-bottom: 1px solid #ebedf0;
  padding-bottom: 4px;
}
.usage-card h4:first-child {
  margin-top: 0;
}
.usage-card pre {
  background: #f7f8fa;
  border-radius: 8px;
  padding: 10px 12px;
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.6;
  margin: 6px 0;
}
.usage-card pre code {
  background: none;
  color: #007acc;
  padding: 0;
}
.usage-card ul {
  margin: 4px 0;
  padding-left: 18px;
}
.usage-card li {
  margin-bottom: 2px;
}
.usage-card .note {
  color: #c1c1c1;
  font-size: 12px;
  margin: 4px 0;
}
.usage-card .state-diagram {
  background: #f9fdf6;
  border: 1px dashed #d3e8c4;
  border-radius: 8px;
  padding: 8px 12px;
  margin: 8px 0;
}
.usage-card .state-diagram code {
  color: #ee0a24;
  background: none;
}
.api-table {
  overflow-x: auto;
  margin: 6px 0 12px;
}
.api-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.api-table th,
.api-table td {
  border: 1px solid #ebedf0;
  padding: 4px 8px;
  text-align: left;
  vertical-align: top;
}
.api-table th {
  background: #f7f8fa;
  font-weight: 600;
  color: var(--app-text, #323233);
  white-space: nowrap;
}
.api-table td code {
  font-size: 11px;
}
</style>
