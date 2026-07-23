<script setup lang="ts">
/**
 * ydl 版 VantList 示例：保源信息维护（车险续保保源管理）
 *
 * 与 src/views/vant/VantListDemo.vue 功能完全一致，但所有接口走 ydl 模块
 * （src/api/modules/ydl/ydl-renewal.ts），对接 JeecgBoot 风格后端：
 *   - 响应包络 { success, code, message, result, timestamp }
 *   - 分页 result { records, current, size, total, pages }
 * 请求分页参数经 VantList requestMap 映射为 current/size 发给 ydl 后端。
 *
 * 查询区域组件、增删改、扩展操作、权限、弹层全部由通用 VantList + useCrudList 承载，
 * 数据模型与接口统一从 @/api 引入，请求经 /ydl-api 由 src/mock/ydl-renewal.ts 拦截。
 */
import { ref } from 'vue'
import { showToast } from 'vant'
import VantList from '@/components/VantList.vue'
import type { ListAction } from '@/components/VantList.vue'
import type { CrudApi } from '@/composables/useCrudList'

// ==================== 数据模型与接口（统一来自 @/api 的 ydl 模块） ====================
import {
  type YdlRenewal,
  type YdlRenewalForm,
  type YdlRenewalQuery,
  YDL_INSURERS,
  YDL_CHANNELS,
  YDL_INSURANCE_TYPE_OPTIONS,
  YDL_STATUS_OPTIONS,
  YDL_ORG_TREE,
  YDL_TAG_TREE,
  YDL_ORG_NAME,
  YDL_DEFAULT_RENEWAL_QUERY,
  YDL_DEFAULT_RENEWAL_FORM,
  getYdlRenewalList,
  createYdlRenewal,
  updateYdlRenewal,
  deleteYdlRenewal,
  searchYdlInsurers,
  verifyYdlApplicant,
  uploadDemoFile,
} from '@/api'

// API 集合：直接指向 ydl 接口函数（请求经 /ydl-api 由 mock 拦截）
const api: CrudApi<YdlRenewal, YdlRenewalForm, YdlRenewalQuery> = {
  list: getYdlRenewalList,
  create: createYdlRenewal,
  update: updateYdlRenewal,
  remove: deleteYdlRenewal,
}

// 初始查询条件 / 新增表单（含全部筛选字段，reset 可复位）
const initialQuery = YDL_DEFAULT_RENEWAL_QUERY
const initialForm = YDL_DEFAULT_RENEWAL_FORM

// 承保公司远程联想（VantSearchField / VantSearch 的 fetch）
const searchInsurer = searchYdlInsurers

// 自定义扩展操作：跟进记录 / 导出（导出需 ydl:export 权限门禁演示）
const actions: ListAction[] = [
  { key: 'follow', name: '登记跟进', icon: 'phone-o' },
  { key: 'export', name: '导出保单', icon: 'down', perm: 'ydl:export' },
]

function onAction(payload: { key: string; item: YdlRenewal }) {
  if (payload.key === 'follow') showToast(`已登记跟进：${payload.item.applicant}`)
  else if (payload.key === 'export') showToast(`导出保单：${payload.item.policyNo}`)
}

// 打开「新增 / 编辑」弹层时重置投保人核验状态，
// 避免沿用上一条记录残留的「已核验」（修复：编辑不同数据时投保人一直保持已核验）。
function onOpenForm() {
  applicantVerified.value = false
  lastVerifiedApplicant.value = ''
}

function statusColor(status: string) {
  return status === '已续保'
    ? '#18a058'
    : status === '待跟进'
      ? '#f59e0b'
      : status === '已流失'
        ? '#969799'
        : '#1989fa'
}

// ==================== 投保人核验（提交前必须核验通过，修正「投保人未验证」） ====================
const applicantVerified = ref(false)
const verifying = ref(false)
const lastVerifiedApplicant = ref('')
// 已有 :rules 时，VantList 的 onFormSubmit 会先 formRef.validate()；
// 投保人未核验则校验不通过，阻断提交。
const applicantRules = [
  { required: true, message: '请输入投保人' },
  {
    validator: () => (applicantVerified.value ? true : '请先核验投保人'),
    message: '请先核验投保人',
  },
]
function onApplicantInput(name: string) {
  // 投保人姓名变更时，已核验状态失效，需重新核验
  if (name !== lastVerifiedApplicant.value) applicantVerified.value = false
}
async function verifyApplicantHandler(name: string) {
  if (!name) {
    showToast('请先输入投保人')
    return
  }
  verifying.value = true
  try {
    const res = await verifyYdlApplicant(name)
    if (res?.verified) {
      applicantVerified.value = true
      lastVerifiedApplicant.value = name
      showToast('投保人核验通过')
    } else {
      applicantVerified.value = false
      lastVerifiedApplicant.value = ''
      showToast('未找到该投保人，请确认姓名')
    }
  } finally {
    verifying.value = false
  }
}
// 提交前强校验门禁（独立于 Vant 字段注册，确保「投保人未填写 / 未核验」必被拦截，
// 修正「投保人未空直接提交」）：返回 false 即阻断提交。
function onBeforeSubmit(f: Record<string, any>) {
  if (!f.applicant || !String(f.applicant).trim()) {
    showToast('请输入投保人')
    return false
  }
  if (!applicantVerified.value) {
    showToast('请先核验投保人')
    return false
  }
  return true
}

// ==================== 附件上传：先上传图片，回传预览地址，再随表单提交地址 ====================
// 上传成功后写入表单的字段：默认 url（/demo-upload/xxx），可切换为 base64 / fileName
const uploadResultField = ref<'url' | 'base64' | 'fileName'>('url')

/** File → base64（与驾驶证图片上传方式一致） */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve((e.target?.result as string) || '')
    reader.onerror = () => reject(new Error('读取失败'))
    reader.readAsDataURL(file)
  })
}
/** 上传适配器：供 VantUpload 的 :upload 使用，返回完整结果（含 url / base64 / fileName） */
async function uploadRenewalFile(file: File): Promise<Record<string, any>> {
  const base64 = await fileToBase64(file)
  // 走项目标准上传：写入 src/assets/demo-upload，返回 /demo-upload/xxx 预览地址
  return uploadDemoFile({ fileName: file.name || 'image.png', base64, type: 'image' })
}
</script>

<template>
  <VantList
    :api="api"
    title="保源信息维护（ydl 格式）"
    permission-prefix="ydl"
    :row-permission="
      (item) => ({
        edit: item.status !== '已续保', // 已续保的不允许编辑
        delete: item.id % 7 !== 0, // 模拟部分记录不可删
        view: true, // 详情始终按角色权限
      })
    "
    :initial-query="initialQuery"
    :initial-form="initialForm"
    :before-submit="onBeforeSubmit"
    :enable-log="true"
    more-filter-title="更多查询（组件全接入）"
    search-placeholder="搜索投保人 / 车牌 / 保单号"
    keyword-key="keyword"
    :request-map="{ page: 'current', pageSize: 'size' }"
    :actions="actions"
    :show-more="true"
    @action="onAction"
    @create="onOpenForm"
    @edit="onOpenForm"
  >
    <!-- ==================== 查询区域：全部组件接入 ==================== -->
    <template #filters="{ query }">
      <!-- VantSearch：投保人/承保公司 联想搜索 -->
      <div class="f-block">
        <div class="f-label">承保公司联想（VantSearch）</div>
        <VantSearch
          :fetch="searchInsurer"
          placeholder="输入公司名联想，如「人保」"
          @select="(v: string | number) => (query.insurer = String(v))"
        />
      </div>

      <van-cell-group inset class="f-group">
        <!-- 原生 van-field 文本 -->
        <van-field
          v-model="query.policyNo"
          label="保单号"
          placeholder="按保单号精确/模糊查询"
          clearable
        />

        <!-- VantSearchField：表单内可搜索下拉（承保公司） -->
        <VantSearchField
          v-model="query.insurer"
          :fetch="searchInsurer"
          label="承保公司"
          title="选择承保公司"
          placeholder="搜索并选择承保公司"
          clearable
        />

        <!-- VantSelectField：保源状态 -->
        <VantSelectField
          v-model="query.status"
          :options="YDL_STATUS_OPTIONS"
          label="保源状态"
          title="选择状态"
          placeholder="请选择状态"
        />

        <!-- VantSelectField：业务渠道 -->
        <VantSelectField
          v-model="query.channel"
          :options="YDL_CHANNELS"
          label="业务渠道"
          title="选择渠道"
          placeholder="请选择渠道"
          clearable
        />

        <!-- VantSelectMultipleField：险种多选 -->
        <VantSelectMultipleField
          v-model="query.insuranceTypes"
          :options="YDL_INSURANCE_TYPE_OPTIONS"
          label="投保险种"
          title="选择险种（多选）"
          placeholder="可多选险种"
          clearable
        />

        <!-- VantTreeSelectField：归属机构（级联单选） -->
        <VantTreeSelectField
          v-model="query.region"
          :options="YDL_ORG_TREE"
          label="归属机构"
          title="选择机构"
          placeholder="选择归属机构"
          clearable
        />

        <!-- VantTreeTagsField：业务标签（树多选打标签） -->
        <VantTreeTagsField
          v-model="query.tags"
          :options="YDL_TAG_TREE"
          label="业务标签"
          title="选择标签"
          placeholder="选择业务标签"
          clearable
        />

        <!-- VantCalendarField：到期日区间 -->
        <VantCalendarField
          v-model="query.expireRange"
          type="range"
          label="到期区间"
          title="选择到期日区间"
          placeholder="选择保单到期日区间"
        />

        <!-- VantTimePickerField：跟进账期（年月） -->
        <VantTimePickerField
          v-model="query.followMonth"
          type="year-month"
          label="跟进账期"
          title="选择账期"
          placeholder="选择跟进账期"
          clearable
        />

        <!-- 原生 van-field 数字：保费下限 -->
        <van-field
          v-model="query.premiumMin"
          type="digit"
          label="保费下限"
          placeholder="保费≥（元）"
          input-align="right"
          clearable
        />
      </van-cell-group>

      <!-- 原生表单控件组合 -->
      <van-cell-group inset class="f-group">
        <!-- van-radio 是否新车 -->
        <div class="f-row">
          <span class="f-row-label">是否新车</span>
          <van-radio-group v-model="query.isNew" direction="horizontal">
            <van-radio name="" icon-size="16px">不限</van-radio>
            <van-radio name="新车" icon-size="16px">新车</van-radio>
            <van-radio name="旧车" icon-size="16px">旧车</van-radio>
          </van-radio-group>
        </div>

        <!-- van-stepper 跟进次数下限 -->
        <div class="f-row">
          <span class="f-row-label">跟进次数≥</span>
          <van-stepper v-model="query.followCountMin" :min="0" :max="6" />
        </div>

        <!-- van-rating 客户等级下限 -->
        <div class="f-row">
          <span class="f-row-label">客户等级≥</span>
          <van-rate v-model="query.levelMin" :count="5" size="18" />
        </div>

        <!-- van-switch 仅看临期 -->
        <div class="f-row">
          <span class="f-row-label">仅看临期</span>
          <van-switch v-model="query.onlyExpiring" size="20" />
        </div>

        <!-- van-slider 保费上限 -->
        <div class="f-row f-row--column">
          <span class="f-row-label">保费上限：¥{{ query.premiumMax }}</span>
          <van-slider v-model="query.premiumMax" :min="1000" :max="20000" :step="500" />
        </div>
      </van-cell-group>
    </template>

    <!-- ==================== 列表行 ==================== -->
    <template #item="{ item }">
      <div class="r-row">
        <span class="r-name">{{ item.applicant }}</span>
        <van-tag :color="statusColor(item.status)" text-color="#fff" size="medium">
          {{ item.status }}
        </van-tag>
      </div>
      <div class="r-meta">
        <span>{{ item.plateNo }}</span>
        <span class="r-sep">|</span>
        <span>{{ item.insurer }}</span>
        <span class="r-sep">|</span>
        <span>{{ YDL_ORG_NAME[item.region] || item.region }}</span>
      </div>
      <div class="r-meta">
        <span class="r-policy">{{ item.policyNo }}</span>
        <span class="r-premium">¥{{ item.premium }}</span>
      </div>
      <div class="r-meta">
        <van-icon name="clock-o" />
        <span>到期 {{ item.expireDate }}</span>
        <span class="r-sep">|</span>
        <span>{{ item.channel }}</span>
        <span class="r-sep">|</span>
        <span>已跟进 {{ item.followCount }} 次</span>
      </div>
      <div class="r-types">
        <van-tag v-for="t in item.insuranceTypes" :key="t" plain type="primary">
          {{ t }}
        </van-tag>
      </div>
    </template>

    <!-- ==================== 新增/编辑 表单 ==================== -->
    <template #form="{ form }">
      <van-cell-group inset class="picc-card">
        <van-field
          v-model="form.applicant"
          name="applicant"
          label="投保人"
          placeholder="请输入投保人"
          required
          clearable
          :rules="applicantRules"
          @input="onApplicantInput(form.applicant)"
        >
          <template #button>
            <van-button
              size="small"
              type="primary"
              :loading="verifying"
              :disabled="applicantVerified"
              @click="verifyApplicantHandler(form.applicant)"
            >
              {{ applicantVerified ? '已核验' : '核验' }}
            </van-button>
          </template>
        </van-field>
        <van-tag v-if="applicantVerified" type="success" class="applicant-verified">
          ✓ 投保人已核验
        </van-tag>
        <van-field v-model="form.plateNo" label="车牌号" placeholder="如 浙A·88888" clearable />
        <van-field v-model="form.policyNo" label="保单号" placeholder="请输入保单号" clearable />
        <VantSearchField
          v-model="form.insurer"
          :fetch="searchInsurer"
          label="承保公司"
          title="选择承保公司"
          placeholder="搜索并选择承保公司"
          clearable
        />
        <VantTreeSelectField
          v-model="form.region"
          :options="YDL_ORG_TREE"
          label="归属机构"
          title="选择机构"
          placeholder="选择归属机构"
        />
        <VantSelectField
          v-model="form.channel"
          :options="YDL_CHANNELS"
          label="业务渠道"
          title="选择渠道"
          placeholder="请选择渠道"
        />
        <VantSelectMultipleField
          v-model="form.insuranceTypes"
          :options="YDL_INSURANCE_TYPE_OPTIONS"
          label="投保险种"
          title="选择险种（多选）"
          placeholder="可多选险种"
        />
        <VantTreeTagsField
          v-model="form.tags"
          :options="YDL_TAG_TREE"
          label="业务标签"
          title="选择标签"
          placeholder="选择业务标签"
        />
        <VantCalendarField
          v-model="form.expireDate"
          label="到期日"
          title="选择到期日"
          placeholder="选择保单到期日"
        />
        <van-field label="保费（元）">
          <template #input>
            <van-stepper v-model="form.premium" :min="0" :step="100" />
          </template>
        </van-field>
        <div class="f-row">
          <span class="f-row-label">客户等级</span>
          <van-rate v-model="form.level" :count="5" size="20" />
        </div>
        <div class="f-row">
          <span class="f-row-label">保源状态</span>
          <van-radio-group v-model="form.status" direction="horizontal">
            <van-radio name="待跟进">待跟进</van-radio>
            <van-radio name="已联系">已联系</van-radio>
            <van-radio name="已续保">已续保</van-radio>
          </van-radio-group>
        </div>
        <van-field
          v-model="form.remark"
          label="备注"
          type="textarea"
          rows="2"
          autosize
          placeholder="填写跟进备注"
        />
      </van-cell-group>

      <!-- VantUpload：附件上传（证件/凭证），先上传图片拿回预览地址，再随表单提交地址 -->
      <van-cell-group inset class="picc-card">
        <div class="f-upload-title">保单/证件附件（VantUpload，先上传后提交地址）</div>
        <div class="f-row">
          <span class="f-row-label">保存字段</span>
          <van-radio-group v-model="uploadResultField" direction="horizontal">
            <van-radio name="url" icon-size="16px">url</van-radio>
            <van-radio name="base64" icon-size="16px">base64</van-radio>
            <van-radio name="fileName" icon-size="16px">fileName</van-radio>
          </van-radio-group>
        </div>
        <VantUpload
          v-model="form.attach"
          type="image"
          multiple
          :max-count="6"
          :upload="uploadRenewalFile"
          :result-field="uploadResultField"
        />
      </van-cell-group>
    </template>

    <!-- ==================== 详情 ==================== -->
    <template #detail="{ item }">
      <van-cell-group inset>
        <van-cell title="投保人" :value="item.applicant" />
        <van-cell title="车牌号" :value="item.plateNo" />
        <van-cell title="保单号" :value="item.policyNo" />
        <van-cell title="承保公司" :value="item.insurer" />
        <van-cell title="归属机构" :value="YDL_ORG_NAME[item.region] || item.region" />
        <van-cell title="业务渠道" :value="item.channel" />
        <van-cell title="投保险种" :value="item.insuranceTypes.join('、')" />
        <van-cell title="保费" :value="`¥${item.premium}`" />
        <van-cell title="到期日" :value="item.expireDate" />
        <van-cell title="客户等级">
          <van-rate :model-value="item.level" :count="5" size="16" readonly />
        </van-cell>
        <van-cell title="保源状态">
          <van-tag :color="statusColor(item.status)" text-color="#fff" size="medium">
            {{ item.status }}
          </van-tag>
        </van-cell>
      </van-cell-group>
    </template>
  </VantList>

  <div class="usage-page">
    <div class="section-title">使用说明</div>
    <div class="card" style="margin: 0 12px 16px">
      <p class="hint">
        <b>基础用法（ydl 模块）</b><br />
        <code>&lt;VantList :api="api" permission-prefix="ydl"&gt;</code><br />
        <code>&nbsp;&nbsp;&lt;template #item="{ item }"&gt;...&lt;/template&gt;</code><br />
        <code>&lt;/VantList&gt;</code>
      </p>
      <p class="hint">
        本页所有接口走 ydlClient（baseURL=/ydl-api），后端为 JeecgBoot 风格：<br />
        响应包络 <code>{ success, code, message, result, timestamp }</code>， 分页
        <code>result = { records, current, size, total, pages }</code>。<br />
        列表接口经 ydlPagination 适配器转回通用 PageResult，VantList 无需感知后端差异。
      </p>
      <p class="hint">
        <b>主要 Props</b><br />
        api：CrudApi 集合（list 必填，create/update/remove 缺省则对应功能不可用）<br />
        permissionPrefix / permissionActions：权限前缀与自定义操作码<br />
        showSearch / showAdd / showDetail / showEdit / showDelete / showMore / keywordKey / filters
        / actions<br />
        rowPermission(item)：行级自定义权限（与角色权限做「与」）<br />
        responseMap / requestMap：适配异构后端字段命名
      </p>
      <p class="hint">
        <b>插槽</b>：#item #filters #form #detail #row-actions ｜ <b>事件</b>：create / edit /
        detail / action
      </p>
    </div>
  </div>
</template>

<style scoped>
/* 查询区域 */
.f-block {
  padding: 8px 4px 4px;
}
.f-label,
.f-upload-title {
  font-size: 13px;
  font-weight: 600;
  color: #323233;
  padding: 8px 12px 6px;
}
.f-group {
  margin: 8px 0;
}
.f-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #f5f5f5;
}
.f-row:last-child {
  border-bottom: none;
}
.f-row--column {
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
}
.f-row-label {
  font-size: 14px;
  color: #323233;
  min-width: 76px;
}
.applicant-verified {
  margin: 0 16px 8px;
}

/* 列表行 */
.r-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.r-name {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
}
.r-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666;
  margin-top: 4px;
}
.r-sep {
  color: #dcdee0;
}
.r-policy {
  color: #1989fa;
}
.r-premium {
  margin-left: auto;
  color: #d71920;
  font-weight: 600;
}
.r-types {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.usage-page {
  background: #f7f8fa;
  padding: 0 0 24px;
}
.usage-page .section-title {
  font-size: 14px;
  font-weight: 600;
  color: #323233;
  margin: 18px 12px 8px;
}
.usage-page .card {
  background: #fff;
  border-radius: 12px;
  padding: 4px 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}
.usage-page .hint {
  font-size: 12px;
  color: #969799;
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
