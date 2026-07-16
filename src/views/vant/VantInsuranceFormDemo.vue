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
import { showToast } from 'vant'
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

const tmapKey = ref(import.meta.env.VITE_TMAP_KEY || '')

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
const insurerOptions = ['中国人保财险', '中国平安财险', '太平洋财险', '中国人寿财险', '大地财险']
const hospitalOptions = [
  '北京协和医院',
  '四川大学华西医院',
  '复旦大学附属华山医院',
  '中南大学湘雅医院',
  '浙江大学附属第一医院',
]

// ============== 模拟图片（离线 data URI，避免依赖网络） ==============
function svgImg(label: string, bg: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='200'>
    <rect width='100%' height='100%' fill='${bg}'/>
    <text x='50%' y='50%' fill='#fff' font-size='20' text-anchor='middle' dominant-baseline='middle'>${label}</text>
  </svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

// ============== 状态切换：新增 / 编辑回填 ==============
function resetToAdd() {
  Object.assign(form, blankForm())
  mode.value = 'add'
  showToast('已重置为「新增」状态')
}

// 清空按钮：清空整张报案表单并回到「新增」状态
function clearForm() {
  Object.assign(form, blankForm())
  mode.value = 'add'
  showToast('表单已清空')
}

function loadEdit() {
  Object.assign(form, {
    reporterName: '张三',
    phone: '13800138000',
    gender: 'male',
    idCard: '110101199003071234',
    relationship: 'self',
    policyNo: 'PICC2026-000123',
    insurer: '中国人保财险',
    insuranceType: 'auto',
    extraCoverage: ['glass', 'nolicense'],
    effectiveDate: '2026-01-01',
    accidentCause: 'collision',
    accidentDate: '2026-07-16',
    accidentTime: '14:30',
    region: 'xh',
    hospital: '北京协和医院',
    accidentType: ['traffic', 'car'],
    isHospitalized: true,
    injuredCount: 2,
    severity: 4,
    lossItems: ['vehicle', 'medical'],
    description: '车辆在路口与前方车辆发生追尾，造成两车受损及人员轻伤，已报警并送医治疗。',
    agree: true,
    checkin: {
      lat: 39.98412,
      lng: 116.30748,
      address: '北京市朝阳区建国路 88 号 SOHO 现代城',
      timestamp: '2026-07-16T14:30:00+08:00',
      time: '2026-07-16 14:30:00',
      isFirst: true,
      firstTime: '2026-07-16 14:30:00',
    },
    idCardFront: svgImg('身份证人像面', '#4096ff'),
    idCardBack: svgImg('身份证国徽面', '#fa8c16'),
    driverLicense: svgImg('驾驶证', '#07c160'),
    medicalRecord: svgImg('病历资料', '#7232dd'),
    invoice: [svgImg('医疗发票 1', '#1989fa'), svgImg('医疗发票 2', '#1989fa')],
  })
  mode.value = 'edit'
  showToast('已加载「编辑」回填数据')
}

// ============== 提交 / 校验 ==============
function onSubmit() {
  showToast('提交成功，数据见控制台')
  // 仅原生 van-field / VantUpload(field) / VantCheckinField 会进入 values，
  // 其余自定义 Field 组件请直接读取 form 对象
  console.log('[保险报案表单]', JSON.parse(JSON.stringify(form)))
}
function onFailed() {
  showToast('请检查并完善必填项')
}
</script>

<template>
  <div class="ins-form">
    <van-nav-bar title="保险报案表单" left-text="返回" left-arrow @click-left="$router.back()">
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
      <van-button size="small" :type="mode === 'edit' ? 'warning' : 'default'" @click="loadEdit">
        模拟编辑回填
      </van-button>
    </div>

    <van-form @submit="onSubmit" @failed="onFailed">
      <!-- 报案人信息 -->
      <van-cell-group title="报案人信息" inset>
        <van-field
          v-model="form.reporterName"
          label="报案人"
          placeholder="请输入报案人姓名"
          clearable
          :rules="[{ required: true, message: '请输入报案人姓名' }]"
        />
        <van-field
          v-model="form.phone"
          label="手机号"
          type="tel"
          placeholder="请输入联系手机号"
          :rules="[
            { required: true, message: '请输入手机号' },
            { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' },
          ]"
        />
        <van-field label="性别">
          <template #input>
            <van-radio-group v-model="form.gender" direction="horizontal">
              <van-radio name="male">男</van-radio>
              <van-radio name="female">女</van-radio>
            </van-radio-group>
          </template>
        </van-field>
        <van-field v-model="form.idCard" label="证件号码" placeholder="请输入身份证号" />
        <VantSelectField
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
        <van-field v-model="form.policyNo" label="保单号" placeholder="请输入保单号" />
        <VantSearchField
          v-model="form.insurer"
          :options="insurerOptions"
          label="承保公司"
          title="选择承保公司"
          placeholder="搜索保险公司"
          clearable
        />
        <VantSelectField
          v-model="form.insuranceType"
          :options="insuranceTypes"
          label="险种类型"
          title="选择险种"
          required
          clearable
        />
        <VantSelectMultipleField
          v-model="form.extraCoverage"
          :options="extraOptions"
          label="附加险种"
          title="选择附加险种"
          clearable
        />
        <VantCalendarField
          v-model="form.effectiveDate"
          label="投保日期"
          title="选择投保日期"
          clearable
        />
      </van-cell-group>

      <!-- 出险信息 -->
      <van-cell-group title="出险信息" inset>
        <VantSelectField
          v-model="form.accidentCause"
          :options="accidentCauses"
          label="出险原因"
          title="选择出险原因"
          required
          clearable
        />
        <VantTimePickerField
          v-model="form.accidentDate"
          type="date"
          label="出险日期"
          title="选择出险日期"
          required
          clearable
        />
        <VantTimePickerField
          v-model="form.accidentTime"
          type="time"
          label="出险时间"
          title="选择出险时间"
          clearable
        />
        <VantTreeSelectField
          v-model="form.region"
          :options="regionTree"
          label="出险地区"
          title="选择地区"
          required
          clearable
        />
        <VantSearchField
          v-model="form.hospital"
          :options="hospitalOptions"
          label="就诊医院"
          title="选择就诊医院"
          placeholder="搜索医院"
          clearable
        />
        <VantTreeTagsField
          v-model="form.accidentType"
          :options="accidentTree"
          label="事故类型"
          title="选择事故类型"
          clearable
        />
        <van-field label="是否住院">
          <template #input>
            <van-switch v-model="form.isHospitalized" />
          </template>
        </van-field>
        <van-field label="受伤人数">
          <template #input>
            <van-stepper v-model="form.injuredCount" min="0" max="20" integer />
          </template>
        </van-field>
        <van-field label="事故严重程度">
          <template #input>
            <van-rate v-model="form.severity" :count="5" />
          </template>
        </van-field>
        <VantSelectMultipleField
          v-model="form.lossItems"
          :options="lossOptions"
          label="损失项目"
          title="选择损失项目"
          clearable
        />
        <van-field
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
          v-model="form.idCardFront"
          type="idcard"
          variant="front"
          field
          name="idCardFront"
          label="身份证（人像面）"
          required
          :rules="[{ required: true, message: '请上传身份证人像面' }]"
        />
        <VantUpload
          v-model="form.idCardBack"
          type="idcard"
          variant="back"
          field
          name="idCardBack"
          label="身份证（国徽面）"
          required
          :rules="[{ required: true, message: '请上传身份证国徽面' }]"
        />
        <VantUpload
          v-model="form.driverLicense"
          type="image"
          field
          name="driverLicense"
          label="驾驶证"
          required
          :rules="[{ required: true, message: '请上传驾驶证' }]"
        />
        <VantUpload
          v-model="form.medicalRecord"
          type="image"
          field
          name="medicalRecord"
          label="病历资料"
        />
        <VantUpload
          v-model="form.invoice"
          type="invoice"
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
        <van-cell>
          <van-checkbox v-model="form.agree" shape="square">
            我已阅读并同意《保险报案须知》与《个人信息处理授权》
          </van-checkbox>
        </van-cell>
      </van-cell-group>

      <div class="form-actions">
        <van-button type="default" block @click="clearForm">清空</van-button>
        <van-button type="primary" block native-type="submit">提交报案</van-button>
      </div>
    </van-form>
  </div>
</template>

<style scoped>
.ins-form {
  min-height: 100vh;
  background: #f7f8fa;
  padding-bottom: 24px;
}
.mode-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}
.mode-bar__tip {
  font-size: 13px;
  color: #646566;
}
.form-actions {
  display: flex;
  gap: 12px;
  padding: 16px;
}

/* 报案人原生 van-field clearable 清空图标，与自定义清空图标保持一致 */
.ins-form :deep(.van-field__clear-icon) {
  color: #8a8a8a;
  font-size: 16px;
}
.ins-form :deep(.van-field__clear-icon):active {
  color: #323233;
}
</style>
