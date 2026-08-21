<script setup lang="ts">
/**
 * VantInsuranceFormDemo —— 保险报案表单综合 Demo
 *
 * 演示如何把仓库内所有 VantXXXField 组件 + VantUpload(field=true) + VantCheckinField
 * 组合为一个「保险报案」业务表单，覆盖 Vant4 常见表单控件：
 *   - 输入：van-field（姓名 / 手机号 / 证件号 / 保单号 / 事故经过 textarea）
 *   - 单选：VantSelectField（关系 / 险种 / 出险原因）
 *   - 多选：VantSelectMultipleField（附加险种 / 损失项目）
 *   - 时间：VantTimePickerField（出险日期 / 出险时间）
 *   - 日历：VantCalendarField（投保日期）
 *   - 级联：VantTreeSelectField（出险地区）
 *   - 标签树：VantTreeTagsField（事故类型）
 *   - 搜索：VantSearchField（承保公司 / 就诊医院）
 *   - 定位：VantCheckinField（出险地点）
 *   - 上传：VantUpload field=true（身份证正反面 / 驾驶证 / 病历 / 医疗发票）
 *   - 原生控件：van-radio（性别）/ van-switch（是否住院）/ van-stepper（受伤人数）
 *             / van-rate（严重程度）/ van-checkbox（条款）
 *
 * 状态：
 *   - 默认「新增」：表单为空
 *   - 「模拟编辑回填」：加载一组模拟数据，演示组件 v-model 回填能力
 */
import { reactive, ref } from 'vue'
import { showToast, showLoadingToast, closeToast } from 'vant'
import VantSelectField from '../../components/VantSelectField.vue'
import VantSelectMultipleField from '../../components/VantSelectMultipleField.vue'
import VantTimePickerField from '../../components/VantTimePickerField.vue'
import VantCalendarField from '../../components/VantCalendarField.vue'
import VantTreeSelectField from '../../components/VantTreeSelectField.vue'
import VantTreeTagsField from '../../components/VantTreeTagsField.vue'
import VantSearchField from '../../components/VantSearchField.vue'
import VantCheckinField from '../../components/VantCheckinField.vue'
import VantUpload from '../../components/VantUpload.vue'
import type { CheckinResult } from '../../components/VantCheckin.vue'
import {
  getDemoClaimDetail,
  createDemoClaim,
  updateDemoClaim,
  uploadDemoFile,
  type DemoClaim,
  type DemoUploadParams,
} from '../../api'

const tmapKey = ref(import.meta.env.VITE_TMAP_KEY || '')

// ============== 上传 / 预览地址处理 ==============
// 本地根目录（文件静态服务根）：mock 下 /demo-upload 挂在 dev server origin 下，
// 故用 window.location.origin 作为拼接基准，把上传返回的「相对地址」转成可预览的绝对地址。
const ASSET_BASE = window.location.origin

/**
 * 把（可能相对的）上传地址解析为可预览的绝对地址：
 *  - 已为绝对地址（含协议 / data: / blob:）原样返回，避免重复拼接
 *  - 相对地址（如 /demo-upload/xxx.png）拼接本地根目录后返回
 */
function resolveAssetUrl(url?: string | null): string {
  if (!url) return ''
  if (/^(https?:)?\/\//.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url
  return ASSET_BASE + (url.startsWith('/') ? '' : '/') + url
}

/** File 读为 base64 data URI（上传接口要求 base64 入参） */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * 生成「上传经办函数」供 VantUpload 的 :upload 使用：
 *   选图 → 读 base64 → 调用后端 demo-upload.ts 上传接口 → 返回拼接本地根目录后的预览地址。
 * VantUpload 会把返回的 url 既作为预览图地址、也作为回写值（modelValue）。
 */
function makeUploader(type: DemoUploadParams['type'] = 'image') {
  return async (file: File): Promise<Record<string, any>> => {
    const base64 = await fileToBase64(file)
    const res = await uploadDemoFile({ fileName: file.name, base64, type })
    return { ...res, url: resolveAssetUrl(res.url) }
  }
}

// ============== 表单数据模型 ==============
function blankForm() {
  return {
    // 报案人信息
    reporterName: '',
    phone: '',
    gender: 'male' as string,
    idCard: '',
    relationship: '' as string | number,
    // 保单信息
    policyNo: '',
    insurer: '' as string | number,
    insuranceType: '' as string | number,
    extraCoverage: [] as Array<string | number>,
    effectiveDate: '' as string,
    // 出险信息
    accidentCause: '' as string | number,
    accidentDate: '' as string,
    accidentTime: '' as string,
    region: '' as string | number,
    hospital: '' as string | number,
    accidentType: [] as Array<string | number>,
    isHospitalized: false,
    injuredCount: 1,
    severity: 0,
    lossItems: [] as Array<string | number>,
    description: '',
    agree: false,
    // 出险地点（定位打卡）
    checkin: null as CheckinResult | null,
    // 资料上传
    idCardFront: '' as string,
    idCardBack: '' as string,
    driverLicense: '' as string,
    medicalRecord: '' as string,
    invoice: [] as string[],
  }
}

const form = reactive(blankForm())

const mode = ref<'add' | 'edit'>('add')
// 编辑态下记录当前报案单 id（提交时用于 PUT 更新）；新增态为 null
const editId = ref<number | null>(null)
// 提交 / 回填加载态
const submitting = ref(false)
const loading = ref(false)

// ============== 选项数据 ==============
const relationships = [
  { text: '本人', value: 'self' },
  { text: '配偶', value: 'spouse' },
  { text: '父母', value: 'parent' },
  { text: '子女', value: 'child' },
  { text: '其他', value: 'other' },
]
const insuranceTypes = [
  { text: '机动车保险', value: 'auto' },
  { text: '意外伤害保险', value: 'accident' },
  { text: '健康医疗保险', value: 'health' },
  { text: '家庭财产保险', value: 'property' },
  { text: '责任保险', value: 'liability' },
]
const extraOptions = [
  { text: '玻璃单独破碎', value: 'glass' },
  { text: '自燃损失', value: 'burn' },
  { text: '涉水', value: 'water' },
  { text: '车身划痕', value: 'scratch' },
  { text: '不计免赔', value: 'nolicense' },
]
const accidentCauses = [
  { text: '碰撞', value: 'collision' },
  { text: '倾覆', value: 'rollover' },
  { text: '火灾', value: 'fire' },
  { text: '自然灾害', value: 'nature' },
  { text: '盗窃', value: 'theft' },
  { text: '其他', value: 'other' },
]
const lossOptions = [
  { text: '车辆损失', value: 'vehicle' },
  { text: '人员伤亡', value: 'person' },
  { text: '财产损失', value: 'property' },
  { text: '医疗费用', value: 'medical' },
]
const regionTree = [
  {
    text: '浙江',
    value: 'zj',
    children: [
      {
        text: '杭州',
        value: 'hz',
        children: [
          { text: '西湖区', value: 'xh' },
          { text: '上城区', value: 'sc' },
        ],
      },
      { text: '宁波', value: 'nb', children: [{ text: '海曙区', value: 'hs' }] },
    ],
  },
  { text: '北京', value: 'bj', children: [{ text: '朝阳区', value: 'cy' }] },
  { text: '广东', value: 'gd', children: [{ text: '深圳', value: 'sz' }] },
]
const accidentTree = [
  {
    text: '交通事故',
    value: 'traffic',
    children: [
      { text: '车辆碰撞', value: 'car' },
      { text: '人员受伤', value: 'person' },
    ],
  },
  { text: '自然灾害', value: 'nature', children: [{ text: '暴雨', value: 'rain' }] },
  { text: '意外', value: 'accident', children: [{ text: '滑倒', value: 'slip' }] },
]
const insurerOptions = ['中国保保财险', '中国平安财险', '太平洋财险', '中国人寿财险', '大地财险']
const hospitalOptions = [
  '北京协和医院',
  '四川大学华西医院',
  '复旦大学附属华山医院',
  '中南大学湘雅医院',
  '浙江大学附属第一医院',
]

// ============== 状态切换：新增 / 编辑回填 ==============
function resetToAdd() {
  Object.assign(form, blankForm())
  mode.value = 'add'
  editId.value = null
  showToast('已重置为「新增」状态')
}

// 清空按钮：清空整张报案表单并回到「新增」状态
function clearForm() {
  Object.assign(form, blankForm())
  mode.value = 'add'
  editId.value = null
  showToast('表单已清空')
}

/**
 * 编辑回填：调用后端 mock 接口 GET /api/demo/claim?id=1 拉取报案单详情，
 * 再把返回数据写入 form，实现「读取数据回填」。
 */
async function loadEdit() {
  if (loading.value) return
  loading.value = true
  showLoadingToast({ message: '加载中...', forbidClick: true, duration: 0 })
  try {
    const detail = await getDemoClaimDetail(1)
    // 后端返回字段与表单模型一一对应，逐项回填（checkin 为定位打卡结构）
    Object.assign(form, {
      ...blankForm(),
      ...detail,
      checkin: (detail.checkin as CheckinResult | null) ?? null,
    })
    // 图片字段：后端返回的是「上传相对地址」（如 /demo-upload/xxx.png），
    // 拼接本地根目录得到可预览绝对地址后回写，通知 VantUpload 组件预览
    form.idCardFront = resolveAssetUrl(detail.idCardFront)
    form.idCardBack = resolveAssetUrl(detail.idCardBack)
    form.driverLicense = resolveAssetUrl(detail.driverLicense)
    form.medicalRecord = resolveAssetUrl(detail.medicalRecord)
    form.invoice = (detail.invoice || []).map((u: string) => resolveAssetUrl(u))
    editId.value = detail.id ?? 1
    mode.value = 'edit'
    closeToast()
    showToast('已加载「编辑」回填数据')
  } catch (e) {
    closeToast()
    console.error('[报案单回填失败]', e)
    showToast('加载失败，请重试')
  } finally {
    loading.value = false
  }
}

// ============== 提交 / 校验 ==============
/**
 * 提交报案：新增走 POST，编辑走 PUT（带 id）。
 * 仅原生 van-field / VantUpload(field) / VantCheckinField 会进入 van-form values，
 * 这里统一提交整个 form 对象（含各自定义 Field 组件的 v-model 值）。
 */
async function onSubmit() {
  if (submitting.value) return
  submitting.value = true
  showLoadingToast({ message: '提交中...', forbidClick: true, duration: 0 })
  try {
    const payload = JSON.parse(JSON.stringify(form)) as DemoClaim
    let res: DemoClaim
    if (mode.value === 'edit' && editId.value != null) {
      res = await updateDemoClaim({ ...payload, id: editId.value })
    } else {
      res = await createDemoClaim(payload)
    }
    // 提交成功后切换为编辑态并记录后端返回的 id（便于后续再次提交走更新）
    editId.value = res.id ?? editId.value
    mode.value = 'edit'
    closeToast()
    showToast(mode.value === 'edit' ? '报案更新成功' : '报案提交成功')
    console.log('[保险报案表单] 提交返回', res)
  } catch (e) {
    closeToast()
    console.error('[报案提交失败]', e)
    showToast('提交失败，请重试')
  } finally {
    submitting.value = false
  }
}
function onFailed() {
  showToast('请检查并完善必填项')
}
</script>

<template>
  <div class="ins-form">
    <van-nav-bar
      title="保险报案表单"
      left-text="返回"
      left-arrow
      data-track-anchor="navBack"
      @click-left="$router.back()"
    >
      <template #right>
        <van-tag :type="mode === 'edit' ? 'warning' : 'primary'" round>
          {{ mode === 'edit' ? '编辑' : '新增' }}
        </van-tag>
      </template>
    </van-nav-bar>

    <!-- 状态切换条 -->
    <div class="mode-bar">
      <span class="mode-bar__tip">演示状态：</span>
      <van-button size="small" :type="mode === 'add' ? 'primary' : 'default'" @click="resetToAdd">
        新增报案
      </van-button>
      <van-button
        size="small"
        :type="mode === 'edit' ? 'warning' : 'default'"
        :loading="loading"
        @click="loadEdit"
      >
        编辑回填（接口）
      </van-button>
    </div>

    <van-form @submit="onSubmit" @failed="onFailed">
      <!-- 报案人信息 -->
      <van-cell-group title="报案人信息" inset>
        <van-field
          data-track-anchor="reporterName"
          v-model="form.reporterName"
          label="报案人"
          placeholder="请输入报案人姓名"
          clearable
          :rules="[{ required: true, message: '请输入报案人姓名' }]"
        />
        <van-field
          data-track-anchor="phone"
          v-model="form.phone"
          label="手机号"
          type="tel"
          placeholder="请输入联系手机号"
          :rules="[
            { required: true, message: '请输入手机号' },
            { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' },
          ]"
        />
        <van-field label="性别" data-track-anchor="gender">
          <template #input>
            <van-radio-group v-model="form.gender" direction="horizontal">
              <van-radio name="male">男</van-radio>
              <van-radio name="female">女</van-radio>
            </van-radio-group>
          </template>
        </van-field>
        <van-field
          data-track-anchor="idCard"
          v-model="form.idCard"
          label="证件号码"
          placeholder="请输入身份证号"
        />
        <VantSelectField
          data-track-anchor="relationship"
          v-model="form.relationship"
          :options="relationships"
          label="与投保人关系"
          title="选择关系"
          required
          clearable
        />
      </van-cell-group>

      <!-- 保单信息 -->
      <van-cell-group title="保单信息" inset>
        <van-field
          data-track-anchor="policyNo"
          v-model="form.policyNo"
          label="保单号"
          placeholder="请输入保单号"
        />
        <VantSearchField
          data-track-anchor="insurer"
          v-model="form.insurer"
          :options="insurerOptions"
          label="承保公司"
          title="选择承保公司"
          placeholder="搜索保险公司"
          clearable
        />
        <VantSelectField
          data-track-anchor="insuranceType"
          v-model="form.insuranceType"
          :options="insuranceTypes"
          label="险种类型"
          title="选择险种"
          required
          clearable
        />
        <VantSelectMultipleField
          data-track-anchor="extraCoverage"
          v-model="form.extraCoverage"
          :options="extraOptions"
          label="附加险种"
          title="选择附加险种"
          clearable
        />
        <VantCalendarField
          data-track-anchor="effectiveDate"
          v-model="form.effectiveDate"
          label="投保日期"
          title="选择投保日期"
          clearable
        />
      </van-cell-group>

      <!-- 出险信息 -->
      <van-cell-group title="出险信息" inset>
        <VantSelectField
          data-track-anchor="accidentCause"
          v-model="form.accidentCause"
          :options="accidentCauses"
          label="出险原因"
          title="选择出险原因"
          required
          clearable
        />
        <VantTimePickerField
          data-track-anchor="accidentDate"
          v-model="form.accidentDate"
          type="date"
          label="出险日期"
          title="选择出险日期"
          required
          clearable
        />
        <VantTimePickerField
          data-track-anchor="accidentTime"
          v-model="form.accidentTime"
          type="time"
          label="出险时间"
          title="选择出险时间"
          clearable
        />
        <VantTreeSelectField
          data-track-anchor="region"
          v-model="form.region"
          :options="regionTree"
          label="出险地区"
          title="选择地区"
          required
          clearable
        />
        <VantSearchField
          data-track-anchor="hospital"
          v-model="form.hospital"
          :options="hospitalOptions"
          label="就诊医院"
          title="选择就诊医院"
          placeholder="搜索医院"
          clearable
        />
        <VantTreeTagsField
          data-track-anchor="accidentType"
          v-model="form.accidentType"
          :options="accidentTree"
          label="事故类型"
          title="选择事故类型"
          clearable
        />
        <van-field label="是否住院" data-track-anchor="isHospitalized">
          <template #input>
            <van-switch v-model="form.isHospitalized" />
          </template>
        </van-field>
        <van-field label="受伤人数" data-track-anchor="injuredCount">
          <template #input>
            <van-stepper v-model="form.injuredCount" min="0" max="20" integer />
          </template>
        </van-field>
        <van-field label="事故严重程度" data-track-anchor="severity">
          <template #input>
            <van-rate v-model="form.severity" :count="5" />
          </template>
        </van-field>
        <VantSelectMultipleField
          data-track-anchor="lossItems"
          v-model="form.lossItems"
          :options="lossOptions"
          label="损失项目"
          title="选择损失项目"
          clearable
        />
        <van-field
          data-track-anchor="description"
          v-model="form.description"
          label="事故经过"
          type="textarea"
          rows="3"
          autosize
          placeholder="请描述事故发生的经过"
          :rules="[{ required: true, message: '请填写事故经过' }]"
        />
      </van-cell-group>

      <!-- 出险地点 -->
      <van-cell-group title="出险地点（定位打卡）" inset>
        <VantCheckinField
          data-track-anchor="checkin"
          v-model="form.checkin"
          :map-key="tmapKey"
          mode="once"
          label="出险地点"
          name="checkin"
          required
          :rules="[{ required: true, message: '请先进行定位打卡' }]"
        />
      </van-cell-group>

      <!-- 资料上传 -->
      <van-cell-group title="资料上传" inset>
        <VantUpload
          data-track-anchor="idCardFront"
          v-model="form.idCardFront"
          type="idcard"
          variant="front"
          :upload="makeUploader('idcard')"
          field
          name="idCardFront"
          label="身份证（人像面）"
          required
          :rules="[{ required: true, message: '请上传身份证人像面' }]"
        />
        <VantUpload
          data-track-anchor="idCardBack"
          v-model="form.idCardBack"
          type="idcard"
          variant="back"
          :upload="makeUploader('idcard')"
          field
          name="idCardBack"
          label="身份证（国徽面）"
          required
          :rules="[{ required: true, message: '请上传身份证国徽面' }]"
        />
        <VantUpload
          data-track-anchor="driverLicense"
          v-model="form.driverLicense"
          type="image"
          :upload="makeUploader('image')"
          field
          name="driverLicense"
          label="驾驶证"
          required
          :rules="[{ required: true, message: '请上传驾驶证' }]"
        />
        <VantUpload
          data-track-anchor="medicalRecord"
          v-model="form.medicalRecord"
          type="image"
          :upload="makeUploader('image')"
          field
          name="medicalRecord"
          label="病历资料"
        />
        <VantUpload
          data-track-anchor="invoice"
          v-model="form.invoice"
          type="invoice"
          :upload="makeUploader('image')"
          field
          multiple
          :max-count="3"
          name="invoice"
          label="医疗发票"
          invoice-tag="图片"
          required
          :rules="[{ required: true, message: '请上传医疗发票' }]"
        />
      </van-cell-group>

      <!-- 条款确认 -->
      <van-cell-group inset>
        <van-cell data-track-anchor="agree">
          <van-checkbox v-model="form.agree" shape="square">
            我已阅读并同意《保险报案须知》与《个人信息处理授权》
          </van-checkbox>
        </van-cell>
      </van-cell-group>

      <div class="form-actions">
        <van-button type="default" block @click="clearForm">清空</van-button>
        <van-button type="primary" block native-type="submit" :loading="submitting">
          {{ mode === 'edit' ? '更新报案' : '提交报案' }}
        </van-button>
      </div>
    </van-form>
  </div>

  <div class="usage-page">
    <div class="section-title">使用说明</div>
    <div class="card" style="margin: 0 12px 16px">
      <p class="hint">
        综合表单示例：组合使用全部 <code>VantXxxField</code> + <code>VantUpload(field)</code> +
        <code>VantCheckinField</code>，演示保险报案页的新增 / 编辑回填。<br />
        各字段组件的 Props / 事件说明见对应独立 Demo（VantSelectFieldDemo、VantTreeTagsFieldDemo
        等）。
      </p>
    </div>
  </div>
</template>

<style scoped>
.ins-form {
  min-height: 100vh;
  background: var(--app-bg);
  padding-bottom: 24px;
}
.mode-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: var(--app-surface);
  border-bottom: 1px solid var(--app-border);
}
.mode-bar__tip {
  font-size: 13px;
  color: var(--app-text-2);
}
.form-actions {
  display: flex;
  gap: 12px;
  padding: 16px;
}

/* 报案人原生 van-field clearable 清空图标，与自定义清空图标保持一致 */
.ins-form :deep(.van-field__clear-icon) {
  color: var(--app-text-3);
  font-size: 16px;
}
.ins-form :deep(.van-field__clear-icon):active {
  color: var(--app-text);
}

.usage-page {
  background: var(--app-bg);
  padding: 0 0 24px;
}
.usage-page .section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--app-text);
  margin: 18px 12px 8px;
}
.usage-page .card {
  background: var(--app-surface);
  border-radius: 12px;
  padding: 4px 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}
.usage-page .hint {
  font-size: 12px;
  color: var(--app-text-3);
  margin: 8px 4px 12px;
  line-height: 1.6;
}
.usage-page .hint code {
  color: #07c160;
  background: #f2f3f5;
  padding: 1px 6px;
  border-radius: 4px;
  word-break: break-all;
}
</style>
