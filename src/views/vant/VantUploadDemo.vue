<script setup lang="ts">
/**
 * VantUpload 示例：头像 / 身份证人像面 / 身份证国徽面 / 证件上传（自定义 UI）
 * 示例按 ①-⑳ 顺序排列，下方 script 与 template 一一对应，方便快速复制单个示例。
 */
import { ref, reactive, computed } from 'vue'
import VantUpload from '@/components/VantUpload.vue'
import {
  uploadDemoFile,
  uploadDemoFileAlt,
  type DemoUploadParams,
  uploadDemoIdCard,
  mockDemoIdCardOcr,
} from '@/api'

// ===================== 公共上传函数（各示例共用，无需在每个示例内重复）=====================
// 模拟上传接口：延迟后返回本地预览 URL（真实项目替换为 :upload="apiUpload"）
function mockUpload(file: File): Promise<{ url: string }> {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ url: URL.createObjectURL(file) }), 800)
  })
}

/** File → base64 data URI */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve((e.target?.result as string) || '')
    reader.onerror = () => reject(new Error('读取失败'))
    reader.readAsDataURL(file)
  })
}

// 其余示例：统一调用 demo-upload.ts 的 uploadDemoFile，
// 由 mock 把文件写入 src/assets/demo-upload 并返回 /demo-upload/xxx 预览地址
async function diskUpload(
  file: File,
  type: DemoUploadParams['type'] = 'file',
): Promise<{ url: string; fileName: string; base64: string }> {
  const base64 = await fileToBase64(file)
  return uploadDemoFile({ fileName: file.name || 'file', base64, type })
}

// 各场景绑定具体 type（多个示例共用，集中定义）
const uploadIdFront = (file: File) => diskUpload(file, 'idcard')
const uploadIdBack = (file: File) => diskUpload(file, 'idcard')
const uploadDoc = (file: File) => diskUpload(file, 'file')
const uploadImg = (file: File) => diskUpload(file, 'image')

// 异名后端：请求字段名按后端要求定制（fileData / name），
// 响应返回 imgUrl / fileId，由组件 fieldMap 映射到 url / value
async function uploadAlt(file: File): Promise<Record<string, any>> {
  const base64 = await fileToBase64(file)
  return uploadDemoFileAlt({ name: file.name || 'file', fileData: base64 })
}
// 其它文件类型：通过 diskUpload 的 kind 路由到不同的 mock 落盘接口
const uploadExcelFile = (file: File) => diskUpload(file, 'excel')
const uploadVideo = (file: File) => diskUpload(file, 'file')
const uploadAny = (file: File) => diskUpload(file, 'file')

// 嵌套响应：后端返回 { code, data: { result: { imgUrl, fileId, fileName } } }，
// 通过 responsePath="data.result" 定位结果对象，再用 fieldMap 适配字段名
async function uploadNested(file: File): Promise<Record<string, any>> {
  const base64 = await fileToBase64(file)
  const res = await uploadDemoFileAlt({ name: file.name || 'file', fileData: base64 })
  return { code: 200, data: { result: res } }
}

// ===================== 统一开关 =====================
// 是否对所有示例（②-⑰）开启 van-field 表单回填效果（默认关闭）
const fieldOn = ref(false)
// field 开启时，是否隐藏各示例原始上传/添加按钮（仅保留 van-field 相机入口）。默认关闭（保留原按钮）
const hideUploadWhenFieldOn = ref(false)

// ===================== ① change 事件回显（操作实时记录）=====================
// 累加为可滚动的实时操作日志（最新在上，带时间戳，可清空）
const log = ref<string[]>([])
function onChange(type: string, url: string) {
  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  const msg = url ? url.slice(0, 40) + '…' : '（已移除）'
  log.value = [`[${time}] ${type}：${msg}`, ...log.value].slice(0, 50)
}
function clearLog() {
  log.value = []
}

// ===================== ② 头像上传（圆形）=====================
const avatar = ref('')

// ===================== ③ 身份证正反面（默认全宽自适应）=====================
// 默认全宽示例：独立的正反面值（与 compact 示例解耦）
const idFrontFull = ref('')
const idBackFull = ref('')

// ===================== ④ 身份证正反面（compact 小宽度）=====================
// compact 小宽度示例：独立的人像面值（与同行示例解耦）
const idFrontCompact = ref('')
const idBack = ref('')

// ===================== ⑤ 身份证（带上传示例引导弹窗 · show-sample）=====================
// 身份证 + 上传示例弹窗（show-sample）独立值：人像面 / 国徽面各自独立
const idSample = ref('')
const idSampleBack = ref('')

// ===================== ⑥ 发票 / 票据图片（卡片 UI · 单张）=====================
const invoiceSingle = ref('')

// ===================== ⑦ 发票 / 票据图片（卡片 UI · 多张）=====================
const invoiceMulti = ref<string[]>([])

// ===================== ⑧ 证件上传（自定义 UI · 单选）=====================
const certSingle = ref('')

// ===================== ⑨ 证件上传（自定义 UI · 多选）=====================
const certMulti = ref<string[]>([])

// ===================== ⑩ 多图片上传（多选）=====================
const images = ref<string[]>([])

// ===================== ⑪ 异名后端字段映射（fieldMap）=====================
// 异名后端回写值（取后端 fileId）
const altValue = ref('')

// ===================== ⑫ Excel / 表格上传 =====================
const excelValue = ref('')

// ===================== ⑬ 视频上传 =====================
const videoValue = ref('')

// ===================== ⑭ 全类型文件（压缩包 / Word / 任意）=====================
const anyValue = ref('')

// ===================== ⑮ 嵌套响应字段路径（responsePath）=====================
// 嵌套响应（responsePath）回写值
const nestedValue = ref('')

// ===================== ⑯ success 事件（回写值 + 完整响应 + 逐文件成功）=====================
const successValue = ref<string[]>([])
const fullResp = ref<Record<string, any> | null | undefined>(null)
const otherProcess = ref('')
const successLog = ref('')
// success 事件：每次上传成功时触发（每文件一次），回调 (value, item, result?)。
// 用第三参 result 拿完整后端响应做其它处理（OCR / 审核 / 指纹记录等），
// 同时用 value / item 做逐文件成功回显，组件回写值仍正常生效。
function onSuccess(
  value: string,
  item: Record<string, any>,
  res: Record<string, any> | null | undefined,
) {
  fullResp.value = res
  const name = (res?.fileName as string) || (item?.name as string) || 'file'
  const baseLen = typeof res?.base64 === 'string' ? res.base64.length : 0
  otherProcess.value = `回写值=${value ? value.slice(0, 30) + '…' : '（空）'}；已对完整响应做其它处理：fileName=${name}、base64 长度=${baseLen}`
  successLog.value = `成功回写值=${value ? value.slice(0, 40) + '…' : '（空）'}，名称=${item?.name || ''}`
}

// ===================== ⑰ 超限自动压缩（compress-before-upload · 默认关闭）=====================
// 超限压缩示例：独立回写值（maxSize 设小以便演示压缩）
const compressValue = ref('')

// ===================== ⑱ 表单内 van-field 回填提交（field · 默认关闭）=====================
// 表单内 van-field 回填提交：独立回写值，配合 van-form 提交
const formFieldValue = ref('')
const formSubmitLog = ref('')
function onSubmit(values: Record<string, any>) {
  formSubmitLog.value = JSON.stringify(values, null, 2)
}

// ===================== ⑲ 身份证 OCR 识别回填（控件 field 展示证件号 / 签发机关）=====================
// 身份证 OCR 识别回填：调用合并接口（按 side 返回 url + 识别字段），
// 由组件 ocrField 提取对应字段回填；@success 透传完整响应供其它处理
async function uploadIdCardOcr(file: File, side: 'front' | 'back') {
  const base64 = await fileToBase64(file)
  return uploadDemoIdCard({ fileName: file.name || 'idcard', base64, side })
}
const uploadIdCardFrontOcr = (file: File) => uploadIdCardOcr(file, 'front')
const uploadIdCardBackOcr = (file: File) => uploadIdCardOcr(file, 'back')
// 正反面各自独立的图片回写值（与场景③解耦，避免共用 ref 互相覆盖）
const idFrontOcrImg = ref('')
const idBackOcrImg = ref('')
// OCR 识别文本回填值（v-model:ocr）
const idFrontOcrText = ref('')
const idBackOcrText = ref('')
// 完整后端响应（@success 透传），用于演示「获取上传后的全部返回数据做其他处理」
const ocrFullResp = ref<Record<string, any> | null>(null)
// OCR 识别结果回填到 Vant4 表单控件（可读写，便于人工核对 / 修正后提交）
const ocrForm = reactive({
  certNo: '',
  name: '',
  gender: '',
  nation: '',
  birth: '',
  address: '',
  issueOrg: '',
  validPeriod: '',
})
const ocrFormSubmitLog = ref('')
// 兼容「完整响应（code/data/message）」与「拦截器直接返回 inner data」两种形态
const ocrResultData = computed<Record<string, any> | null>(() => {
  const r = ocrFullResp.value
  if (!r) return null
  return (r as any).data ?? r
})
function onOcrSuccess(
  _value: string,
  _item: Record<string, any>,
  res?: Record<string, any> | null,
) {
  ocrFullResp.value = res ?? null
  // 上传 + OCR 一步到位：从完整响应中取出识别数据，回填下方 Vant4 表单
  const data = res && (res as any).data ? (res as any).data : res
  if (data && typeof data === 'object') Object.assign(ocrForm, data)
}
function onOcrFormSubmit(values: Record<string, any>) {
  ocrFormSubmitLog.value = JSON.stringify(values, null, 2)
}
function resetOcrForm() {
  Object.assign(ocrForm, {
    certNo: '',
    name: '',
    gender: '',
    nation: '',
    birth: '',
    address: '',
    issueOrg: '',
    validPeriod: '',
  })
  ocrFormSubmitLog.value = ''
}

// ===================== ⑳ 统一身份证模拟数据（mockDemoIdCardOcr）=====================
// 统一身份证模拟数据（前端安全，供单测 / 预填 / 离线演示，结构与后端一致）
const idCardMockFront = mockDemoIdCardOcr('front')
const idCardMockBack = mockDemoIdCardOcr('back')
</script>

<template>
  <div class="upload-demo">
    <van-nav-bar title="VantUpload 示例" left-text="返回" left-arrow @click-left="$router.back()" />

    <div class="field-toggle">
      <div class="field-toggle__info">
        <span class="field-toggle__title">van-field 表单回填效果</span>
        <span class="field-toggle__desc"
          >统一开关：开启后下方所有示例均在上传区下方额外显示一行 van-field
          表单行，与表单内其他字段保持统一 UI 并参与回填提交</span
        >
      </div>
      <van-switch v-model="fieldOn" class="field-toggle__switch" />
    </div>

    <div class="field-toggle">
      <div class="field-toggle__info">
        <span class="field-toggle__title">隐藏原添加按钮（field 开启时）</span>
        <span class="field-toggle__desc"
          >统一开关：开启后，上方「表单回填」生效的示例均隐藏各自原始上传/添加按钮（拖拽区、发票格子、图片框等），
          上传统一收口到 van-field 相机入口。需配合上方开关使用</span
        >
      </div>
      <van-switch v-model="hideUploadWhenFieldOn" class="field-toggle__switch" />
    </div>

    <!-- ① change 事件回显（操作实时记录）-->
    <div class="card">
      <div class="log-head">
        <div class="section-title">① change 事件回显（操作实时记录）</div>
        <van-button v-if="log.length" size="mini" plain type="primary" @click="clearLog"
          >清空</van-button
        >
      </div>
      <div class="log-box">
        <p v-for="(item, i) in log" :key="i" class="log-line">{{ item }}</p>
        <p v-if="!log.length" class="hint">（暂无操作，上传 / 删除任意示例即在此记录）</p>
      </div>
    </div>

    <!-- ② 头像上传（圆形）-->
    <div class="card">
      <div class="section-title">② 头像上传（圆形）</div>
      <VantUpload
        v-model="avatar"
        type="avatar"
        :field="fieldOn"
        :hide-upload-when-field="hideUploadWhenFieldOn"
        :label="fieldOn ? '头像' : ''"
        :upload="mockUpload"
        @change="onChange('头像', $event)"
      />
    </div>

    <!-- ③ 身份证正反面（默认全宽自适应）-->
    <div class="card">
      <div class="section-title">③ 身份证正反面（默认全宽自适应）</div>
      <p class="hint">
        <code>type="idcard"</code> 默认 UI <b>自适应屏幕宽度</b>（高约 150px、占满整行），人像面 /
        国徽面各自独立上传，直观呈现身份证版面（与 ③ / ④ 的 compact 小宽度对照）。
      </p>
      <VantUpload
        v-model="idFrontFull"
        type="idcard"
        variant="front"
        :field="fieldOn"
        :hide-upload-when-field="hideUploadWhenFieldOn"
        :label="fieldOn ? '身份证人像面' : ''"
        :upload="uploadIdFront"
        @change="onChange('人像面(全宽)', $event)"
      />
      <div class="idcard-gap" />
      <VantUpload
        v-model="idBackFull"
        type="idcard"
        variant="back"
        :field="fieldOn"
        :hide-upload-when-field="hideUploadWhenFieldOn"
        :label="fieldOn ? '身份证国徽面' : ''"
        :upload="uploadIdBack"
        @change="onChange('国徽面(全宽)', $event)"
      />
    </div>

    <!-- ④ 身份证正反面（compact 小宽度）-->
    <div class="card">
      <div class="section-title">④ 身份证正反面（compact 小宽度）</div>
      <p class="hint">
        手动配置 <code>compact</code> 回退为 <b>150×95 固定小宽度</b> UI（与 ②
        默认全宽对照，适合紧凑布局），人像面 / 国徽面各自独立上传。 上传成功后的<b
          >预览图与占位卡片严格保持同一 150×95 尺寸并清除 Vant 默认的 8px 右边距</b
        >， 因此正反面并排（<code>.idcard-row</code>）不会出现「上传后预览比占位宽 8px 导致同行换行
        / 抖动」的问题。
      </p>
      <div class="idcard-row">
        <VantUpload
          v-model="idFrontCompact"
          type="idcard"
          variant="front"
          compact
          :field="fieldOn"
          :hide-upload-when-field="hideUploadWhenFieldOn"
          :label="fieldOn ? '身份证人像面' : ''"
          :upload="uploadIdFront"
          @change="onChange('人像面(compact)', $event)"
        />
        <VantUpload
          v-model="idBack"
          type="idcard"
          variant="back"
          compact
          :field="fieldOn"
          :hide-upload-when-field="hideUploadWhenFieldOn"
          :label="fieldOn ? '身份证国徽面' : ''"
          :upload="uploadIdBack"
          @change="onChange('国徽面(compact)', $event)"
        />
      </div>
    </div>

    <!-- ⑤ 身份证（带上传示例引导弹窗 · show-sample）-->
    <div class="card">
      <div class="section-title">
        ⑤ 身份证（带上传示例引导弹窗 · show-sample · 人像面 / 国徽面）
      </div>
      <p class="hint">
        配置 <code>show-sample</code> 后，点击身份证卡片会先弹出<b>「身份证上传示例」引导弹窗</b>
        （展示标准样张 + 四角定位框 + 拍摄提示 + 合规声明），点「上传照片」才唤起选图；
        不传该配置则默认<b>直接选图、不弹示例</b>。<b>人像面 / 国徽面均适用</b>，弹窗内容随
        <code>variant</code> 自适应（样张图标与文案不同）。
      </p>

      <VantUpload
        v-model="idSample"
        type="idcard"
        variant="front"
        show-sample
        :field="fieldOn"
        :hide-upload-when-field="hideUploadWhenFieldOn"
        :label="fieldOn ? '身份证人像面' : ''"
        :upload="uploadIdFront"
        @change="onChange('人像面(带示例)', $event)"
      />
      <div class="idcard-gap" />
      <VantUpload
        v-model="idSampleBack"
        type="idcard"
        variant="back"
        show-sample
        :field="fieldOn"
        :hide-upload-when-field="hideUploadWhenFieldOn"
        :label="fieldOn ? '身份证国徽面' : ''"
        :upload="uploadIdBack"
        @change="onChange('国徽面(带示例)', $event)"
      />
    </div>

    <!-- ⑥ 发票 / 票据图片（卡片 UI · 单张）-->
    <div class="card">
      <div class="section-title">⑥ 发票 / 票据图片（卡片 UI · 单张）</div>
      <p class="hint">
        <code>type="invoice"</code>
        大虚线框居中相机图标，label 右侧显示类型标签，适合报销 / OCR 场景。
        上传后图片占据原卡片位置；<b>再次上传直接替换</b>原图；
        点击缩略图可<b>放大预览</b>，右上角可<b>删除</b>。
      </p>
      <VantUpload
        v-model="invoiceSingle"
        type="invoice"
        label="发票"
        invoice-tag="图片"
        placeholder="上传图片"
        :field="fieldOn"
        :hide-upload-when-field="hideUploadWhenFieldOn"
        :upload="uploadImg"
        @change="onChange('发票(单)', $event)"
      />
    </div>

    <!-- ⑦ 发票 / 票据图片（卡片 UI · 多张）-->
    <div class="card">
      <div class="section-title">⑦ 发票 / 票据图片（卡片 UI · 多张）</div>
      <p class="hint">
        <code>type="invoice"</code> + <code>multiple</code>，多张图片以 3 列网格展示，最多 9
        张。<b>添加按钮常驻</b>于末尾，达到上限后自动隐藏；
        每张缩略图右上角可删除，点击可放大预览（支持左右滑动）。
      </p>
      <VantUpload
        v-model="invoiceMulti"
        type="invoice"
        label="票据"
        invoice-tag="图片"
        placeholder="上传图片"
        multiple
        :max-count="9"
        :field="fieldOn"
        :hide-upload-when-field="hideUploadWhenFieldOn"
        :upload="uploadImg"
        @change="onChange('发票(多)', $event)"
      />
    </div>

    <!-- ⑧ 证件上传（自定义 UI · 单选）-->
    <div class="card">
      <div class="section-title">⑧ 证件上传（自定义 UI · 单选）</div>
      <p class="hint">支持图片 / PDF，自定义文件列表展示名称、大小与进度。</p>
      <VantUpload
        v-model="certSingle"
        type="document"
        placeholder="点击上传证件（支持图片 / PDF）"
        :field="fieldOn"
        :hide-upload-when-field="hideUploadWhenFieldOn"
        :label="fieldOn ? '证件' : ''"
        :upload="uploadDoc"
        @change="onChange('证件', $event)"
      />
    </div>

    <!-- ⑨ 证件上传（自定义 UI · 多选）-->
    <div class="card">
      <div class="section-title">⑨ 证件上传（自定义 UI · 多选）</div>
      <p class="hint">multiple 模式，最多 5 个。</p>
      <VantUpload
        v-model="certMulti"
        type="document"
        multiple
        :max-count="5"
        placeholder="点击上传证件（支持图片 / PDF，可多选）"
        :field="fieldOn"
        :hide-upload-when-field="hideUploadWhenFieldOn"
        :label="fieldOn ? '证件' : ''"
        :upload="uploadDoc"
        @change="onChange('证件(多)', $event)"
      />
    </div>

    <!-- ⑩ 多图片上传（多选）-->
    <div class="card">
      <div class="section-title">⑩ 多图片上传（多选）</div>
      <p class="hint">type="image" + multiple，最多 9 张，缩略图尺寸与占位保持一致。</p>
      <VantUpload
        v-model="images"
        type="image"
        multiple
        :field="fieldOn"
        :hide-upload-when-field="hideUploadWhenFieldOn"
        :label="fieldOn ? '图片' : ''"
        :upload="uploadImg"
        @change="onChange('多图片', $event)"
      />
    </div>

    <!-- ⑪ 异名后端字段映射（fieldMap）-->
    <div class="card">
      <div class="section-title">⑪ 异名后端字段映射（fieldMap）</div>
      <p class="hint">
        该场景后端请求字段为 <code>fileData / name</code>、响应为
        <code>imgUrl / fileId / fileName</code>， 与默认后端（<code>url</code>）完全不同。通过
        <code>:field-map</code> 将 <code>imgUrl→url</code>、<code>fileId→value</code>、<code
          >fileName→name</code
        >
        适配， 组件内部无需改动即可对接任意后端字段名。
      </p>
      <VantUpload
        v-model="altValue"
        type="image"
        :upload="uploadAlt"
        :field="fieldOn"
        :hide-upload-when-field="hideUploadWhenFieldOn"
        :label="fieldOn ? '异名后端' : ''"
        :field-map="{ url: 'imgUrl', value: 'fileId', name: 'fileName' }"
        @change="onChange('异名后端', $event)"
      />
      <p class="hint">回写 modelValue（取后端 fileId）：{{ altValue || '（暂无）' }}</p>
    </div>

    <!-- ⑫ Excel / 表格上传-->
    <div class="card">
      <div class="section-title">⑫ Excel / 表格上传</div>
      <p class="hint">
        <code>type="document"</code> + <code>accept=".xls,.xlsx"</code>，上传落盘到
        <code>excel</code> 路由（扩展名正确映射），可用于导入模板 / 数据报表。
      </p>
      <VantUpload
        v-model="excelValue"
        type="document"
        :accept="'.xls,.xlsx'"
        placeholder="点击上传 Excel 表格（.xls / .xlsx）"
        :field="fieldOn"
        :hide-upload-when-field="hideUploadWhenFieldOn"
        :label="fieldOn ? 'Excel' : ''"
        :upload="uploadExcelFile"
        @change="onChange('Excel', $event)"
      />
      <p class="hint">回写值：{{ excelValue || '（暂无）' }}</p>
    </div>

    <!-- ⑬ 视频上传-->
    <div class="card">
      <div class="section-title">⑬ 视频上传</div>
      <p class="hint">
        <code>type="document"</code> + <code>accept="video/*"</code>，支持 mp4 / mov 等， 自定义 UI
        展示文件名与大小（mock 落盘，演示非图片类文件）。
      </p>
      <VantUpload
        v-model="videoValue"
        type="document"
        :accept="'video/*'"
        :max-size="100"
        placeholder="点击上传视频（mp4 / mov 等）"
        :field="fieldOn"
        :hide-upload-when-field="hideUploadWhenFieldOn"
        :label="fieldOn ? '视频' : ''"
        :upload="uploadVideo"
        @change="onChange('视频', $event)"
      />
      <p class="hint">回写值：{{ videoValue || '（暂无）' }}</p>
    </div>

    <!-- ⑭ 全类型文件（压缩包 / Word / 任意）-->
    <div class="card">
      <div class="section-title">⑭ 全类型文件（压缩包 / Word / 任意）</div>
      <p class="hint">
        <code>type="document"</code> + 不限制 <code>accept</code>，覆盖 zip / rar / doc / docx / txt
        等任意附件，统一落盘到 <code>src/assets/demo-upload</code>。
      </p>
      <VantUpload
        v-model="anyValue"
        type="document"
        multiple
        :max-count="9"
        placeholder="点击上传文件（压缩包 / Word / 任意附件）"
        :field="fieldOn"
        :hide-upload-when-field="hideUploadWhenFieldOn"
        :label="fieldOn ? '附件' : ''"
        :upload="uploadAny"
        @change="onChange('全类型', $event)"
      />
      <p class="hint">回写值：{{ anyValue || '（暂无）' }}</p>
    </div>

    <!-- ⑮ 嵌套响应字段路径（responsePath）-->
    <div class="card">
      <div class="section-title">⑮ 嵌套响应字段路径（responsePath）</div>
      <p class="hint">
        后端返回结构为 <code>{ code, data: { result: { imgUrl, fileId, fileName } } }</code>，
        结果对象嵌套在 <code>data.result</code>。通过
        <code>response-path="data.result"</code> 定位结果对象， 再配合
        <code>field-map</code> 适配字段名，无需改动组件内部。
      </p>
      <VantUpload
        v-model="nestedValue"
        type="image"
        :upload="uploadNested"
        response-path="data.result"
        :field="fieldOn"
        :hide-upload-when-field="hideUploadWhenFieldOn"
        :label="fieldOn ? '嵌套响应' : ''"
        :field-map="{ url: 'imgUrl', value: 'fileId', name: 'fileName' }"
        @change="onChange('嵌套响应', $event)"
      />
      <p class="hint">回写 modelValue（取后端 fileId）：{{ nestedValue || '（暂无）' }}</p>
    </div>

    <!-- ⑯ success 事件（回写值 + 完整响应 + 逐文件成功）-->
    <div class="card">
      <div class="section-title">⑯ success 事件（回写值 + 完整响应 + 逐文件成功）</div>
      <p class="hint">
        通过 <code>@success="onSuccess"</code> 在<b>每次上传成功时</b>触发（每个文件各自一次），
        回调为 <code>(value, item, result?)</code>：value 为该文件回写值（与 v-model 对应项一致），
        item 为含 url / value / name / status 的上传项，result 为<b>可选</b>的后端完整原始响应，
        可据此做 OCR、审核、文件指纹记录等额外逻辑（组件回写值仍正常生效）。 区别于
        <code>change</code>（仅值变化时触发），适合做逐文件成功提示。
      </p>
      <VantUpload
        v-model="successValue"
        type="document"
        multiple
        :max-count="5"
        placeholder="点击上传文件（监听 success 事件）"
        :field="fieldOn"
        :hide-upload-when-field="hideUploadWhenFieldOn"
        :label="fieldOn ? '文件' : ''"
        :upload="uploadDoc"
        @success="onSuccess"
        @change="onChange('success示例', $event)"
      />
      <p class="hint">最近一次 success：{{ successLog || '（暂无）' }}</p>
      <p class="hint">其它处理：{{ otherProcess || '（暂无）' }}</p>
      <p class="hint" v-if="fullResp">
        完整后端响应：{ url: {{ (fullResp.url || '').split('/').pop() }}, fileName:
        {{ fullResp.fileName }}, base64: (长度 {{ fullResp.base64?.length ?? 0 }}) }
      </p>
    </div>

    <!-- ⑰ 超限自动压缩（compress-before-upload · 默认关闭）-->
    <div class="card">
      <div class="section-title">⑰ 超限自动压缩（compress-before-upload · 默认关闭）</div>
      <p class="hint">
        配置 <code>:compress-before-upload="true"</code> 后，若选中图片<b
          >超过 <code>maxSize</code></b
        >，组件会先<b>等比缩放 + 调整 JPEG 质量压缩</b>再上传（仍超则拒绝并触发
        <code>oversize</code>）；不配置（默认 <code>false</code>）则超限直接拒绝、不压缩。 本示例把
        <code>maxSize</code> 设为 <b>0.5MB</b>，选张大图即可看到「超限→压缩→上传」效果。 另可配
        <code>compress-quality</code>（起始质量，默认
        0.8）、<code>compress-max-edge</code>（最长边上限，默认 1920）。
      </p>
      <VantUpload
        v-model="compressValue"
        type="image"
        :max-size="0.5"
        :compress-before-upload="true"
        :field="fieldOn"
        :hide-upload-when-field="hideUploadWhenFieldOn"
        :label="fieldOn ? '图片' : ''"
        :upload="uploadImg"
        @change="onChange('超限压缩', $event)"
      />
    </div>

    <!-- ⑱ 表单内 van-field 回填提交（field · 默认关闭）-->
    <div class="card">
      <div class="section-title">⑱ 表单内 van-field 回填提交（field · 默认关闭）</div>
      <p class="hint">
        配置 <code>:field="true"</code> 后，<b>原始上传 UI 下方</b>会额外渲染一行
        <code>van-field</code> 表单行（label
        在左、已上传信息回显在右、右侧「上传」按钮可再次唤起同一套上传逻辑回填数据）， 从而和
        <code>van-form</code> 中其他 <code>van-field</code> 保持统一 UI，并参与表单提交：
        <code>name</code> 作为提交字段名、<code>rules</code> 做表单校验、<code>error-message</code>
        显示错误提示。 上方开关仅统一控制 ②-⑰ 的 field
        渲染效果；本示例为<b>固定开启</b>的独立表单提交演示。
      </p>
      <van-form @submit="onSubmit">
        <VantUpload
          v-model="formFieldValue"
          type="image"
          field
          :hide-upload-when-field="hideUploadWhenFieldOn"
          name="idPhoto"
          label="证件照"
          required
          :rules="[{ required: true, message: '请上传证件照' }]"
          :upload="uploadImg"
          @change="onChange('表单回填', $event)"
        />
        <div class="form-actions">
          <van-button round block type="primary" native-type="submit">提交表单</van-button>
        </div>
      </van-form>
      <p class="hint" v-if="formSubmitLog">提交结果：{{ formSubmitLog }}</p>
    </div>

    <!-- ⑲ 身份证 OCR 识别回填（控件 field 展示证件号 / 签发机关）-->
    <div class="card">
      <div class="section-title">⑲ 身份证 OCR 识别回填（控件 field 展示证件号 / 签发机关）</div>
      <p class="hint">
        身份证上传后端「合并接口」一次返回图片地址与识别结果（上传 + OCR 一步到位）。配置
        <code>response-path="data"</code> 定位结果对象，并开启 <code>field</code> 让控件<b
          >内置的 van-field</b
        >
        直接展示识别结果：正面上传后由
        <code>:ocr-field="'certNo'"</code> 提取<b>证件号码</b>、反面上传后由
        <code>:ocr-field="'issueOrg'"</code> 提取<b>签发机关</b>，回填到控件自带 van-field（label
        即「证件号码 / 签发机关」，可随外层 van-form 提交）；同时
        <code>@success</code> 仍透传<b>完整后端响应</b>（含 url / 识别字段）。
        后端字段名不确定时，随意改 <code>ocrField</code> 即可适配，无需改组件内部。下方
        <b>van-form + van-field</b> 回填其余识别字段（姓名 / 性别 / 民族 / 出生 / 地址 /
        有效期），可人工核对修正后提交。
      </p>

      <div class="usage-subtitle">
        OCR 识别结果 → Vant4 表单回填（控件 field 已直接展示证件号 /
        签发机关，下方表单展示其余字段）
      </div>
      <van-form @submit="onOcrFormSubmit">
        <van-cell-group>
          <!-- 人像面：开启 field，控件内置 van-field 直接展示 OCR 识别的证件号（name=certNo，可随 van-form 提交） -->
          <VantUpload
            v-model="idFrontOcrImg"
            type="idcard"
            variant="front"
            :upload="uploadIdCardFrontOcr"
            response-path="data"
            :ocr-field="'certNo'"
            v-model:ocr="idFrontOcrText"
            :field="fieldOn"
            :hide-upload-when-field="hideUploadWhenFieldOn"
            label="证件号码"
            name="certNo"
            :rules="[{ required: true, message: '请上传身份证人像面' }]"
            @success="onOcrSuccess"
            @change="onChange('人像面(OCR)', $event)"
          />
          <van-field
            v-model="ocrForm.name"
            name="name"
            label="姓名"
            placeholder="上传人像面后自动回填"
          />
          <van-field
            v-model="ocrForm.gender"
            name="gender"
            label="性别"
            placeholder="上传人像面后自动回填"
          />
          <van-field
            v-model="ocrForm.nation"
            name="nation"
            label="民族"
            placeholder="上传人像面后自动回填"
          />
          <van-field
            v-model="ocrForm.birth"
            name="birth"
            label="出生"
            placeholder="上传人像面后自动回填"
          />
          <van-field
            v-model="ocrForm.address"
            name="address"
            label="地址"
            type="textarea"
            autosize
            placeholder="上传人像面后自动回填"
          />

          <!-- 国徽面：开启 field，控件内置 van-field 直接展示 OCR 识别的签发机关（name=issueOrg，可随 van-form 提交） -->
          <VantUpload
            v-model="idBackOcrImg"
            type="idcard"
            variant="back"
            :upload="uploadIdCardBackOcr"
            response-path="data"
            :ocr-field="'issueOrg'"
            v-model:ocr="idBackOcrText"
            :field="fieldOn"
            :hide-upload-when-field="hideUploadWhenFieldOn"
            label="签发机关"
            name="issueOrg"
            :rules="[{ required: true, message: '请上传身份证国徽面' }]"
            @success="onOcrSuccess"
            @change="onChange('国徽面(OCR)', $event)"
          />
          <van-field
            v-model="ocrForm.validPeriod"
            name="validPeriod"
            label="有效期"
            placeholder="上传国徽面后自动回填"
          />
        </van-cell-group>
        <div class="form-actions">
          <van-button round block type="primary" native-type="submit"
            >提交（OCR 回填后可人工核对修正）</van-button
          >
          <van-button round block plain type="default" @click="resetOcrForm">清空</van-button>
        </div>
      </van-form>
      <p class="hint" v-if="ocrFormSubmitLog">提交结果：{{ ocrFormSubmitLog }}</p>

      <p class="hint">
        人像面（控件内置 field 展示证件号）：{{ idFrontOcrText || '（上传后回填）' }}
      </p>
      <p class="hint">
        国徽面（控件内置 field 展示签发机关）：{{ idBackOcrText || '（上传后回填）' }}
      </p>
      <p class="hint" v-if="ocrResultData">
        完整识别数据（@success）：url=
        {{ (ocrResultData.url || '').split('/').pop() }}；certNo={{ ocrResultData.certNo }}；
        validPeriod={{ ocrResultData.validPeriod }}；name={{ ocrResultData.name }}
      </p>
    </div>

    <!-- ⑳ 统一身份证模拟数据（mockDemoIdCardOcr）-->
    <div class="card">
      <div class="section-title">⑳ 统一身份证模拟数据（mockDemoIdCardOcr）</div>
      <p class="hint">
        <code>src/api/modules/demo-idcard.ts</code> 提供<b>前端安全</b>的统一身份证 OCR
        模拟数据生成器 <code>mockDemoIdCardOcr(side)</code>，返回与后端一致字段（正面
        certNo/name/address/birth/gender/nation，反面 issueOrg/validPeriod），
        可用于单测预填、本地联调或离线演示，无需依赖 mock 服务；另提供
        <code>mockDemoIdCardUploadResponse(side, url)</code> 生成含图片地址的完整合并接口响应。
      </p>
      <pre class="mock-pre">front = {{ JSON.stringify(idCardMockFront, null, 2) }}</pre>
      <pre class="mock-pre">back = {{ JSON.stringify(idCardMockBack, null, 2) }}</pre>
    </div>

    <!-- 使用说明 -->
    <div class="card">
      <div class="section-title">使用说明</div>

      <div class="usage-subtitle">一、五种内置 type</div>
      <p class="hint">
        · 组件基于 <code>van-uploader</code>（图片类）+ 自定义上传区（证件 / 发票类）封装。
      </p>
      <p class="hint">· <code>type="avatar"</code> 圆形头像上传（场景②）。</p>
      <p class="hint">
        · <code>type="idcard"</code> 身份证上传，配合 <code>variant="front|back"</code> 展示人像面 /
        国徽面占位卡片。<b>默认 UI 自适应屏幕宽度</b>（占满整行、高约
        150px，直观呈现身份证版面，场景③）； 传 <code>compact</code> 时回退为
        <b>150×95 固定小宽度 UI</b>，适合并排 / 紧凑布局（场景④）； 还可配置
        <code>show-sample</code> 使点击上传前先弹出「身份证上传示例」引导弹窗（场景⑤）——
        弹窗含标准样张、四角定位框、横向拍摄提示与合规声明，确认后才唤起选图；
        <code>variant="front|back"</code> 会切换样张图标与文案，<b>人像面 / 国徽面均适用</b>；
        <code>show-sample</code> 默认 <code>false</code>（不传则点击直接选图）。
      </p>
      <p class="hint">
        · <code>type="invoice"</code> 发票 / 票据图片卡片：大虚线框居中相机图标，
        <code>label</code> 右侧显示
        <code>invoice-tag</code> 类型标签。单张上传后图片占据原卡片位置、 再次上传直接替换；多张以 3
        列网格展示且<b>添加按钮常驻至上限</b>。点击缩略图可放大预览，右上角删除（场景⑥-⑦）。
      </p>
      <p class="hint">
        · <code>type="document"</code> 证件 / 附件上传，自定义 UI 展示图标 / 名称 / 大小 / 进度 /
        删除；配合 <code>accept</code> 适配 PDF / Excel / 视频 /
        压缩包等任意文件类型（场景⑧-⑨、⑫-⑭）。
      </p>
      <p class="hint">
        · <code>type="image"</code>（默认）通用图片上传；加 <code>multiple</code> 支持多图，多选时
        <code>v-model</code> 为 <code>string[]</code>（场景⑩）。
      </p>

      <div class="usage-subtitle">二、上传函数与后端适配</div>
      <p class="hint">
        · 头像（场景②）保留 <code>mockUpload</code> 本地 ObjectURL 预览方式；
        其余示例均改为「落盘」上传（<code>diskUpload → uploadDemoFile</code> → mock 写入
        <code>src/assets/demo-upload</code> 并返回 <code>/demo-upload/xxx</code> 地址）。 不传
        <code>:upload</code> 时组件回退为本地 blob 预览。
      </p>
      <p class="hint">
        · <b>请求字段名</b>由 <code>:upload</code> 自定义函数自行组织（如场景⑪使用
        <code>fileData / name</code>），便于对接不同后端入参要求。
      </p>
      <p class="hint">
        · <b>响应字段名</b>通过 <code>:field-map="{ url, value, name }"</code> 映射 （如
        <code>imgUrl→url</code>、<code>fileId→value</code>、<code>fileName→name</code>，场景⑪），
        无需改动组件内部。<code>resultField</code> 可单独指定回写字段，优先级低于
        <code>fieldMap.value</code>。
      </p>
      <p class="hint">
        · 若结果对象被<b>嵌套</b>（如 <code>{ code, data: { result } }</code>），用
        <code>:response-path="'data.result'"</code> 先定位结果对象，再配合
        <code>field-map</code> 适配（场景⑮）。
      </p>
      <p class="hint">
        ·
        <b>OCR 识别信息回填</b
        >：身份证（或任何带识别结果的场景）上传成功后，后端常一并返回识别字段。 通过
        <code>:ocr-field="'certNo'"</code>（点号路径，如
        <code>'data.idNumber'</code>）指定回填字段， 组件会 emit <code>@ocr</code> 并通过
        <code>v-model:ocr</code> 回填识别文本（场景⑲： 人像面回填证件号、国徽面回填有效期）。
        后端字段名不确定时，配合
        <code>response-path</code> 定位结果对象后即可任意配置，无需改组件内部。
      </p>

      <div class="usage-subtitle">三、事件</div>
      <p class="hint">
        · <code>@change="(value, item)"</code>：<b>每次 modelValue 变化</b>时触发，value 为当前主值
        （单选取首个、多选与 v-model 一致），item 为对应上传项（无值时为 null，场景①）。
      </p>
      <p class="hint">
        ·
        <code>@success="(value, item, result?)"</code
        >：<b>每次上传成功</b>时触发（每个文件各自一次）—— value 为回写值、item 为上传项、result
        为<b>可选</b>的后端完整原始响应（可用于 OCR / 审核 / 指纹记录等，场景⑯；亦可在场景⑲
        拿到身份证完整响应）。
      </p>
      <p class="hint">
        · <code>@ocr="(value, result?)"</code>：配置 <code>ocrField</code> 且后端返回对应值时触发——
        value 为提取到的识别文本（如证件号 / 有效期）、result
        为<b>完整原始响应</b>，便于回填表单或做其它处理；
        <code>v-model:ocr</code> 可双向绑定该识别文本（场景⑲）。
      </p>
      <p class="hint">
        · <code>@remove="(item)"</code> 删除文件时触发；<code>@oversize="(file)"</code> 文件超过
        <code>maxSize</code> 上限时触发（开启 <code>compress-before-upload</code> 时，仅「未压缩 /
        压缩后仍超限」才会触发）。
      </p>

      <div class="usage-subtitle">四、常用 Props</div>
      <p class="hint">
        · <code>modelValue</code>（v-model）/ <code>type</code> / <code>variant</code> /
        <code>compact</code> / <code>show-sample</code>（idcard：上传前弹示例引导弹窗，默认 false）/
        <code>multiple</code> / <code>maxCount</code>（多选默认 9）/
        <code>maxSize</code>（MB，document/invoice 默认 10、其余 5）/ <code>accept</code>。
      </p>
      <p class="hint">
        · <code>compress-before-upload</code>（默认 <code>false</code>）：图片超过
        <code>maxSize</code> 时<b>先压缩再上传</b>；需手动开启。可选
        <code>compress-quality</code>（起始质量 0-1，默认 0.8）、
        <code>compress-max-edge</code>（压缩后最长边像素上限，默认 1920，场景⑰）。
      </p>
      <p class="hint">
        · <code>label</code> / <code>required</code> / <code>invoice-tag</code> /
        <code>placeholder</code>（占位文案）/ <code>disabled</code> / <code>readonly</code>。
      </p>
      <p class="hint">
        · <code>hide-upload-when-field</code>（默认 <code>false</code>）：仅当
        <code>field=true</code> 时生效——隐藏各示例原始上传 /
        添加按钮（拖拽区、发票格子、图片框、身份证卡）， 上传统一收口到
        <code>van-field</code> 右侧相机入口（见页面顶部「隐藏原添加按钮」开关，场景⑱）。
      </p>
      <p class="hint">
        · <code>field</code>（默认 <code>false</code>）：在原始上传 UI <b>下方</b>额外渲染一行
        <code>van-field</code> 表单行，放入 <code>van-form</code> 中即可与表单内其他
        <code>van-field</code> 保持统一 UI 并回填数据提交；需手动开启。开启后 label 改由该
        <code>van-field</code> 渲染（原 UI
        上方不再重复显示），右侧「上传」按钮复用同一套上传逻辑回填数据。配套
        <code>name</code>（提交字段名）/ <code>rules</code>（校验规则）/
        <code>error-message</code>（错误提示）/ <code>center</code>（label 居中）/
        <code>border</code>（下边框，默认 true）。本页顶部「van-field 表单回填效果」开关可统一控制
        ②-⑰ 的 field 渲染效果（场景⑱ 为固定开启的表单提交演示）。
      </p>
      <p class="hint">
        · <code>upload</code> / <code>result-field</code> / <code>field-map</code> /
        <code>response-path</code>（后端对接相关，见「二」）。
      </p>
      <p class="hint">
        · <code>ocr-field</code>（默认不配置）：OCR 识别信息回填字段名（点号路径，如
        <code>'certNo'</code> /
        <code>'data.idNumber'</code>）。配置后，上传成功且后端返回该字段值时，组件 emit
        <code>@ocr</code> 并通过 <code>v-model:ocr</code> 回填识别文本（场景⑲）。
        后端返回结构不确定时配合 <code>response-path</code> 即可任意适配。
      </p>
    </div>
  </div>
</template>

<style scoped>
.upload-demo {
  padding-bottom: 24px;
}
.card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #323233;
  margin-bottom: 12px;
}
/* ⑰ change 回显：标题行 + 清空按钮 两端对齐 */
.log-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.log-head .section-title {
  margin-bottom: 0;
}
/* 实时操作日志：固定高度可滚动，最新在上 */
.log-box {
  max-height: 160px;
  overflow-y: auto;
  background: #f7f8fa;
  border: 1px solid #ebedf0;
  border-radius: 6px;
  padding: 8px 10px;
}
.log-line {
  font-size: 12px;
  line-height: 1.7;
  color: #646566;
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  word-break: break-all;
}
/* 使用说明内的分组小标题 */
.usage-subtitle {
  font-size: 13px;
  font-weight: 600;
  color: #1989fa;
  margin: 14px 0 6px;
}
.usage-subtitle:first-of-type {
  margin-top: 0;
}
/* 同一行并排展示（身份证正反面等，使用 compact 小宽度 UI） */
.idcard-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
}
.idcard-row > * {
  flex: 0 0 auto;
  width: auto;
}
/* 全宽正反面之间的竖向间距 */
.idcard-gap {
  height: 12px;
}
.hint {
  font-size: 12px;
  color: #969799;
  line-height: 1.6;
  margin: 0 0 10px;
}
.hint code {
  background: #f0f0f0;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 11px;
  color: #1989fa;
}
/* 统一开关栏：van-field 表单回填效果 */
.field-toggle {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin: 12px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
/* 开关：顶部与标题对齐、禁止被压缩、保证与文案的最小间距 */
.field-toggle__switch {
  flex-shrink: 0;
  margin-left: 12px;
  margin-top: 1px;
}
.field-toggle__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.field-toggle__title {
  font-size: 14px;
  font-weight: 600;
  color: #323233;
}
.field-toggle__desc {
  font-size: 11px;
  color: #969799;
  line-height: 1.5;
}
/* 表单回填示例：提交按钮间距 */
.form-actions {
  margin-top: 12px;
}
/* 统一模拟数据：等宽字体展示 JSON */
.mock-pre {
  background: #f7f8fa;
  border: 1px solid #ebedf0;
  border-radius: 8px;
  padding: 10px 12px;
  margin: 0 0 10px;
  font-size: 11px;
  line-height: 1.5;
  color: #323233;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
}
</style>
