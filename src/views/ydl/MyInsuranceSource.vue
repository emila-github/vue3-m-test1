<script setup lang="ts">
/**
 * 我的保源（MyInsuranceSource）—— ydl 模块列表页
 *
 * 基于通用 VantList 组件构建，新增 / 编辑 / 删除 全部复用 VantList 内置能力：
 *   - 列表分页触底加载（records/total/size → responseMap 解析）
 *   - 高级搜索：客户名称关键字 + 我的 / 近期 / 待点评 + 更新时间区间
 *   - 行内「编辑」：VantList 内置 openEdit 直接把列表项回填表单（productLine / customerLabel 以数组携带）
 *   - 行内「新增」：VantList 内置 FAB + openCreate
 *   - 新增 / 编辑 表单：通过 #form 插槽提供，提交由 api.create / api.update 完成，提交后自动刷新列表
 *   - 挂载时团队校验，无团队弹窗提示
 *
 * 数据模型 / 接口统一来自 @/api（ydl-my-insurance-source 模块），
 * mock 模式下经 /ydl-api 前缀由 src/mock/ydl-my-insurance-source.ts 拦截。
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showDialog, showToast } from 'vant'
import VantList from '@/components/VantList.vue'
import type { CrudApi } from '@/composables/useCrudList'
import {
  type YdlInsSource,
  type YdlInsSourceForm,
  type YdlInsSourceQuery,
  type YdlInsSourceDetail,
  type YdlOption,
  type YdlDuplicateItem,
  getYdlInsSourceList,
  getYdlInsSourceDetail,
  checkYdlUserGroup,
  ydlWaitCommentsText,
  getYdlProductLineTypes,
  getYdlLabelTypePullDownAll,
  checkYdlInsSourceName,
  addYdlInsSource,
  updateYdlInsSource,
} from '@/api'

// ==================== API 集合（列表 + 新增 + 编辑，全部交给 VantList 内置处理） ====================
const api: CrudApi<YdlInsSource, YdlInsSourceForm, YdlInsSourceQuery> = {
  list: getYdlInsSourceList,
  create: addYdlInsSource,
  update: updateYdlInsSource,
}

// 初始查询条件（含全部筛选字段，reset 可复位）
const initialQuery: YdlInsSourceQuery = {
  customerName: '',
  isSelf: false, // 只显示本人保源
  isNear: true, // 近期代办
  isWaitComments: 0, //待点评  1 勾选 0 不勾选
  updateTimeRange: [],
}

// 新增 / 编辑 表单初始值（openCreate 时 reset 用）
const initialForm: YdlInsSourceForm = {
  socialCreditCode: '',
  customerName: '',
  customerAddress: '',
  contactsName: '',
  contactsPhone: '',
  productLine: [],
  customerLabel: [],
}

// 列表分页字段映射：ydl 返回 records/total/size
const responseMap = { list: 'records', total: 'total', pageSize: 'size' }

// ==================== 更多项：活动量 / 销售结果（按 sourceId 跳转子功能页） ====================
const router = useRouter()
const moreActions = [
  { key: 'active', name: '活动量', icon: 'notes-o' },
  { key: 'result', name: '销售结果', icon: 'gold-coin-o' },
]
function onAction({ key, item }: { key: string; item: YdlInsSource }) {
  const query = { sourceId: item.id, name: item.customerName }
  if (key === 'active') router.push({ path: '/ydl/my-insurance-active', query })
  else if (key === 'result') router.push({ path: '/ydl/my-insurance-result', query })
}

// ==================== 待点评标签样式 ====================
// 更新时间最早可选：3 年前（避免选到过久的历史日期）
const minUpdateDate = computed(() => {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 3)
  return d
})
function waitTagColor(v: number): string {
  return v === 1 ? '#f59e0b' : v === 2 ? '#07c160' : '#c8c9cc'
}

// ==================== 详情：按 id 拉取完整信息 ====================
const detailFull = ref<YdlInsSourceDetail | null>(null)
const detailLoading = ref(false)
async function onDetail(item: YdlInsSource) {
  detailFull.value = null
  detailLoading.value = true
  try {
    detailFull.value = await getYdlInsSourceDetail(item.id)
  } catch {
    showToast('详情加载失败')
  } finally {
    detailLoading.value = false
  }
}

// ==================== 表单内：下拉选项 + 重名检测 ====================
const productLineOptions = ref<YdlOption[]>([])
const labelOptions = ref<YdlOption[]>([])
const duplicateList = ref<YdlDuplicateItem[]>([])

// 提交前强校验（独立于 van-field :rules，保证数组字段必填 / 名称长度约束）
function beforeSubmit(f: Record<string, any>) {
  if (!f.productLine || !f.productLine.length) {
    showToast('请至少选择一条产品线')
    return false
  }
  if (f.customerName && f.customerName.trim().length < 5) {
    showToast('客户名称至少 5 个字符')
    return false
  }
  return true
}

// 客户名称失焦：重名检测（疑似重复则提示，由用户自行确认是否继续）
function onNameBlur(name: string) {
  const v = (name || '').trim()
  if (v.length < 2) {
    duplicateList.value = []
    return
  }
  checkYdlInsSourceName(v)
    .then((list) => {
      duplicateList.value = Array.isArray(list) ? list : []
    })
    .catch(() => {
      duplicateList.value = []
    })
}

// ==================== 挂载：团队校验 + 加载下拉选项 ====================
onMounted(async () => {
  try {
    const [hasGroup, pl, lb] = await Promise.all([
      checkYdlUserGroup(),
      getYdlProductLineTypes(),
      getYdlLabelTypePullDownAll(),
    ])
    productLineOptions.value = pl
    labelOptions.value = lb
    if (!hasGroup) {
      showDialog({ title: '提示', message: '您当前不属于任何团队，请联系管理员开通后再使用。' })
    }
  } catch {
    // 校验 / 下拉失败静默处理，不阻塞列表
  }
})
</script>

<template>
  <div class="ydl-is-page">
    <VantList
      :api="api"
      title="我的保源"
      permission-prefix="ydl"
      :initial-query="initialQuery"
      :initial-form="initialForm"
      :response-map="responseMap"
      keyword-key="customerName"
      search-placeholder="搜索客户名称"
      more-filter-title="高级搜索"
      add-text="新增保源"
      :free-actions="['create']"
      :show-delete="false"
      :before-submit="beforeSubmit"
      show-more
      :actions="moreActions"
      @detail="onDetail"
      @action="onAction"
    >
      <!-- ==================== 高级搜索 ==================== -->
      <template #filters="{ query }">
        <van-cell-group inset class="f-group">
          <div class="f-row">
            <span class="f-row-label">我的</span>
            <van-switch v-model="query.isSelf" size="20" />
          </div>
          <div class="f-row">
            <span class="f-row-label">近期</span>
            <van-switch v-model="query.isNear" size="20" />
          </div>
          <div class="f-row">
            <span class="f-row-label">待点评</span>
            <van-switch
              v-model="query.isWaitComments"
              :active-value="1"
              :inactive-value="0"
              size="20"
            />
          </div>

          <!-- 近期开启时隐藏时间区间（自动按本周一~本周日） -->
          <VantCalendarField
            v-if="!query.isNear"
            v-model="query.updateTimeRange"
            type="range"
            label="更新时间"
            title="选择更新时间区间"
            placeholder="选择更新时间区间"
            :min-date="minUpdateDate"
          />
          <div v-else class="f-tip">「近期」已开启：按本周一 ~ 本周日筛选</div>
        </van-cell-group>
      </template>

      <!-- ==================== 列表行 ==================== -->
      <template #item="{ item }">
        <div class="r-row">
          <span class="r-name">{{ item.customerName }}</span>
          <van-tag
            v-if="item.waitComments === 1 || item.waitComments === 2"
            :color="waitTagColor(item.waitComments)"
            text-color="#fff"
            size="medium"
          >
            {{ ydlWaitCommentsText(item.waitComments) }}
          </van-tag>
        </div>
        <div v-if="item.customerAddress" class="r-meta">
          <van-icon name="location-o" />
          <span>{{ item.customerAddress }}</span>
        </div>
        <div v-if="item.contactsName" class="r-meta">
          <van-icon name="contact" />
          <span>{{ item.contactsName }}</span>
        </div>
        <div v-if="item.contactsPhone" class="r-meta">
          <van-icon name="phone-o" />
          <a class="r-tel" :href="`tel:${item.contactsPhone}`" @click.stop>{{
            item.contactsPhone
          }}</a>
        </div>
        <div class="r-meta r-time">
          <van-icon name="clock-o" />
          <span>更新 {{ item.updateTime }}</span>
        </div>
      </template>

      <!-- ==================== 新增 / 编辑 表单（VantList 内置弹层） ==================== -->
      <template #form="{ form }">
        <van-cell-group inset class="picc-card">
          <van-field
            v-model="form.socialCreditCode"
            label="信用代码"
            placeholder="请输入统一社会信用码"
            :rules="[{ required: true, message: '请填写统一社会信用码' }]"
          />
          <van-field
            v-model="form.customerName"
            label="客户名称"
            placeholder="请输入客户名称（≥5字）"
            :rules="[{ required: true, message: '请填写客户名称' }]"
            @blur="onNameBlur(form.customerName)"
          />
          <van-field
            v-model="form.customerAddress"
            label="客户地址"
            placeholder="请输入客户地址"
            :rules="[{ required: true, message: '请填写客户地址' }]"
          />
          <van-field
            v-model="form.contactsName"
            label="联系人"
            placeholder="请输入联系人"
            :rules="[{ required: true, message: '请填写联系人' }]"
          />
          <van-field
            v-model="form.contactsPhone"
            label="联系电话"
            placeholder="请输入联系电话"
            :rules="[{ required: true, message: '请填写联系电话' }]"
          />
        </van-cell-group>

        <!-- 重名提示 -->
        <van-notice-bar
          v-if="duplicateList.length"
          class="ae-notice"
          color="#ad0000"
          background="#ffe1e1"
          left-icon="warning-o"
          :scrollable="false"
        >
          <div>疑似重复保源，已收录：</div>
          <div v-for="(d, i) in duplicateList" :key="i" class="ae-dup">
            {{ d.departName }} / {{ d.taskUserRealName }}
          </div>
        </van-notice-bar>

        <van-cell-group inset title="产品线（必选）" class="picc-card">
          <VantSelectMultipleField
            v-model="form.productLine"
            :options="productLineOptions"
            value-key="id"
            label-key="name"
            label="产品线"
            title="选择产品线"
            placeholder="请选择产品线"
            required
          />
        </van-cell-group>

        <van-cell-group inset title="保源标签（最多 2 个）" class="picc-card">
          <VantSelectMultipleField
            v-model="form.customerLabel"
            :options="labelOptions"
            value-key="id"
            label-key="name"
            label="保源标签"
            title="选择保源标签"
            placeholder="请选择保源标签"
            :max="2"
          />
        </van-cell-group>
      </template>

      <!-- ==================== 详情 ==================== -->
      <template #detail>
        <div v-if="detailLoading" class="d-loading">
          <van-loading size="24">加载中...</van-loading>
        </div>
        <template v-else-if="detailFull">
          <van-cell-group inset title="基础信息">
            <van-cell title="统一社会信用码" :value="detailFull.socialCreditCode" />
            <van-cell title="客户名称" :value="detailFull.customerName" />
            <van-cell title="客户地址" :value="detailFull.customerAddress" />
            <van-cell title="行业类型" :value="detailFull.industryTypeName" />
            <van-cell title="注册资本" :value="detailFull.registerCapital" />
            <van-cell title="单位电话" :value="detailFull.companyPhone" />
            <van-cell title="联系人部门" :value="detailFull.contactsDepartment" />
            <van-cell title="联系人职务" :value="detailFull.contactsPosition" />
            <van-cell title="联系人名称" :value="detailFull.contactsName" />
            <van-cell title="联系人电话">
              <a class="r-tel" :href="`tel:${detailFull.contactsPhone}`">{{
                detailFull.contactsPhone
              }}</a>
            </van-cell>
          </van-cell-group>

          <van-cell-group inset title="产品与险种">
            <van-cell title="产品线" :value="detailFull.productLineStr" />
            <van-cell
              title="保源标签"
              :value="detailFull.labelList.map((l) => l.labelName).join('，')"
            />
            <van-cell title="已保险种" :value="detailFull.yriskyTypeStr" />
            <van-cell v-if="detailFull.remark" title="备注" :value="detailFull.remark" />
          </van-cell-group>

          <van-cell-group inset title="推荐险种">
            <van-cell
              v-for="r in detailFull.recommends"
              :key="r.id"
              :title="r.riskyName"
              :value="`¥${r.fee}`"
            />
            <van-empty v-if="!detailFull.recommends.length" description="暂无推荐险种" />
          </van-cell-group>
        </template>
      </template>
    </VantList>
  </div>
</template>

<style scoped>
/* 高级搜索 */
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
.f-row-label {
  font-size: 14px;
  color: #323233;
  min-width: 76px;
}
.f-tip {
  padding: 12px 16px;
  font-size: 12px;
  color: #969799;
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
.r-time {
  color: #969799;
}
.r-tel {
  color: #1989fa;
}

/* 详情 */
.d-loading {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}

/* 新增 / 编辑 表单：重名提示 */
.ae-notice {
  margin: 8px 12px;
  border-radius: 8px;
}
.ae-dup {
  font-size: 12px;
  line-height: 18px;
}
</style>
