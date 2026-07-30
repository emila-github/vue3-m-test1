<script setup lang="ts">
/**
 * 非车待续保跟踪（需求文档 §4.2 `/fcdd-policy-main`）
 * 待续保保单列表（触底加载）→ 详情（保单信息 + 历史反馈）→ 反馈提交。
 */
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showLoadingToast, closeToast } from 'vant'
import VantList from '@/components/VantList.vue'
import type { CrudApi } from '@/composables/useCrudList'
import VantSelectField from '@/components/VantSelectField.vue'
import VantTreeSelectField from '@/components/VantTreeSelectField.vue'
import type { DeptNode } from '@/api/modules/ydl/dict'
import { useYdlDict } from '@/composables/ydl/useYdlDict'
import {
  getYdlFcddList,
  getYdlFcddDetail,
  postYdlFcddFeedback,
  type YdlFcddPolicy,
} from '@/api/modules/ydl/ydl-fcdd'

const router = useRouter()
const { loadDeptTree, loadDictItems } = useYdlDict()

const api: CrudApi<YdlFcddPolicy, any, any> = {
  list: getYdlFcddList,
}

const initialQuery = reactive({
  orgCode: '',
  dayType: '0',
  feedbackflag: '',
  renewalstatus: '',
  policyno: '',
})

const responseMap = { list: 'records', total: 'total', pageSize: 'size' }

// ==================== 下拉选项 ====================
const deptTreeData = ref<DeptNode[]>([])
const dayTypeOptions = ref<{ text: string; value: string }[]>([])
const feedbackOptions = ref<{ text: string; value: string }[]>([])
const renewalOptions = ref<{ text: string; value: string }[]>([])
const reasonOptions = ref<{ text: string; value: string }[]>([])

const dictMaps = reactive<Record<string, Record<string, string>>>({})
async function loadDictMap(type: string) {
  if (dictMaps[type]) return
  try {
    const items = await loadDictItems(type)
    dictMaps[type] = Object.fromEntries(items.map((i) => [String(i.value), i.text]))
  } catch {
    dictMaps[type] = {}
  }
}
function dmap(type: string, v: any): string {
  if (v == null || v === '') return '-'
  return dictMaps[type]?.[String(v)] ?? String(v)
}

// 反馈状态标签样式
function feedbackTag(v: number): string {
  return v === 1 ? '#07c160' : v === 2 ? '#1989fa' : '#c8c9cc'
}
function renewalTag(v: number): string {
  return v === 1 ? '#07c160' : v === 2 ? '#ee0a24' : '#ff976a'
}

onMounted(async () => {
  try {
    const [tree, dt, fb, rn, rs] = await Promise.all([
      loadDeptTree(),
      loadDictItems('FCDD_DAY_TYPE'),
      loadDictItems('FCDD_FEEDBACK_FLAG'),
      loadDictItems('FCDD_RENEWAL_STATUS'),
      loadDictItems('FCDD_REASON'),
    ])
    deptTreeData.value = tree
    dayTypeOptions.value = dt.map((c) => ({ text: c.text, value: c.value }))
    feedbackOptions.value = fb.map((c) => ({ text: c.text, value: c.value }))
    renewalOptions.value = rn.map((c) => ({ text: c.text, value: c.value }))
    reasonOptions.value = rs.map((c) => ({ text: c.text, value: c.value }))
  } catch {
    /* 下拉加载失败不阻塞 */
  }
})

// ==================== 详情 + 反馈 ====================
const detailFull = ref<{ policy: YdlFcddPolicy; feedbackList: any[] } | null>(null)
const fbForm = reactive({ reason: '', content: '', expectDate: '' })
const fbSubmitting = ref(false)

async function onDetail(item: YdlFcddPolicy) {
  detailFull.value = null
  Object.assign(fbForm, { reason: '', content: '', expectDate: '' })
  try {
    detailFull.value = await getYdlFcddDetail(item.id)
  } catch {
    showToast('详情加载失败')
  }
}

async function onSubmitFeedback() {
  if (!fbForm.reason) {
    showToast('请选择反馈原因')
    return
  }
  if (!fbForm.content || fbForm.content.trim().length < 5) {
    showToast('反馈内容至少 5 个字')
    return
  }
  const id = detailFull.value?.policy.id
  if (id == null) return
  fbSubmitting.value = true
  showLoadingToast({ message: '提交中', forbidClick: true })
  try {
    await postYdlFcddFeedback({
      id,
      reason: fbForm.reason,
      content: fbForm.content,
      expectDate: fbForm.expectDate || undefined,
    })
    showToast('反馈提交成功')
    onDetail(detailFull.value!.policy)
  } catch {
    showToast('提交失败')
  } finally {
    fbSubmitting.value = false
    closeToast()
  }
}

const base = (row: YdlFcddPolicy) => [
  { label: '投保人', value: row.appliname },
  { label: '保单号', value: row.policyno },
  { label: '险种', value: row.riskcname },
  { label: '到期时间', value: row.enddate },
  { label: '上年保费', value: '¥' + Number(row.coinsnetpremium).toLocaleString('zh-CN') },
  { label: '反馈状态', value: dmap('FCDD_FEEDBACK_FLAG', row.feedbackflag) },
  { label: '保单状态', value: dmap('FCDD_RENEWAL_STATUS', row.renewalstatus) },
]
</script>

<template>
  <div class="ydl-detail-page">
    <van-nav-bar
      title="非车待续保跟踪"
      class="van-nav-bar--picc-primary"
      left-text="返回"
      left-arrow
      @click-left="router.back()"
    />

    <VantList
      :api="api"
      :title="''"
      :initial-query="initialQuery"
      :response-map="responseMap"
      search-placeholder="搜索保单号"
      keyword-key="policyno"
      :show-add="false"
      :show-edit="false"
      :show-delete="false"
      show-more
      :free-actions="['view']"
      @detail="onDetail"
    >
      <template #filters="{ query }">
        <van-cell-group inset class="f-group">
          <VantTreeSelectField
            v-model="query.orgCode"
            :options="deptTreeData"
            value-key="orgCode"
            label-key="title"
            children-key="children"
            select-parent
            label="分支公司"
            title="选择分支公司"
            placeholder="全部机构"
            clearable
          />
          <VantSelectField
            v-model="query.dayType"
            :options="dayTypeOptions"
            label="到期时间"
            title="选择到期时间类型"
            placeholder="全部"
          />
          <VantSelectField
            v-model="query.feedbackflag"
            :options="feedbackOptions"
            label="反馈状态"
            title="选择反馈状态"
            placeholder="全部"
            clearable
          />
          <VantSelectField
            v-model="query.renewalstatus"
            :options="renewalOptions"
            label="保单状态"
            title="选择保单状态"
            placeholder="全部"
            clearable
          />
          <van-field
            v-model="query.policyno"
            label="保单号"
            placeholder="输入保单号"
            input-align="right"
          />
        </van-cell-group>
      </template>

      <template #item="{ item }">
        <div class="r-head">
          <span class="r-name">{{ item.appliname }}</span>
          <div class="r-tags">
            <van-tag :color="feedbackTag(item.feedbackflag)" text-color="#fff" size="medium">
              {{ dmap('FCDD_FEEDBACK_FLAG', item.feedbackflag) }}
            </van-tag>
            <van-tag :color="renewalTag(item.renewalstatus)" text-color="#fff" size="medium">
              {{ dmap('FCDD_RENEWAL_STATUS', item.renewalstatus) }}
            </van-tag>
          </div>
        </div>
        <div class="r-meta">保单号：{{ item.policyno }}</div>
        <div class="r-meta">险种：{{ item.riskcname }} ｜ 到期：{{ item.enddate }}</div>
        <div class="r-meta">
          上年保费：¥{{ Number(item.coinsnetpremium).toLocaleString('zh-CN') }}
        </div>
      </template>

      <template #detail="{ item }">
        <template v-if="detailFull">
          <van-cell-group inset title="保单信息" class="picc-card">
            <van-cell
              v-for="c in base(detailFull.policy)"
              :key="c.label"
              :title="c.label"
              :value="c.value"
            />
          </van-cell-group>

          <van-cell-group inset title="历史反馈" class="picc-card">
            <van-cell
              v-for="fb in detailFull.feedbackList"
              :key="fb.id"
              :title="dmap('FCDD_REASON', fb.reason)"
              :label="fb.feedbackTime"
              :value="fb.content"
            />
            <van-empty v-if="!detailFull.feedbackList.length" description="暂无反馈记录" />
          </van-cell-group>

          <van-cell-group inset title="填写反馈" class="picc-card">
            <VantSelectField
              v-model="fbForm.reason"
              :options="reasonOptions"
              label="反馈原因"
              title="选择反馈原因"
              placeholder="请选择反馈原因"
            />
            <van-field
              v-model="fbForm.content"
              label="反馈内容"
              type="textarea"
              rows="2"
              autosize
              placeholder="请输入反馈内容（≥5字）"
            />
            <van-field
              v-model="fbForm.expectDate"
              label="预计续保时间"
              placeholder="选填"
              input-align="right"
            />
            <div class="fb-submit">
              <van-button
                type="primary"
                block
                round
                :loading="fbSubmitting"
                @click="onSubmitFeedback"
              >
                提交反馈
              </van-button>
            </div>
          </van-cell-group>
        </template>
        <div v-else class="d-loading"><van-loading size="24">加载中…</van-loading></div>
      </template>
    </VantList>
  </div>
</template>

<style scoped>
.ydl-detail-page {
  min-height: 100vh;
  background: var(--app-bg);
}
.f-group {
  margin: 8px 12px;
}
.r-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.r-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--app-text);
}
.r-tags {
  display: flex;
  gap: 6px;
}
.r-meta {
  font-size: 13px;
  color: var(--app-text-2);
  margin-top: 3px;
}
.fb-submit {
  padding: 14px 4px 4px;
}
.d-loading {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}
</style>
