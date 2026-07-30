<script setup lang="ts">
/**
 * VantUpload —— 通用 Vant4 文件上传组件
 *
 * 基于 van-uploader（图片类）+ 自定义上传区（证件类）封装，覆盖常见上传场景：
 *   - avatar  ：圆形头像上传
 *   - idcard  ：身份证上传，配合 variant = 'front'(人像面) | 'back'(国徽面) 展示自定义卡片占位；
 *                ★ 默认 UI 自适应屏幕宽度（占满整行）；传 compact 时回退为 150×95 固定小宽度 UI
 *   - image   ：通用图片上传（picture-card 风格）
 *   - invoice ：发票 / 票据图片卡片，大虚线框居中相机图标（label + 类型 tag），适合报销 / OCR 场景
 *   - document：证件 / 附件上传，完全自定义 UI（文件图标 + 名称 + 大小 + 进度 + 删除），支持 PDF 等非图片
 *
 * Props:
 *   modelValue — 已上传文件 URL，单选为 string，多选为 string[]
 *   type       — 'image' | 'avatar' | 'idcard' | 'invoice' | 'document'，默认 'image'
 *   variant    — idcard 专用：'front' | 'back'
 *   compact    — idcard 专用：true 时使用 150×95 固定小宽度 UI（手动配置）；默认 false（自适应全宽）
 *   showSample — idcard 专用：点击上传前是否先弹出「身份证上传示例」引导弹窗。默认 false（不弹，直接选图）
 *   compressBeforeUpload — 上传前若超过 maxSize，先压缩再上传。默认 false（不压缩，超限直接拒绝）；需手动配置开启
 *   compressQuality      — compressBeforeUpload 开启时的 JPEG 压缩起始质量（0-1，默认 0.8）
 *   compressMaxEdge      — compressBeforeUpload 开启时压缩后最长边像素上限（默认 1920，超过则等比缩小）
 *   label      — 可选标题（表单内展示）
 *   multiple   — 是否多选，默认 false
 *   maxCount   — 最大上传数量，默认 1（多选时未显式设置则取 9）
 *   maxSize    — 单文件大小上限（MB），默认 5（document 默认 10）
 *   accept     — 可接受的文件类型（document 默认 'image/*,.pdf'）
 *   upload     — 可选自定义上传函数 (file) => Promise<{ ... }>，不传则本地预览（ObjectURL）
 *                ★ 上传请求字段名由该函数自行组织，便于适配不同后端入参要求
 *   resultField— 回写到 modelValue 的结果字段名（默认 'url'）；可被 fieldMap.value 覆盖
 *   fieldMap   — 后端返回字段名映射，适配不同后端返回结构：
 *                  { url?: string; value?: string; name?: string }
 *                  url   后端返回「预览地址」的字段名（默认 'url'）
 *                  value 后端返回「回写值」的字段名（默认 resultField / 'url'）
 *                  name  后端返回「文件名」的字段名（可选，用于回显）
 *   responsePath — 结果对象在响应中的路径（点号分隔，如 'data.result'），为空表示直接在返回值上取字段
 *   ocrField   — ★ OCR 识别信息回填字段名（点号路径，如 'certNo' / 'data.idNumber'）。
 *                仅当配置该字段且上传成功返回对应值时，组件会 emit('ocr') 并通过 v-model:ocr 回填识别文本。
 *                例如身份证人像面传 'certNo'（回填证件号）、国徽面传 'validPeriod'（回填有效期）；
 *                后端返回结构不确定时，配合 responsePath 定位结果对象后即可任意配置，无需改动组件内部。
 *   ocr        — OCR 识别文本（v-model:ocr）：上传成功后回填的识别值，未配置 ocrField 时始终为空串
 *   disabled / readonly / required
 *   field      — 是否在原始上传 UI「下方」额外渲染一行 van-field 表单行（用于 van-form 内与其他 van-field 保持统一 UI 并提交回填数据）。
 *                 默认 false（不显示该行，原始 UI 独立渲染）；需手动开启。开启后：label 改由该 van-field 渲染（原 UI 上方不再重复显示），
 *                 右侧「上传」按钮复用同一套上传逻辑回填数据，回填值随 modelValue 同步回写该 van-field 并参与表单提交。
 *   name       — field=true 时 van-field 的 name（表单提交字段名，对应提交结果的 key）
 *   rules      — field=true 时 van-field 的校验规则数组（如 [{ required: true, message: '请上传' }]）
 *   errorMessage — field=true 时 van-field 的底部错误提示文案
 *   center     — field=true 时 van-field 的 label 是否垂直居中
 *   border     — field=true 时 van-field 是否显示下边框（默认 true）
 *
 * 事件（defineEmits）：
 *   update:modelValue(value: string | string[]) — 双向绑定回写：单选为 string，多选为 string[]
 *   change(value, item)                         — 每次 modelValue 变化时触发；
 *                                                  value 为当前主值（单选取首个，多选与 modelValue 一致），
 *                                                  item 为对应 UploadItem（无值时为 null）
 *   success(value, item, result?)              — 单次上传成功后触发（每个文件各自 emit 一次）；
 *                                                  value 为该文件回写值（it.value），item 为对应 UploadItem，
 *                                                  result 为后端<b>完整原始响应</b>（含 url / fileName / base64 等，
 *                                                  无上传函数时为 null），可用于 OCR / 审核等额外处理
 *   ocr(value, result?)                         — 仅当配置了 ocrField 且后端返回对应值时触发；
 *                                                  value 为提取到的 OCR 识别文本（如证件号 / 有效期），
 *                                                  result 为后端<b>完整原始响应</b>，便于做其它处理或回填表单
 *   update:ocr(value)                           — v-model:ocr 双向绑定：回填的 OCR 识别文本（无识别时为空串）
 *   remove(item)                                — 删除某个已上传文件时触发
 *   oversize(file)                              — 文件超过 maxSize 限制且未压缩 / 压缩后仍超限时触发（beforeRead 内）
 */
import { ref, computed, watch, nextTick } from 'vue'
import { showToast, showImagePreview } from 'vant'

export type UploadType = 'image' | 'avatar' | 'idcard' | 'invoice' | 'document'
export type IdCardVariant = 'front' | 'back'

/**
 * 后端返回字段名映射，用于适配不同后端的数据结构。
 * 不传则使用约定字段名 url / fileName。
 */
export interface UploadFieldMap {
  /** 后端返回「预览地址」的字段名（默认 'url'） */
  url?: string
  /** 后端返回「回写模型值」的字段名（默认同 resultField / 'url'） */
  value?: string
  /** 后端返回「文件名」的字段名（可选，用于回显，默认不覆盖本地文件名） */
  name?: string
}

interface UploadItem {
  url?: string
  /** 实际保存/回显给表单的值（由 resultField / fieldMap.value 决定，默认与 url 相同） */
  value?: string
  name?: string
  status?: 'uploading' | 'done' | 'failed'
  message?: string
  file?: File
  /** 显式标记为图片，供 van-uploader 的 isImageFile 判定（data URI / 无扩展名 URL 时能正确渲染 <img> 预览） */
  isImage?: boolean
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
    /** 后端返回字段名映射，适配不同后端字段名 */
    fieldMap?: UploadFieldMap
    /** 结果对象在响应中的路径（点号分隔，如 'data.result'），为空表示直接在返回值上取字段 */
    responsePath?: string
    /** 证件/附件上传区占位文案（type="document" 时显示） */
    placeholder?: string
    /** invoice 类型：label 右侧的标签文案，如 '图片'、'票据' */
    invoiceTag?: string
    disabled?: boolean
    readonly?: boolean
    required?: boolean
    /** idcard 专用：true 使用 150×95 固定小宽度 UI（手动配置）；默认 false 为自适应全宽 */
    compact?: boolean
    /** idcard 专用：点击上传前是否先弹出「身份证上传示例」引导弹窗。默认 false（不弹，直接选图） */
    showSample?: boolean
    /** 上传前若超过 maxSize，先压缩再上传。默认 false（不压缩，超限直接拒绝）；需手动配置开启 */
    compressBeforeUpload?: boolean
    /** compressBeforeUpload 开启时的 JPEG 压缩起始质量（0-1，默认 0.8） */
    compressQuality?: number
    /** compressBeforeUpload 开启时压缩后最长边像素上限（默认 1920，超过则等比缩小） */
    compressMaxEdge?: number
    /** 是否以 van-field 形式渲染（用于 van-form 表单内回填数据提交）。默认 false（不包裹 van-field）；需手动开启 */
    field?: boolean
    /** field=true 时 van-field 的 name（表单提交字段名，对应提交结果的 key） */
    name?: string
    /** field=true 时 van-field 的校验规则数组（如 [{ required: true, message: '请上传' }]） */
    rules?: Record<string, any>[]
    /** field=true 时 van-field 的底部错误提示文案 */
    errorMessage?: string
    /** field=true 时 van-field 的 label 是否垂直居中 */
    center?: boolean
    /** field=true 时 van-field 是否显示下边框（默认 true） */
    border?: boolean
    /** field=true 时是否隐藏原始区域自带的上传/添加按钮（仅保留 van-field 相机入口触发上传）。默认 false（保留原按钮，原按钮与相机入口并存） */
    hideUploadWhenField?: boolean
    /** OCR 识别信息回填字段名（点号路径，如 'certNo' / 'data.idNumber'）。配置后上传成功且该字段有值时，
     *   组件 emit('ocr') 并通过 v-model:ocr 回填识别文本（如身份证人像面 'certNo' / 国徽面 'validPeriod'） */
    ocrField?: string
    /** OCR 识别文本（v-model:ocr）：上传成功后回填的识别值，未配置 ocrField 时始终为空串 */
    ocr?: string
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
    fieldMap: undefined,
    responsePath: '',
    placeholder: '点击上传文件',
    invoiceTag: '图片',
    disabled: false,
    readonly: false,
    required: false,
    compact: false,
    showSample: false,
    compressBeforeUpload: false,
    compressQuality: 0.8,
    compressMaxEdge: 1920,
    field: false,
    name: '',
    rules: undefined,
    errorMessage: '',
    center: false,
    border: true,
    hideUploadWhenField: false,
    ocrField: undefined,
    ocr: '',
  },
)

const emit = defineEmits<{
  /** 双向绑定回写：单选 string，多选 string[] */
  'update:modelValue': [value: string | string[]]
  /** 每次 modelValue 变化时触发，value 为当前主值，item 为对应项（无值时 null） */
  change: [value: string, item: UploadItem | null]
  /** 单次上传成功后触发（每文件一次），value 为回写值 it.value，item 为对应项，result 为后端完整原始响应（可为 null） */
  success: [value: string, item: UploadItem, result?: Record<string, any> | null]
  /** 配置了 ocrField 且后端返回对应值时触发，value 为识别文本，result 为后端完整原始响应（可为 null） */
  ocr: [value: string, result?: Record<string, any> | null]
  /** v-model:ocr 双向绑定：回填的 OCR 识别文本（无识别时为空串） */
  'update:ocr': [value: string]
  /** 删除某文件时触发 */
  remove: [item: UploadItem]
  /** 文件超过 maxSize 限制时触发 */
  oversize: [file: File]
}>()

const fileList = ref<UploadItem[]>([])
const docInput = ref<HTMLInputElement | null>(null)
// 仅 idcard 使用：van-uploader 实例（用于 showSample 时手动触发选图）与示例弹窗显隐
const uploadRef = ref<{ chooseFile: () => void } | null>(null)
const sampleVisible = ref(false)

// 各类默认大小 / 接受类型
const realMaxSize = computed(() =>
  props.maxSize > 0
    ? props.maxSize
    : props.type === 'document' || props.type === 'invoice'
      ? 10
      : 5,
)
const realAccept = computed(() => {
  if (props.accept) return props.accept
  if (props.type === 'document') return 'image/*,.pdf'
  return 'image/*'
})
const effectiveMaxCount = computed(() => {
  if (props.multiple) return props.maxCount > 1 ? props.maxCount : 9
  return props.maxCount
})
// idcard 是否为手动配置的小宽度 UI
const idcardCompact = computed(() => props.type === 'idcard' && props.compact)
// 缩略图尺寸与各类占位保持一致，避免上传后尺寸变化导致页面抖动
// idcard 默认全宽（预览尺寸仅作兜底，由 CSS 强制全宽）；compact 时用 150×95 固定尺寸
const previewSize = computed(() =>
  props.type === 'avatar'
    ? 80
    : props.type === 'idcard'
      ? idcardCompact.value
        ? ([150, 95] as [number, number])
        : ([320, 200] as [number, number])
      : 80,
)
// invoice 添加按钮：单张 或 多张空态用大卡片（与单张同宽高）；多张已有图后转为与缩略图同宽的方格
const invoiceAddLarge = computed(() => !props.multiple || fileList.value.length === 0)
// field=true 时 van-field 包裹所需的属性（用于 van-form 表单内回填数据提交）
const fieldWrapperProps = computed(() =>
  props.field
    ? {
        name: props.name,
        label: props.label,
        required: props.required,
        readonly: props.readonly,
        disabled: props.disabled,
        rules: props.rules,
        errorMessage: props.errorMessage,
        center: props.center,
        border: props.border,
      }
    : {},
)

// field=true 时下方 van-field 表单行的回填值：van-field 的 modelValue 仅接受 string|number，
// 故数组（多选/证件/票据）统一序列化为 JSON 字符串承载（仍可被 van-form 收集）。
const fieldFormValue = computed<string | number>(() => {
  // field + ocrField：表单回填值优先取 OCR 识别文本（如证件号 / 签发机关），便于直接提交识别结果
  if (props.ocrField && props.ocr) return props.ocr
  const val = props.modelValue
  if (val == null) return ''
  if (Array.isArray(val)) return val.length ? JSON.stringify(val) : ''
  if (typeof val === 'number') return val
  return String(val)
})
const fieldUploading = computed(() => fileList.value.some((i) => i.status === 'uploading'))
// 多文件（document / invoice）剩余可上传个数
const remainingCount = computed(() => Math.max(effectiveMaxCount.value - fileList.value.length, 0))
// 是否展示「剩余可上传个数」提示：仅多文件（document / invoice 多选）且未禁用/只读时
const showRemainingHint = computed(
  () =>
    props.multiple &&
    ['document', 'invoice'].includes(props.type) &&
    !props.disabled &&
    !props.readonly,
)
// field=true 且开启 hideUploadWhenField：隐藏原始区域自带的上传/添加按钮，仅保留 van-field 相机入口
const hideOriginUpload = computed(() => props.field && props.hideUploadWhenField)
// OCR 识别结果展示：仅当配置 ocrField 且上传成功回填了识别文本时才展示
// 前缀文案按 type/variant 自适应（身份证正反面区分证件号 / 有效期），其余类型统一为「识别结果」
// OCR 识别结果提示文案：按 ocrField 字段名自适应（身份证正反面区分证件号 / 有效期 / 签发机关）
const OCR_FIELD_LABELS: Record<string, string> = {
  certNo: '识别证件号',
  validPeriod: '识别有效期',
  issueOrg: '识别签发机关',
}
const ocrLabel = computed(() => {
  if (!props.ocrField) return ''
  return OCR_FIELD_LABELS[props.ocrField] || '识别结果'
})
const ocrText = computed(() => props.ocr || '')
const fieldDisplayText = computed(() => {
  // field + ocrField：优先展示 OCR 识别文本（如证件号 / 签发机关），而非原始文件地址
  if (props.ocrField && props.ocr) return props.ocr
  const val = props.modelValue
  if (props.multiple) {
    const arr = Array.isArray(val) ? val : []
    return arr.length ? `已上传 ${arr.length} 个文件` : '未上传文件'
  }
  if (!val) return '未上传文件'
  const str = String(val)
  // data URI 占位图 / blob URL：不显示原始长串，按类型展示友好文案
  if (str.startsWith('data:') || str.startsWith('blob:')) {
    const typeLabels: Record<string, string> = {
      idcard: props.variant === 'front' ? '已上传人像面' : '已上传国徽面',
      avatar: '已上传头像',
      image: '已上传图片',
      invoice: '已上传发票',
      document: '已上传附件',
    }
    return typeLabels[props.type] || '已上传文件'
  }
  return nameFromUrl(str) || str
})
// field 表单行右侧相机图标：复用同一套上传逻辑（图片类走 van-uploader 选图，证件/发票类走隐藏 input）
function triggerUpload() {
  if (props.disabled || props.readonly) return
  // idcard + 开启示例引导：先弹「身份证上传示例」引导弹窗（与原占位点击行为一致）
  if (props.type === 'idcard' && props.showSample) {
    sampleVisible.value = true
  } else if (['document', 'invoice'].includes(props.type)) {
    pickDocument()
  } else {
    uploadRef.value?.chooseFile()
  }
}

// ===== modelValue 双向同步 =====
function nameFromUrl(url: string): string {
  return decodeURIComponent(url.split('?')[0]?.split('/').pop() || 'file')
}
function toItems(val: string | string[]): UploadItem[] {
  const arr = Array.isArray(val) ? val : val ? [val] : []
  // 图片类（image / avatar / idcard）回填时显式标记 isImage=true：
  // van-uploader 的 isImageFile 会先读 item.isImage，从而让无扩展名的 data URI 也走 <img> 预览，
  // 否则会被误判为「文件」只显示图标+文件名（不显示图片）。invoice/document 走自定义渲染，无需此标记。
  const isImageType = ['image', 'avatar', 'idcard'].includes(props.type)
  return arr.map((url) => ({
    url,
    value: url,
    name: nameFromUrl(url),
    status: 'done',
    isImage: isImageType,
  }))
}
watch(
  () => props.modelValue,
  (val) => {
    const arr = Array.isArray(val) ? val : val ? [val] : []
    const cur = fileList.value.map((i) => i.value).filter(Boolean) as string[]
    if (JSON.stringify(cur) !== JSON.stringify(arr)) {
      fileList.value.forEach((i) => revokeIfBlob(i.url))
      fileList.value = toItems(val)
    }
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
}

// ===== 文件处理：校验 +（可选）超限压缩 =====
// 统一处理单个文件：类型校验 → 超限压缩（compressBeforeUpload）→ 返回用于上传的 File。
// 返回 null 表示应拒绝（已 emit oversize / 提示）；否则返回原文件或压缩后的文件。
async function processFile(file: File): Promise<File | null> {
  if (
    ['image', 'avatar', 'idcard', 'invoice'].includes(props.type) &&
    !file.type.startsWith('image/')
  ) {
    showToast('请上传图片文件')
    return null
  }
  const limit = realMaxSize.value * 1024 * 1024
  // 未超限：直接上传原文件
  if (file.size <= limit) return file
  // 超限：开启压缩且为图片 → 压缩后再上传
  if (props.compressBeforeUpload && file.type.startsWith('image/')) {
    const compressed = await compressImage(file, limit)
    if (compressed) return compressed
  }
  // 未开启压缩 / 压缩失败 / 压缩后仍超限：按超限处理
  emit('oversize', file)
  showToast(`文件大小不能超过 ${realMaxSize.value}MB`)
  return null
}

// van-uploader 的 before-read：支持返回 Promise<File> 以「替换」上传文件（即压缩后的文件）。
// 拒绝时返回 rejected Promise，使 van-uploader 中止上传（resetInput）。
function beforeRead(file: File | File[]): boolean | Promise<File | File[]> {
  if (Array.isArray(file)) {
    return Promise.all(file.map((f) => processFile(f))).then((res) => {
      const ok = res.filter((f): f is File => f !== null)
      return ok.length ? ok : Promise.reject(new Error('oversize'))
    })
  }
  return processFile(file).then((f) => (f ? f : Promise.reject(new Error('oversize'))))
}

// 图片压缩：等比缩放最长边 + 调整 JPEG 质量，直到达标或质量下限；
// 返回压缩后的 File（可能仍略超，但已尽力压缩），失败返回 null。
async function compressImage(file: File, limit: number): Promise<File | null> {
  try {
    const bitmap = await createImageBitmap(file)
    const maxEdge = props.compressMaxEdge || 1920
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close?.()
      return null
    }
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()
    // PNG 保留透明通道；其余统一转 JPEG（体积更小，便于压缩达标）
    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
    let quality = Math.min(1, Math.max(0.3, props.compressQuality || 0.8))
    for (let i = 0; i < 5; i++) {
      const blob = await canvasToBlob(canvas, type, quality)
      if (!blob) break
      if (blob.size <= limit || quality <= 0.3) {
        return new File([blob], renameCompressed(file.name, type), { type })
      }
      quality = Math.max(0.3, Number((quality - 0.15).toFixed(2)))
    }
    const last = await canvasToBlob(canvas, type, 0.3)
    return last ? new File([last], renameCompressed(file.name, type), { type }) : null
  } catch {
    return null
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality))
}

// 压缩后文件名带 -compressed 后缀，便于区分（扩展名随输出类型调整）
function renameCompressed(name: string, type: string): string {
  const ext = type === 'image/png' ? '.png' : '.jpg'
  const base = name.replace(/\.[^./\\]+$/, '')
  return `${base}-compressed${ext}`
}

// ===== idcard 上传示例引导弹窗 =====
// 点击身份证占位：showSample=true 先弹示例，确认后再触发选图；否则直接选图
function onIdcardClick() {
  if (props.disabled || props.readonly) return
  if (props.showSample) {
    sampleVisible.value = true
  } else {
    uploadRef.value?.chooseFile()
  }
}
function onSampleClose() {
  sampleVisible.value = false
}
function onSampleConfirm() {
  sampleVisible.value = false
  // 关闭弹窗后再唤起系统选图，走 van-uploader 原生 after-read 流程
  nextTick(() => uploadRef.value?.chooseFile())
}

// 按 responsePath 定位响应中的结果对象（点号分隔路径，如 'data.result'）
function resolveContainer(raw: Record<string, any> | null): Record<string, any> {
  if (!raw) return {}
  if (!props.responsePath) return raw
  return props.responsePath.split('.').reduce<any>((o, k) => (o == null ? o : o[k]), raw) || raw
}

// 按点号路径读取嵌套字段（如 'data.idNumber'），任意层为 null/undefined 返回 undefined
function getByPath(obj: Record<string, any> | null | undefined, path: string): any {
  if (!obj || !path) return undefined
  return path.split('.').reduce<any>((o, k) => (o == null ? o : o[k]), obj)
}

// 释放 blob: 预览地址，避免内存泄漏
function revokeIfBlob(url?: string) {
  if (url && url.startsWith('blob:')) URL.revokeObjectURL(url)
}

// 由上传结果推导「预览地址」与「回写表单的值」，并按 fieldMap / responsePath 适配后端结构
function applyUploadResult(it: UploadItem, result: Record<string, any> | null, file: File) {
  const src = resolveContainer(result)
  const urlKey = props.fieldMap?.url || 'url'
  const preview =
    src?.[urlKey] ||
    (typeof src?.base64 === 'string' && src.base64.startsWith('data:') ? src.base64 : '') ||
    URL.createObjectURL(file)
  revokeIfBlob(it.url) // 覆盖前释放旧的 blob 预览地址
  it.url = preview
  // 回写模型的字段：fieldMap.value 优先于 resultField，默认 url
  const valueKey = props.fieldMap?.value || props.resultField
  it.value = (src && (src[valueKey] ?? src[urlKey])) || preview
  // 文件名回显字段（后端返回的文件名，可选）
  const nameKey = props.fieldMap?.name
  if (nameKey && src?.[nameKey]) it.name = src[nameKey] as string
  it.status = 'done'
  it.message = ''
}

// 统一上传处理：图片类与证件类共用，成功后 emit response / success / ocr 并同步 modelValue
async function runUpload(it: UploadItem) {
  try {
    const result = props.upload ? await props.upload(it.file as File) : null
    applyUploadResult(it, result, it.file as File)
    if (result) {
      emit('success', it.value ?? '', it, result)
      // OCR 识别信息回填：仅当配置了 ocrField 且后端返回了对应值时
      if (props.ocrField) {
        const raw = getByPath(resolveContainer(result), props.ocrField)
        const text = raw == null ? '' : String(raw)
        emit('update:ocr', text)
        if (text) emit('ocr', text, result)
      }
    }
  } catch {
    it.status = 'failed'
    it.message = '上传失败'
  }
  syncModel()
}

// ===== 图片类（van-uploader）=====
function afterRead(item: any) {
  const items: UploadItem[] = Array.isArray(item) ? item : [item]
  // 单选：先清空已有项，实现「继续上传直接覆盖原位置」（与证件类 onFileChange 行为一致）
  if (!props.multiple && fileList.value.length) {
    fileList.value.forEach((it) => revokeIfBlob(it.url))
    fileList.value = []
  }
  items.forEach((it) => {
    it.status = 'uploading'
    it.message = '上传中...'
    // van-uploader 在 after-read 前已把新项压入 v-model(fileList)；单张清空场景下此处补加，确保新项落地
    if (!fileList.value.includes(it)) fileList.value.push(it)
    runUpload(it)
  })
}

// ===== 证件类（自定义 UI）=====
function pickDocument() {
  if (props.disabled || props.readonly) return
  docInput.value?.click()
}
async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files || !files.length) return
  // 单选：先清空已有项，实现「点击上传直接替换原位置」
  if (!props.multiple && fileList.value.length) {
    fileList.value.forEach((it) => revokeIfBlob(it.url))
    fileList.value = []
  }
  for (const f of Array.from(files)) {
    if (fileList.value.length >= effectiveMaxCount.value) {
      showToast(`最多上传 ${effectiveMaxCount.value} 个文件`)
      break
    }
    const processed = await processFile(f)
    if (!processed) continue
    const it: UploadItem = {
      name: processed.name,
      file: processed,
      status: 'uploading',
      message: '上传中...',
    }
    fileList.value.push(it)
    runUpload(it)
  }
  input.value = ''
}

// 点击缩略图放大预览（多图时支持左右滑动）
function previewImage(it: UploadItem) {
  if (!it.url) return
  const urls = fileList.value.filter((i) => i.url).map((i) => i.url as string)
  const start = urls.indexOf(it.url)
  showImagePreview({ images: urls, startPosition: start < 0 ? 0 : start })
}
function removeItem(it: UploadItem) {
  revokeIfBlob(it.url) // 释放预览地址，避免内存泄漏
  const idx = fileList.value.indexOf(it)
  if (idx >= 0) fileList.value.splice(idx, 1)
  if (props.ocrField) emit('update:ocr', '') // 删除已上传文件时同步清空 OCR 回填
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
  if (name.endsWith('.pdf')) return 'description-o'
  return 'file-o'
}
</script>

<template>
  <div class="vant-upload-field">
    <!-- 原始上传 UI 的标题：field 开启时 label 交由下方 van-field 渲染，此处不再重复显示 -->
    <div v-if="label && !field" class="vuf-label">
      <span v-if="required" class="vuf-req">*</span>{{ label }}
      <span v-if="type === 'invoice' && invoiceTag" class="vuf-invoice-tag">{{ invoiceTag }}</span>
    </div>

    <!-- 图片 / 头像 / 身份证：van-uploader -->
    <van-uploader
      v-if="!['document', 'invoice'].includes(type)"
      ref="uploadRef"
      v-model="fileList"
      :after-read="afterRead"
      :before-read="beforeRead"
      :max-count="effectiveMaxCount"
      :deletable="!disabled && !readonly"
      :disabled="disabled"
      :accept="realAccept"
      :preview-size="previewSize"
      class="vuf-uploader"
      :class="[
        `vuf-uploader--${type}`,
        type === 'avatar' ? 'is-round' : '',
        idcardCompact ? 'idcard-compact' : '',
        showSample && type === 'idcard' ? 'has-sample' : '',
        hideOriginUpload ? 'is-origin-hidden' : '',
      ]"
      @delete="syncModel"
    >
      <template #default>
        <!-- 头像 -->
        <div v-if="type === 'avatar' && !hideOriginUpload" class="vuf-avatar-add">
          <van-icon name="photograph" />
          <span>上传头像</span>
        </div>
        <!-- 身份证：人像面 / 国徽面 -->
        <div
          v-else-if="type === 'idcard' && !hideOriginUpload"
          class="vuf-idcard"
          :class="[
            variant === 'front' ? 'vuf-idcard--front' : 'vuf-idcard--back',
            idcardCompact ? 'is-compact' : '',
          ]"
          @click.stop="onIdcardClick"
        >
          <div v-if="variant === 'front'" class="vuf-idcard-photo">
            <van-icon name="manager" />
          </div>
          <div v-else class="vuf-idcard-emblem">
            <van-icon name="flag-o" />
          </div>
          <div class="vuf-idcard-lines">
            <template v-if="variant === 'front'">
              <span class="vuf-idcard-line" style="width: 42%" />
              <span class="vuf-idcard-line" style="width: 58%" />
              <span class="vuf-idcard-line" style="width: 74%" />
              <span class="vuf-idcard-line" style="width: 90%" />
              <span class="vuf-idcard-line" style="width: 66%" />
            </template>
            <template v-else>
              <span class="vuf-idcard-line" style="width: 54%" />
              <span class="vuf-idcard-line" style="width: 70%" />
              <span class="vuf-idcard-line" style="width: 48%" />
            </template>
          </div>
          <span class="vuf-idcard-label">
            {{ variant === 'front' ? '身份证人像面' : '身份证国徽面' }}
          </span>
        </div>
        <!-- 通用图片 -->
        <div v-else-if="!hideOriginUpload" class="vuf-image-add">
          <van-icon name="plus" />
          <span>上传图片</span>
        </div>
      </template>
    </van-uploader>

    <!-- 发票 / 票据图片卡片：自定义 UI（网格 + 添加按钮常驻） -->
    <div v-else-if="type === 'invoice'" class="vuf-invoice">
      <div class="vuf-invoice-grid" :class="{ 'is-single': !multiple }">
        <!-- 已上传图片单元格 -->
        <div
          v-for="(it, i) in fileList"
          :key="i"
          class="vuf-invoice-cell"
          :class="{ 'is-single': !multiple }"
        >
          <img :src="it.url" alt="" class="vuf-invoice-cell-img" @click="previewImage(it)" />
          <!-- 右上角删除 -->
          <div v-if="!disabled && !readonly" class="vuf-invoice-del" @click.stop="removeItem(it)">
            <van-icon name="cross" />
          </div>
          <!-- 上传中 / 失败遮罩 -->
          <div v-if="it.status === 'uploading'" class="vuf-invoice-cell-mask">
            <van-loading size="18" />
          </div>
          <div v-else-if="it.status === 'failed'" class="vuf-invoice-cell-mask is-failed">
            <van-icon name="warning-o" />
          </div>
        </div>
        <!-- 添加按钮：未满上限时始终显示，达到上限后隐藏；hideUploadWhenField 时隐藏，仅保留 van-field 相机入口 -->
        <div
          v-if="fileList.length < effectiveMaxCount && !disabled && !readonly && !hideOriginUpload"
          class="vuf-invoice-cell vuf-invoice-add"
          :class="{ 'is-large': invoiceAddLarge }"
          @click="pickDocument"
        >
          <!-- 右上角剩余可上传张数角标 -->
          <span v-if="showRemainingHint" class="vuf-add-badge">剩{{ remainingCount }}</span>
          <van-icon name="photograph" class="vuf-invoice-add-icon" />
          <span v-if="invoiceAddLarge" class="vuf-invoice-add-hint">{{ placeholder }}</span>
        </div>
      </div>
      <input
        ref="docInput"
        type="file"
        hidden
        :accept="realAccept"
        :multiple="multiple"
        @change="onFileChange"
      />
    </div>

    <!-- 证件 / 附件：自定义 UI -->
    <div v-else class="vuf-doc">
      <div
        v-if="!hideOriginUpload"
        class="vuf-doc-drop"
        :class="{ 'is-disabled': disabled || readonly }"
        @click="pickDocument"
      >
        <!-- 右上角剩余可上传个数角标 -->
        <span v-if="showRemainingHint && remainingCount > 0" class="vuf-add-badge"
          >剩{{ remainingCount }}</span
        >
        <van-icon name="upgrade" class="vuf-doc-drop-icon" />
        <span>{{ placeholder }}</span>
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

    <!-- OCR 识别结果回填提示：仅当配置 ocrField 且上传成功返回对应值时显示 -->
    <div v-if="ocrField && ocrText" class="vuf-ocr">
      <van-icon name="certificate" class="vuf-ocr__icon" />
      <span class="vuf-ocr__label">{{ ocrLabel }}：</span>
      <span class="vuf-ocr__value">{{ ocrText }}</span>
    </div>

    <!-- 表单回填 van-field：默认不显示，开启 field 后在原始 UI 下方渲染一行，
         与 van-form 内其他 van-field 保持统一 UI；右侧相机图标复用同一套上传逻辑回填数据 -->
    <van-field
      v-if="field"
      v-bind="fieldWrapperProps"
      :model-value="fieldFormValue"
      :class="['vuf-form-field', { 'vuf-form-field--show-border': border }]"
    >
      <template #input>
        <span class="vuf-form-field__value">{{ fieldDisplayText }}</span>
      </template>
      <template #button>
        <div class="vuf-form-field__actions">
          <!-- invoice/document 类型的每张卡片已自带「上传中」遮罩(逐张显示 loading)，
               故字段按钮位不再叠加转圈，避免重复的加载态 -->
          <van-loading
            v-if="fieldUploading && !['invoice', 'document'].includes(type)"
            size="20"
            color="var(--van-primary-color)"
          />
          <van-icon
            v-else
            name="photograph"
            size="22"
            :class="[
              'vuf-form-field__camera',
              {
                'is-disabled':
                  disabled ||
                  readonly ||
                  // 发票/证件类：仅当已达上限时禁用字段相机（卡片本身已逐张显示 loading，上传中不应拦截继续添加）
                  (['invoice', 'document'].includes(type) && fileList.length >= effectiveMaxCount),
              },
            ]"
            @click="triggerUpload"
          />
        </div>
      </template>
    </van-field>

    <!-- 身份证上传示例引导弹窗（idcard + show-sample） -->
    <van-dialog
      v-model:show="sampleVisible"
      title="身份证上传示例"
      :show-confirm-button="false"
      :show-cancel-button="false"
      class-name="vuf-sample-dialog"
    >
      <div class="vuf-sample-body" :class="`vuf-sample-body--${variant}`">
        <div class="vuf-sample-img-wrap">
          <div class="vuf-sample-card">
            <div class="vuf-sample-photo">
              <van-icon :name="variant === 'back' ? 'flag-o' : 'manager'" />
            </div>
            <div class="vuf-sample-lines">
              <span class="vuf-sample-line" style="width: 60%" />
              <span class="vuf-sample-line" style="width: 80%" />
              <span class="vuf-sample-line" style="width: 45%" />
              <span class="vuf-sample-line" style="width: 70%" />
            </div>
          </div>
          <span class="vuf-sample-corner vuf-sample-corner--tl" />
          <span class="vuf-sample-corner vuf-sample-corner--tr" />
          <span class="vuf-sample-corner vuf-sample-corner--bl" />
          <span class="vuf-sample-corner vuf-sample-corner--br" />
        </div>
        <p class="vuf-sample-label">
          上传{{ variant === 'back' ? '国徽面（背面）' : '人像面（正面）' }}
        </p>
        <p class="vuf-sample-desc">
          请将手机横向拍摄，保证照片清晰无反光。上传完成后请核对识别信息。
        </p>
        <div class="vuf-sample-warning">
          重要提示：请确保上传资料信息真实有效，如果您提供虚假信息或使用伪造证件，根据《中华人民共和国保险法》保险人有权解除合同且不承担赔偿责任。
        </div>
      </div>

      <template #footer>
        <div class="vuf-sample-footer">
          <button class="vuf-sample-btn vuf-sample-btn--secondary" @click="onSampleClose">
            我知道了
          </button>
          <button class="vuf-sample-btn vuf-sample-btn--primary" @click="onSampleConfirm">
            上传照片
          </button>
        </div>
      </template>
    </van-dialog>
  </div>
</template>

<style scoped>
.vant-upload-field {
  width: 100%;
}
.vuf-label {
  font-size: 14px;
  color: var(--app-text);
  margin-bottom: 10px;
}
.vuf-req {
  color: #ee0a24;
  margin-right: 2px;
}

/* ===== 表单回填 van-field（原始 UI 下方，默认不显示） ===== */
.vuf-form-field {
  /* margin-top: 10px; */
}
/* 确保 body 层也不会被子内容撑开（与 VantCheckinField .vcf-field 对齐） */
.vuf-form-field :deep(.van-field__body) {
  align-items: center;
  min-width: 0;
  overflow: hidden;
}
/* van-cell 作为父级最后一个子元素时底边框会被隐藏（.van-cell:last-child:after{display:none}），
   证件/图片/发票等无示例弹窗的类型里 van-field 恰为末位节点，故 border=true 时强制显示底边框 */
.vuf-form-field--show-border::after {
  display: block !important;
}
/* 值文本区域：单行、可横向滚动查看（参考 VantCheckinField 长地址的处理），
   用 flex:1 + min-width:0 约束在字段内，避免被超长内容（如 data URI / 文件名）撑变形。
   隐藏滚动条但保留触摸/拖动横滑能力，保持 UI 清爽。 */
.vuf-form-field__value {
  display: block;
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--app-text);
  white-space: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}
.vuf-form-field__value::-webkit-scrollbar {
  display: none;
}
/* 右侧相机图标按钮区 */
.vuf-form-field__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.vuf-form-field__camera {
  color: var(--van-primary-color);
  cursor: pointer;
  padding: 4px;
}
.vuf-form-field__camera.is-disabled {
  color: var(--van-gray-5);
  cursor: not-allowed;
}

/* ===== OCR 识别结果回填提示 ===== */
.vuf-ocr {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  padding: 6px 10px;
  box-sizing: border-box;
  background: color-mix(in srgb, var(--van-primary-color) 6%, #fff);
  border: 1px solid color-mix(in srgb, var(--van-primary-color) 18%, #fff);
  border-radius: 8px;
  font-size: 12px;
  color: var(--app-text);
}
.vuf-ocr__icon {
  color: var(--van-primary-color);
  font-size: 14px;
  flex-shrink: 0;
}
.vuf-ocr__label {
  color: var(--app-text-2);
  flex-shrink: 0;
}
.vuf-ocr__value {
  color: var(--van-primary-color);
  font-weight: 600;
  word-break: break-all;
}

/* ===== 缩略图右上角删除按钮（统一以 invoice 类型样式为准） ===== */
/* 图片 / 头像 / 身份证：van-uploader 自带删除按钮覆盖为与 invoice 一致的暗色方块；
   并重置 Vant 默认的绝对定位 + scale 缩放，让 cross 图标在背景内居中且大小与 invoice 一致 */
.vuf-uploader :deep(.van-uploader__preview-delete) {
  width: 20px;
  height: 20px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 0 0 0 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.vuf-uploader :deep(.van-uploader__preview-delete-icon) {
  position: static;
  top: auto;
  right: auto;
  transform: none;
  width: auto;
  height: auto;
  font-size: 14px;
  color: #fff;
}

/* ===== 头像圆形 ===== */
.vuf-uploader.is-round :deep(.van-uploader__preview-image),
.vuf-uploader.is-round :deep(.van-uploader__upload) {
  border-radius: 50%;
  overflow: hidden;
}

/* 非圆形类型（image / idcard）：PICC 主题把预览图圆角设为 --van-uploader-border-radius（12px），
   而方形删除按钮落在预览盒锐角顶角，其右上角会超出圆角「未被隐藏」。
   让预览盒与图片同圆角并对子元素 overflow:hidden，即可把删除按钮超出圆角的部分裁掉
   （与 invoice 单元格一致）。注意：圆形头像不能加 overflow:hidden，否则会把圆形裁成 12px 圆角方块。 */
.vuf-uploader:not(.is-round) :deep(.van-uploader__preview) {
  border-radius: var(--van-uploader-border-radius);
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
  color: var(--app-text-3);
  background: var(--app-bg);
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
  color: var(--app-text-3);
  background: var(--app-bg);
  border: 1px dashed #dcdee0;
  border-radius: 8px;
}
.vuf-image-add .van-icon {
  font-size: 22px;
}
/* 添加按钮右上角「剩余可上传个数」角标：右上贴角、左下带圆润弧度的脚标 */
.vuf-add-badge {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 1;
  height: 18px;
  padding: 0 6px;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  line-height: 1;
  color: #fff;
  white-space: nowrap;
  background: var(--van-primary-color);
  /* 右上贴合按钮直角；左下大圆角形成圆润的「脚」，右下轻微收弧过渡 */
  border-radius: 0 0 4px 12px;
}

/* ===== 身份证卡片 =====
   统一设计语言（大小尺寸一致）：左侧彩色图标块（人像面=头像块 / 国徽面=圆形国徽）
   + 右侧模拟字段线 + 底部类型文字，仅在尺寸 / 字段丰富度上区分。
   - 默认全宽：占满整行、高 150px，图标块更大、字段线更多，直观呈现身份证版面
   - compact：150×95 固定小尺寸，恢复原简洁版（图标块 + 3 条线 + 底部文字） */
.vuf-idcard {
  position: relative;
  width: 100%;
  height: 150px;
  border-radius: 8px;
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  overflow: hidden;
  border: 1px solid #adc6ff;
  background: linear-gradient(135deg, #eaf2ff, #dbe9ff);
  color: #5a6b8c;
}
.vuf-idcard--back {
  border-color: #ffd591;
  background: linear-gradient(135deg, #fff8e6, #fff0c2);
  color: #9c6b1f;
}
/* 左侧图标块（大小尺寸同款配色：蓝 / 橙） */
.vuf-idcard-photo,
.vuf-idcard-emblem {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}
.vuf-idcard-photo {
  width: 70px;
  height: 88px;
  border-radius: 6px;
  background: linear-gradient(135deg, #91caff, #4096ff);
  font-size: 34px;
}
.vuf-idcard-emblem {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff9c6e, #fa8c16);
  font-size: 28px;
}
/* 右侧模拟字段线 */
.vuf-idcard-lines {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.vuf-idcard-line {
  display: block;
  height: 7px;
  border-radius: 4px;
  background: rgba(64, 150, 255, 0.22);
}
.vuf-idcard--back .vuf-idcard-line {
  background: rgba(250, 140, 22, 0.22);
}
/* 底部类型文字（大小尺寸一致，均在卡片右下角） */
.vuf-idcard-label {
  position: absolute;
  right: 12px;
  bottom: 8px;
  font-size: 11px;
  color: #6b7da3;
}
.vuf-idcard--back .vuf-idcard-label {
  color: #c08a3e;
}

/* 手动配置的小宽度 UI（compact）：150×95 固定尺寸，恢复原简洁版 */
.vuf-idcard.is-compact {
  width: 150px;
  height: 95px;
  border-radius: 6px;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #adc6ff;
  background: linear-gradient(135deg, #d6e4ff, #e6f0ff 55%, #d0e1ff);
  color: rgba(0, 0, 0, 0.45);
}
.vuf-idcard.is-compact.vuf-idcard--back {
  border-color: #ffd591;
  background: linear-gradient(135deg, #fffbe6, #fff1b8 55%, #ffe7ba);
}
.vuf-idcard.is-compact .vuf-idcard-photo {
  width: 34px;
  height: 42px;
  min-width: 34px;
  border-radius: 3px;
  background: linear-gradient(135deg, #91caff, #4096ff);
  font-size: 20px;
}
.vuf-idcard.is-compact .vuf-idcard-emblem {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff9c6e, #fa8c16);
  font-size: 16px;
}
.vuf-idcard.is-compact .vuf-idcard-lines {
  gap: 4px;
}
/* 小尺寸只显示前 3 行，保持原版简洁观感 */
.vuf-idcard.is-compact .vuf-idcard-line:nth-child(n + 4) {
  display: none;
}
/* 小尺寸：把「哪一面」标签作为卡片右下角角标（与大尺寸一致，避免被裁切到卡片外） */
.vuf-idcard.is-compact .vuf-idcard-label {
  right: 8px;
  left: auto;
  bottom: 8px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.72);
  text-align: center;
  color: #5a6b8c;
}
.vuf-idcard.is-compact.vuf-idcard--back .vuf-idcard-label {
  color: #9c6b1f;
}
.vuf-uploader--idcard {
  /* padding-bottom: 16px; */
}
/* hide-upload-when-field：仅保留内置 van-field 相机入口，整体收起原始上传区（含其固定尺寸占位空格），
   组件仍挂载，chooseFile() 仍可程序化唤起隐藏的 file input 选图 */
.vuf-uploader.is-origin-hidden {
  display: none !important;
}
/* show-sample：van-uploader 的透明 input 覆盖在卡片上方会直接唤起选图，
   关掉它的 pointer-events 让点击落到卡片占位（@click.stop 弹示例），
   确认后仍以 uploadRef.chooseFile() 程序化唤起选图（不受影响） */
.vuf-uploader.has-sample :deep(.van-uploader__input) {
  pointer-events: none;
}
/* 默认全宽模式：预览图与上传占位占满整行（compact 模式不受影响）
   注意：① van-uploader 根元素默认 inline-block（宽度由内容决定），需先让根本身占满整行；
        ② van-uploader 会把 preview-size 作为内联样式写到 upload / preview-image 上，
           优先级高于普通 :deep 规则，故深层尺寸规则用 !important 强制覆盖 */
.vuf-uploader--idcard:not(.idcard-compact) {
  display: block;
  width: 100%;
}
.vuf-uploader--idcard:not(.idcard-compact) :deep(.van-uploader__wrapper) {
  display: block;
  width: 100%;
}
.vuf-uploader--idcard:not(.idcard-compact) :deep(.van-uploader__preview) {
  width: 100%;
  margin: 0 0 8px;
}
.vuf-uploader--idcard:not(.idcard-compact) :deep(.van-uploader__upload) {
  width: 100% !important;
  height: 150px !important;
  margin: 0;
}
.vuf-uploader--idcard:not(.idcard-compact) :deep(.van-uploader__preview-image) {
  width: 100% !important;
  height: 150px !important;
}
.vuf-uploader--idcard:not(.idcard-compact) :deep(.van-uploader__preview-image img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* compact 小宽度模式：预览图 / 上传占位均强制为 150×95 固定尺寸，
   并清除 van-uploader 默认的 8px 右边距，避免上传后宽度变化导致同行换行 / 抖动
   （全宽模式已在上文处理；compact 模式下若不显式覆盖，默认 margin 会让预览比占位宽 8px，
   使 .idcard-row 并排的两个卡片在上传后溢出换行） */
.vuf-uploader--idcard.idcard-compact {
  display: inline-block;
}
.vuf-uploader--idcard.idcard-compact :deep(.van-uploader__wrapper) {
  display: block;
  width: 150px;
}
.vuf-uploader--idcard.idcard-compact :deep(.van-uploader__upload),
.vuf-uploader--idcard.idcard-compact :deep(.van-uploader__input-wrapper) {
  width: 150px;
  height: 95px;
  margin: 0;
}
.vuf-uploader--idcard.idcard-compact :deep(.van-uploader__preview) {
  width: 150px;
  height: 95px;
  margin: 0;
}
.vuf-uploader--idcard.idcard-compact :deep(.van-uploader__preview-image) {
  width: 150px !important;
  height: 95px !important;
}
.vuf-uploader--idcard.idcard-compact :deep(.van-uploader__preview-image img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* ===== 发票 / 票据图片卡片（网格） ===== */
.vuf-invoice {
  width: 100%;
}
.vuf-invoice-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
/* 单元格尺寸：多张为正方形缩略图，单张占满整行 */
.vuf-invoice-grid:not(.is-single) .vuf-invoice-cell {
  width: calc((100% - 16px) / 3);
  aspect-ratio: 1 / 1;
}
/* 单张：单元格为大卡片，占满整行，固定高度与上传按钮一致避免页面伸缩 */
.vuf-invoice-grid.is-single .vuf-invoice-cell {
  width: 100%;
  min-height: 150px;
}
.vuf-invoice-cell {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  background: var(--app-bg);
  box-sizing: border-box;
}
.vuf-invoice-cell-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  cursor: pointer;
}
/* 单张已上传图：固定 150px 高，与上传按钮等高，不撑高页面 */
.vuf-invoice-grid.is-single .vuf-invoice-cell-img {
  height: 150px;
  object-fit: cover;
}
/* 右上角删除按钮 */
.vuf-invoice-del {
  position: absolute;
  top: 0;
  right: 0;
  width: 20px;
  height: 20px;
  border-bottom-left-radius: 8px;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.vuf-invoice-del .van-icon {
  color: #fff;
  font-size: 14px;
}
/* 上传中 / 失败遮罩 */
.vuf-invoice-cell-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.6);
}
.vuf-invoice-cell-mask.is-failed {
  background: rgba(255, 255, 255, 0.85);
  color: #ee0a24;
}
/* 添加按钮（相机卡片，未满时显示） */
.vuf-invoice-add {
  position: relative;
  border: 1px dashed #dcdee0;
  background: #fafbfc;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: border-color 0.2s;
}
.vuf-invoice-add:hover {
  border-color: #1989fa;
}
/* 大卡片（单张 / 多张空态）：与单张一致，占满宽度，高度由内容/最小高度决定 */
.vuf-invoice-grid .vuf-invoice-add.is-large {
  width: 100%;
  padding: 36px 16px 24px;
  min-height: 150px;
  aspect-ratio: auto;
}
.vuf-invoice-add.is-large .vuf-invoice-add-icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #e8eaed;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--app-text-3);
  font-size: 26px;
}
.vuf-invoice-add-hint {
  font-size: 13px;
  color: var(--app-text-3);
}
/* 网格小方格（多张已有图）：与缩略图同宽，仅小相机图标 */
.vuf-invoice-add:not(.is-large) {
  width: calc((100% - 16px) / 3);
  aspect-ratio: 1 / 1;
}
.vuf-invoice-add:not(.is-large) .vuf-invoice-add-icon {
  font-size: 26px;
  color: var(--app-text-3);
}
/* label 右侧 tag 标签 */
.vuf-invoice-tag {
  display: inline-block;
  font-size: 11px;
  line-height: 18px;
  padding: 0 6px;
  border-radius: 4px;
  background: #f2f3f5;
  color: var(--app-text-3);
  margin-left: 6px;
}

/* ===== 证件自定义 UI ===== */
.vuf-doc-drop {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 18px;
  border: 1px dashed #dcdee0;
  border-radius: 10px;
  background: #fafbfc;
  color: var(--app-text-2);
  font-size: 14px;
  cursor: pointer;
  overflow: hidden;
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
  background: var(--app-surface);
  border: 1px solid var(--app-border);
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
  color: var(--app-text);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.vuf-doc-meta {
  font-size: 11px;
  color: var(--app-text-3);
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
  width: 20px;
  height: 20px;
  border-radius: 0 0 0 8px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
}
.vuf-doc-del:active {
  background: rgba(0, 0, 0, 0.8);
}

/* ===== 身份证上传示例引导弹窗 ===== */
.vuf-sample-dialog :deep(.van-dialog__header) {
  font-size: 17px;
  font-weight: 600;
  color: var(--van-text-color);
  padding-top: 8px;
}
.vuf-sample-body {
  padding: 4px 20px 16px;
}
.vuf-sample-img-wrap {
  position: relative;
  width: 220px;
  margin: 0 auto 8px;
}
.vuf-sample-card {
  width: 220px;
  height: 138px;
  border-radius: 8px;
  padding: 14px 16px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 14px;
  background: linear-gradient(135deg, #d6e4ff 0%, #e6f0ff 55%, #d0e1ff 100%);
  border: 1px solid #adc6ff;
}
.vuf-sample-photo {
  width: 48px;
  height: 60px;
  min-width: 48px;
  border-radius: 4px;
  background: linear-gradient(135deg, #91caff, #4096ff);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.9);
  font-size: 28px;
}
.vuf-sample-lines {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.vuf-sample-line {
  display: block;
  height: 6px;
  border-radius: 3px;
  background: rgba(64, 150, 255, 0.28);
}
.vuf-sample-corner {
  position: absolute;
  width: 18px;
  height: 18px;
  border-color: var(--van-danger-color);
  border-style: solid;
  border-width: 0;
}
.vuf-sample-corner--tl {
  top: 6px;
  left: 6px;
  border-top-width: 3px;
  border-left-width: 3px;
  border-top-left-radius: 2px;
}
.vuf-sample-corner--tr {
  top: 6px;
  right: 6px;
  border-top-width: 3px;
  border-right-width: 3px;
  border-top-right-radius: 2px;
}
.vuf-sample-corner--bl {
  bottom: 6px;
  left: 6px;
  border-bottom-width: 3px;
  border-left-width: 3px;
  border-bottom-left-radius: 2px;
}
.vuf-sample-corner--br {
  bottom: 6px;
  right: 6px;
  border-bottom-width: 3px;
  border-right-width: 3px;
  border-bottom-right-radius: 2px;
}
.vuf-sample-label {
  text-align: center;
  font-size: 13px;
  color: var(--van-text-color-2);
  margin: 6px 0 10px;
}
.vuf-sample-desc {
  font-size: 13px;
  color: var(--van-text-color-2);
  line-height: 1.6;
  margin: 0 0 12px;
  text-align: justify;
}
.vuf-sample-warning {
  background: color-mix(in srgb, var(--van-danger-color) 7%, #fff);
  border: 1px solid color-mix(in srgb, var(--van-danger-color) 18%, #fff);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 12px;
  color: var(--van-danger-color);
  line-height: 1.65;
}
.vuf-sample-footer {
  display: flex;
  gap: 12px;
  padding: 12px 20px 20px;
}
.vuf-sample-btn {
  flex: 1;
  height: 48px;
  border-radius: 9999px;
  font-size: 15px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s;
}
.vuf-sample-btn:active {
  opacity: 0.8;
}
.vuf-sample-btn--secondary {
  background: var(--van-gray-2);
  color: var(--van-text-color);
}
.vuf-sample-btn--primary {
  background: var(--van-primary-color);
  color: #fff;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--van-primary-color) 30%, transparent);
}

/* 国徽面（背面）：示例提示引导图与按钮统一为橙黄色调 */
.vuf-sample-body--back .vuf-sample-card {
  background: linear-gradient(135deg, #ffe7c2 0%, #fff3e0 55%, #ffd9a3 100%);
  border-color: #ffc069;
}
.vuf-sample-body--back .vuf-sample-photo {
  background: linear-gradient(135deg, #ffa940, #fa8c16);
}
.vuf-sample-body--back .vuf-sample-line {
  background: color-mix(in srgb, #fa8c16 26%, transparent);
}
.vuf-sample-body--back .vuf-sample-corner {
  border-color: #fa8c16;
}
.vuf-sample-body--back .vuf-sample-btn--primary {
  background: #fa8c16;
  box-shadow: 0 4px 12px color-mix(in srgb, #fa8c16 30%, transparent);
}
</style>
