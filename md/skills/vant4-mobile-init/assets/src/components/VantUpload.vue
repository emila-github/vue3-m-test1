<script setup lang="ts">
/**
 * VantUpload —— 通用 Vant4 文件上传组件
 *
 * 基于 van-uploader（图片类）+ 自定义上传区（证件类）封装，覆盖常见上传场景：
 *   - avatar  ：圆形头像上传
 *   - idcard  ：身份证上传，配合 variant = 'front'(人像面) | 'back'(国徽面) 展示自定义卡片占位
 *   - image   ：通用图片上传（picture-card 风格）
 *   - document：证件 / 附件上传，完全自定义 UI（文件图标 + 名称 + 大小 + 进度 + 删除），支持 PDF 等非图片
 *
 * Props:
 *   modelValue — 已上传文件 URL，单选为 string，多选为 string[]
 *   type       — 'image' | 'avatar' | 'idcard' | 'document'，默认 'image'
 *   variant    — idcard 专用：'front' | 'back'
 *   label      — 可选标题（表单内展示）
 *   multiple   — 是否多选，默认 false
 *   maxCount   — 最大上传数量，默认 1（多选时未显式设置则取 9）
 *   maxSize    — 单文件大小上限（MB），默认 5（document 默认 10）
 *   accept     — 可接受的文件类型（document 默认 'image/*,.pdf'）
 *   upload     — 可选自定义上传函数 (file) => Promise<{ url }>，不传则本地预览（ObjectURL）
 *   disabled / readonly / required
 *
 * 事件：update:modelValue / change(url, item) / success(url, item) / remove / oversize
 */
import { ref, computed, watch } from 'vue'
import { showToast } from 'vant'

export type UploadType = 'image' | 'avatar' | 'idcard' | 'document'
export type IdCardVariant = 'front' | 'back'

interface UploadItem {
  url?: string
  /** 实际保存/回显给表单的值（由 resultField 决定，默认与 url 相同） */
  value?: string
  name?: string
  status?: 'uploading' | 'done' | 'failed'
  message?: string
  file?: File
}

const props = withDefaults(
  defineProps<{
    modelValue?: string | string[]
    type?: UploadType
    variant?: IdCardVariant
    label?: string
    multiple?: boolean
    maxCount?: number
    maxSize?: number
    accept?: string
    upload?: (file: File) => Promise<Record<string, any>>
    /** 上传成功后回写到表单的字段（默认 'url'，可配 'base64' / 'fileName' 等返回结果中的任意键） */
    resultField?: string
    disabled?: boolean
    readonly?: boolean
    required?: boolean
  }>(),
  {
    modelValue: '',
    type: 'image',
    variant: 'front',
    label: '',
    multiple: false,
    maxCount: 1,
    maxSize: 0,
    accept: '',
    upload: undefined,
    resultField: 'url',
    disabled: false,
    readonly: false,
    required: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string | string[]]
  change: [value: string, item: UploadItem | null]
  success: [url: string, item: UploadItem]
  remove: [item: UploadItem]
  oversize: [file: File]
}>()

const fileList = ref<UploadItem[]>([])
const docInput = ref<HTMLInputElement | null>(null)

// 各类默认大小 / 接受类型
const realMaxSize = computed(() =>
  props.maxSize > 0 ? props.maxSize : props.type === 'document' ? 10 : 5,
)
const realAccept = computed(() => {
  if (props.accept) return props.accept
  return props.type === 'document' ? 'image/*,.pdf' : 'image/*'
})
const effectiveMaxCount = computed(() => {
  if (props.multiple) return props.maxCount > 1 ? props.maxCount : 9
  return props.maxCount
})
// 缩略图尺寸与各类占位保持一致，避免上传后尺寸变化导致页面抖动
const previewSize = computed(() =>
  props.type === 'avatar' ? 80 : props.type === 'idcard' ? ([150, 95] as [number, number]) : 80,
)

// ===== modelValue 双向同步 =====
function nameFromUrl(url: string): string {
  return decodeURIComponent(url.split('?')[0].split('/').pop() || 'file')
}
function toItems(val: string | string[]): UploadItem[] {
  const arr = Array.isArray(val) ? val : val ? [val] : []
  return arr.map((url) => ({ url, value: url, name: nameFromUrl(url), status: 'done' }))
}
watch(
  () => props.modelValue,
  (val) => {
    const arr = Array.isArray(val) ? val : val ? [val] : []
    const cur = fileList.value.map((i) => i.value).filter(Boolean) as string[]
    if (JSON.stringify(cur) !== JSON.stringify(arr)) fileList.value = toItems(val)
  },
  { immediate: true },
)

function syncModel() {
  const items = fileList.value.filter((i) => i.value)
  const urls = items.map((i) => i.value as string)
  if (props.multiple) emit('update:modelValue', urls)
  else emit('update:modelValue', urls[0] ?? '')
  const first = items[0] ?? null
  emit('change', urls[0] ?? '', first)
  if (first?.value) emit('success', first.value, first)
}

// ===== 校验 =====
function beforeRead(file: File): boolean {
  if (['image', 'avatar', 'idcard'].includes(props.type) && !file.type.startsWith('image/')) {
    showToast('请上传图片文件')
    return false
  }
  if (file.size > realMaxSize.value * 1024 * 1024) {
    emit('oversize', file)
    showToast(`文件大小不能超过 ${realMaxSize.value}MB`)
    return false
  }
  return true
}

// 由上传结果推导「预览地址」与「回写表单的值」
function applyUploadResult(it: UploadItem, result: Record<string, any> | null, file: File) {
  const preview =
    result?.url ||
    (typeof result?.base64 === 'string' && result.base64.startsWith('data:')
      ? result.base64
      : '') ||
    URL.createObjectURL(file)
  it.url = preview
  // 保存字段：默认 url，可配置为 base64 / fileName 等返回结果中的任意键
  it.value = (result && (result[props.resultField] ?? result.url)) || preview
  it.status = 'done'
  it.message = ''
}

// ===== 图片类（van-uploader）=====
function afterRead(item: any) {
  const items: UploadItem[] = Array.isArray(item) ? item : [item]
  items.forEach(async (it) => {
    it.status = 'uploading'
    it.message = '上传中...'
    try {
      const result = props.upload ? await props.upload(it.file as File) : null
      applyUploadResult(it, result, it.file as File)
    } catch {
      it.status = 'failed'
      it.message = '上传失败'
    }
    syncModel()
  })
}

// ===== 证件类（自定义 UI）=====
function pickDocument() {
  if (props.disabled || props.readonly) return
  docInput.value?.click()
}
function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files || !files.length) return
  for (const f of Array.from(files)) {
    if (fileList.value.length >= effectiveMaxCount.value) {
      showToast(`最多上传 ${effectiveMaxCount.value} 个文件`)
      break
    }
    if (!beforeRead(f)) continue
    const it: UploadItem = { name: f.name, file: f, status: 'uploading', message: '上传中...' }
    fileList.value.push(it)
    uploadItem(it)
  }
  input.value = ''
}
async function uploadItem(it: UploadItem) {
  try {
    const result = props.upload ? await props.upload(it.file as File) : null
    applyUploadResult(it, result, it.file as File)
  } catch {
    it.status = 'failed'
    it.message = '上传失败'
  }
  syncModel()
}
function removeItem(it: UploadItem) {
  const idx = fileList.value.indexOf(it)
  if (idx >= 0) fileList.value.splice(idx, 1)
  emit('remove', it)
  syncModel()
}

// ===== 工具 =====
function formatSize(bytes: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
function docIcon(it: UploadItem): string {
  const name = (it.name || '').toLowerCase()
  if (/\.(png|jpe?g|gif|webp|bmp)$/.test(name)) return 'photo-o'
  if (/\.pdf$/.test(name)) return 'description-o'
  return 'file-o'
}
</script>

<template>
  <div class="vant-upload-field">
    <div v-if="label" class="vuf-label">
      <span v-if="required" class="vuf-req">*</span>{{ label }}
    </div>

    <!-- 图片 / 头像 / 身份证：van-uploader -->
    <van-uploader
      v-if="type !== 'document'"
      v-model="fileList"
      :after-read="afterRead"
      :before-read="beforeRead"
      :max-count="effectiveMaxCount"
      :deletable="!disabled && !readonly"
      :disabled="disabled"
      :accept="realAccept"
      :preview-size="previewSize"
      class="vuf-uploader"
      :class="[`vuf-uploader--${type}`, type === 'avatar' ? 'is-round' : '']"
      @delete="syncModel"
    >
      <template #default>
        <!-- 头像 -->
        <div v-if="type === 'avatar'" class="vuf-avatar-add">
          <van-icon name="photograph" />
          <span>上传头像</span>
        </div>
        <!-- 身份证：人像面 / 国徽面 -->
        <div
          v-else-if="type === 'idcard'"
          class="vuf-idcard"
          :class="variant === 'front' ? 'vuf-idcard--front' : 'vuf-idcard--back'"
        >
          <div v-if="variant === 'front'" class="vuf-idcard-photo">
            <van-icon name="manager" />
          </div>
          <div v-else class="vuf-idcard-emblem">
            <van-icon name="flag-o" />
          </div>
          <div class="vuf-idcard-lines">
            <span class="vuf-idcard-line" style="width: 70%" />
            <span class="vuf-idcard-line" style="width: 55%" />
            <span class="vuf-idcard-line" style="width: 80%" />
          </div>
          <span class="vuf-idcard-label">
            {{ variant === 'front' ? '身份证人像面' : '身份证国徽面' }}
          </span>
        </div>
        <!-- 通用图片 -->
        <div v-else class="vuf-image-add">
          <van-icon name="plus" />
          <span>上传图片</span>
        </div>
      </template>
    </van-uploader>

    <!-- 证件 / 附件：自定义 UI -->
    <div v-else class="vuf-doc">
      <div
        class="vuf-doc-drop"
        :class="{ 'is-disabled': disabled || readonly }"
        @click="pickDocument"
      >
        <van-icon name="upgrade" class="vuf-doc-drop-icon" />
        <span>点击上传证件（支持图片 / PDF）</span>
      </div>
      <input
        ref="docInput"
        type="file"
        hidden
        :accept="realAccept"
        :multiple="multiple"
        @change="onFileChange"
      />
      <ul v-if="fileList.length" class="vuf-doc-list">
        <li v-for="(it, i) in fileList" :key="i" class="vuf-doc-item">
          <van-icon :name="docIcon(it)" class="vuf-doc-icon" />
          <div class="vuf-doc-info">
            <span class="vuf-doc-name">{{ it.name }}</span>
            <span class="vuf-doc-meta">
              {{ formatSize(it.file?.size || 0) }}
              <em v-if="it.status === 'uploading'">· 上传中…</em>
              <em v-else-if="it.status === 'failed'" class="is-failed">· 上传失败</em>
            </span>
          </div>
          <van-loading v-if="it.status === 'uploading'" size="16" class="vuf-doc-loading" />
          <van-icon
            v-else-if="!disabled && !readonly"
            name="cross"
            class="vuf-doc-del"
            @click="removeItem(it)"
          />
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.vant-upload-field {
  width: 100%;
}
.vuf-label {
  font-size: 14px;
  color: #323233;
  margin-bottom: 10px;
}
.vuf-req {
  color: #ee0a24;
  margin-right: 2px;
}

/* ===== 头像圆形 ===== */
.vuf-uploader.is-round :deep(.van-uploader__preview-image),
.vuf-uploader.is-round :deep(.van-uploader__upload) {
  border-radius: 50%;
  overflow: hidden;
}
.vuf-avatar-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 80px;
  height: 80px;
  color: #969799;
  background: #f7f8fa;
  border: 1px dashed #dcdee0;
  border-radius: 50%;
}
.vuf-avatar-add .van-icon {
  font-size: 22px;
}
.vuf-avatar-add span {
  font-size: 11px;
}

/* ===== 通用图片 ===== */
.vuf-image-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 80px;
  height: 80px;
  color: #969799;
  background: #f7f8fa;
  border: 1px dashed #dcdee0;
  border-radius: 8px;
}
.vuf-image-add .van-icon {
  font-size: 22px;
}

/* ===== 身份证卡片 ===== */
.vuf-idcard {
  position: relative;
  width: 150px;
  height: 95px;
  border-radius: 8px;
  padding: 10px 12px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  color: rgba(0, 0, 0, 0.55);
}
.vuf-idcard--front {
  flex-direction: row;
  align-items: center;
  gap: 10px;
  background: linear-gradient(135deg, #d6e4ff, #e6f0ff 55%, #d0e1ff);
  border: 1px solid #adc6ff;
}
.vuf-idcard--back {
  background: linear-gradient(135deg, #fffbe6, #fff1b8 55%, #ffe7ba);
  border: 1px solid #ffd591;
  align-items: center;
  text-align: center;
}
.vuf-idcard-photo {
  width: 34px;
  height: 42px;
  min-width: 34px;
  border-radius: 3px;
  background: linear-gradient(135deg, #91caff, #4096ff);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.85);
  font-size: 22px;
}
.vuf-idcard-emblem {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff9c6e, #fa8c16);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.9);
  font-size: 18px;
}
.vuf-idcard-lines {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}
.vuf-idcard--back .vuf-idcard-lines {
  width: 100%;
  align-items: center;
}
.vuf-idcard-line {
  display: block;
  height: 4px;
  border-radius: 2px;
  background: rgba(64, 150, 255, 0.3);
}
.vuf-idcard--back .vuf-idcard-line {
  background: rgba(250, 140, 22, 0.3);
}
.vuf-idcard-label {
  position: absolute;
  bottom: -20px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 11px;
  color: #8c8c8c;
}
.vuf-uploader--idcard {
  padding-bottom: 16px;
}

/* ===== 证件自定义 UI ===== */
.vuf-doc-drop {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 18px;
  border: 1px dashed #dcdee0;
  border-radius: 10px;
  background: #fafbfc;
  color: #646566;
  font-size: 14px;
  cursor: pointer;
  transition:
    border-color 0.2s,
    color 0.2s;
}
.vuf-doc-drop:hover {
  border-color: #1989fa;
  color: #1989fa;
}
.vuf-doc-drop.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.vuf-doc-drop-icon {
  font-size: 18px;
}
.vuf-doc-list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.vuf-doc-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}
.vuf-doc-icon {
  font-size: 22px;
  color: #1989fa;
  flex-shrink: 0;
}
.vuf-doc-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.vuf-doc-name {
  font-size: 13px;
  color: #323233;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.vuf-doc-meta {
  font-size: 11px;
  color: #969799;
}
.vuf-doc-meta em {
  font-style: normal;
}
.vuf-doc-meta .is-failed {
  color: #ee0a24;
}
.vuf-doc-loading {
  flex-shrink: 0;
}
.vuf-doc-del {
  font-size: 16px;
  color: #c8c9cc;
  flex-shrink: 0;
}
.vuf-doc-del:active {
  color: #ee0a24;
}
</style>
