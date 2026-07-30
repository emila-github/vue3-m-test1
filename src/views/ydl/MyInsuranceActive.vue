<script setup lang="ts">
/**
 * 活动量（MyInsuranceActive）—— ydl 模块 / 我的保源详情子功能
 *
 * 对应需求文档：md/v2/Vue3重构需求文档.md §4.1.2 活动量（原名称不得改）
 * 入口：MyInsuranceSource 列表「更多项 → 活动量」按 sourceId 跳转（route query: sourceId / name）。
 *
 * 行内「更多」操作（文档 4.1.2 左滑）：
 *   · 点评   权限 visitTracks:comments（领导）→ 4.1.5 点评弹层
 *   · 详情   权限 visitTracks:comments（业务员）→ 录入表单只读展示
 *   · 编辑   权限 visitTracks:edit，仅本人(isSelfData)可见 → 4.1.4 录入表单
 *   · 删除   权限 visitTracks:delete，仅本人(isSelfData)可见
 * 列表排序固定 updateTime desc（文档约定）。
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { showToast } from 'vant'
import VantList from '@/components/VantList.vue'
import VantSelectField from '@/components/VantSelectField.vue'
import VantTimePickerField from '@/components/VantTimePickerField.vue'
import VantTreeSelectField from '@/components/VantTreeSelectField.vue'
import VantUpload from '@/components/VantUpload.vue'
import type { CrudApi } from '@/composables/useCrudList'
import type {
  YdlVisitTrack,
  YdlVisitTrackForm,
  YdlVisitTrackQuery,
} from '@/api/modules/ydl/ydl-my-insurance-detail'
import type { RiskTypeNode } from '@/api/modules/ydl/dict'
import { getRiskTypeTree } from '@/api/modules/ydl/dict'
import {
  getYdlVisitTracks,
  addYdlVisitTrack,
  updateYdlVisitTrack,
  deleteYdlVisitTrack,
  updateYdlVisitTrackComments,
  YDL_VISIT_TYPE,
  YDL_VISIT_PROCESS,
  YDL_COMMENT_LEVEL,
  YDL_BUSSINESS_BELONG,
  ydlCommentColor,
} from '@/api/modules/ydl/ydl-my-insurance-detail'

const route = useRoute()
const sourceId = computed(() => (route.query.sourceId as string) || '')
const custName = computed(() => (route.query.name as string) || '')

// ==================== API 集合（注入固定 sourceId，其余交给 VantList 内置处理） ====================
const api: CrudApi<YdlVisitTrack, YdlVisitTrackForm, YdlVisitTrackQuery> = {
  list: (p) => getYdlVisitTracks({ ...p, sourceId: sourceId.value }),
  create: addYdlVisitTrack,
  update: updateYdlVisitTrack,
  remove: deleteYdlVisitTrack,
}

const responseMap = { list: 'records', total: 'total', pageSize: 'size' }

const initialForm: YdlVisitTrackForm = {
  sourceId: sourceId.value,
  visitTypeCode: null,
  visitProcess: null,
  visitTime: '',
  remark: '',
  commentsLv: null,
  comments: '',
  mriskTypeCode: '',
  signInImgUrl: '',
  signInPosAddr: '',
  bussinessBelong: null,
  bussinessBelongOther: '',
  insuranceCondition: '',
  planDate: '',
  planAmount: '',
  planSumamount: '',
  continueFlag: 1,
  upFlag: 'N',
  upContent: '',
  targetName: '',
  targetPosition: '',
  targetPhone: '',
  nextVisitTime: '',
}

// 下拉选项
const visitTypeOptions = Object.entries(YDL_VISIT_TYPE).map(([value, text]) => ({
  text,
  value: Number(value),
}))
const visitProcessOptions = Object.entries(YDL_VISIT_PROCESS).map(([value, text]) => ({
  text,
  value: Number(value),
}))
const commentLevelOptions = Object.entries(YDL_COMMENT_LEVEL).map(([value, text]) => ({
  text,
  value: Number(value),
}))
const businessBelongOptions = Object.entries(YDL_BUSSINESS_BELONG).map(([value, text]) => ({
  text,
  value: Number(value),
}))

// ==================== 目标险种树（arch/riskType/tree） ====================
const riskTypeTree = ref<RiskTypeNode[]>([])
onMounted(async () => {
  try {
    riskTypeTree.value = await getRiskTypeTree()
  } catch {
    riskTypeTree.value = []
  }
})
// 按 value 反查完整路径文本（如「责任险 / 雇主责任险」），用于详情回显
function findRiskTypePath(value?: string): string {
  if (!value) return ''
  const path: string[] = []
  const walk = (nodes: RiskTypeNode[]): boolean => {
    for (const n of nodes) {
      if (n.value === value) {
        path.push(n.title)
        return true
      }
      const children = n.children
      if (Array.isArray(children) && children.length && walk(children)) {
        path.unshift(n.title)
        return true
      }
    }
    return false
  }
  walk(riskTypeTree.value)
  return path.join(' / ')
}

// ==================== 行内展示辅助 ====================
function isDoorVisit(item: YdlVisitTrack) {
  return item.visitTypeCode === 2
}
// 打卡状态：上门且 signInImgUrl + signInPosAddr 齐全 → 打卡成功，否则待打卡
function signInStatus(item: YdlVisitTrack): string {
  return item.signInImgUrl && item.signInPosAddr ? '打卡成功' : '待打卡'
}

// ==================== 提交前强校验（独立于 van-field :rules） ====================
function beforeSubmit(f: Record<string, any>) {
  f.sourceId = sourceId.value
  if (f.visitTypeCode == null) return (showToast('请选择拜访类型'), false)
  // 拜访凭证（电话/微信 0/1）或 拍照打卡（上门 2）必传
  if (f.visitTypeCode === 2) {
    if (!f.signInImgUrl) return (showToast('请拍照打卡'), false)
  } else if (!f.signInImgUrl) {
    return (showToast('请上传拜访凭证'), false)
  }
  if (f.visitProcess == null) return (showToast('请选择拜访进程'), false)
  if (!f.targetName || !f.targetName.trim()) return (showToast('请填写拜访对象'), false)
  if (!f.targetPosition || !f.targetPosition.trim()) return (showToast('请填写拜访对象职务'), false)
  if (!f.targetPhone || !f.targetPhone.trim()) return (showToast('请填写拜访对象联系方式'), false)
  if (!f.remark || f.remark.trim().length < 20) return (showToast('拜访情况不少于 20 字'), false)
  if (f.upFlag === 'Y' && (!f.upContent || f.upContent.trim().length < 10))
    return (showToast('上级支持内容不少于 10 字'), false)
  return true
}

// ==================== 行内「更多」操作（点评 / 详情） ====================
const activeActions = [
  { key: 'comment', name: '点评', icon: 'comment-o', perm: 'visitTracks:comments' },
  { key: 'detail', name: '详情', icon: 'eye-o', perm: 'visitTracks:comments' },
]
const commentVisible = ref(false)
const commentForm = ref<{
  id: string
  comments: string
  commentsLv: number | null
  nextVisitTime: string
}>({
  id: '',
  comments: '',
  commentsLv: null,
  nextVisitTime: '',
})
const detailVisible = ref(false)
const detailItem = ref<YdlVisitTrack | null>(null)

function onAction({ key, item }: { key: string; item: YdlVisitTrack }) {
  if (key === 'comment') {
    commentForm.value = {
      id: item.id,
      comments: item.comments || '',
      commentsLv: item.commentsLv || null,
      nextVisitTime: item.nextVisitTime || '',
    }
    commentVisible.value = true
  } else if (key === 'detail') {
    detailItem.value = item
    detailVisible.value = true
  }
}

const submittingComment = ref(false)
async function onSubmitComment() {
  if (commentForm.value.commentsLv == null) return showToast('请选择领导评价')
  if (!commentForm.value.nextVisitTime) return showToast('请选择下次拜访时间')
  submittingComment.value = true
  try {
    await updateYdlVisitTrackComments({
      id: commentForm.value.id,
      comments: commentForm.value.comments,
      commentsLv: commentForm.value.commentsLv as number,
      nextVisitTime: commentForm.value.nextVisitTime,
    })
    showToast('点评成功')
    commentVisible.value = false
  } finally {
    submittingComment.value = false
  }
}
</script>

<template>
  <div class="ydl-active-page">
    <VantList
      :api="api"
      :title="custName ? `活动量 - ${custName}` : '活动量'"
      permission-prefix="visitTracks"
      :permission-actions="{ create: 'add' }"
      :initial-form="initialForm"
      :response-map="responseMap"
      :show-detail="false"
      add-text="活动量录入"
      :before-submit="beforeSubmit"
      :row-permission="
        (item: YdlVisitTrack) => ({ edit: item.isSelfData, delete: item.isSelfData })
      "
      show-more
      :actions="activeActions"
      @action="onAction"
    >
      <!-- ==================== 列表行 ==================== -->
      <template #item="{ item }">
        <div class="r-row">
          <span class="r-name">{{ item.realName }}</span>
          <van-tag plain type="primary">{{ YDL_VISIT_TYPE[item.visitTypeCode] }}</van-tag>
        </div>
        <div class="r-meta">
          <van-icon name="logistics" />
          <span>拜访进程：{{ YDL_VISIT_PROCESS[item.visitProcess] }}</span>
        </div>
        <div v-if="isDoorVisit(item)" class="r-meta">
          <van-icon name="location-o" />
          <span>打卡状态：</span>
          <van-tag :color="signInStatus(item) === '打卡成功' ? '#07c160' : '#ff976a'">
            {{ signInStatus(item) }}
          </van-tag>
        </div>
        <div class="r-meta r-time">
          <van-icon name="clock-o" />
          <span>拜访时间 {{ item.visitTime }}</span>
        </div>
        <div class="r-meta">
          <van-icon name="orders-o" />
          <span>领导点评：</span>
          <van-tag :color="ydlCommentColor(item.commentsLv)">
            {{ item.commentsLv ? YDL_COMMENT_LEVEL[item.commentsLv] : '待点评' }}
          </van-tag>
          <span v-if="item.comments" class="r-comment">{{ item.comments }}</span>
        </div>
      </template>

      <!-- ==================== 新增 / 编辑 表单（严格对应文档 §4.1.4 活动量录入） ==================== -->
      <template #form="{ form, isEdit }">
        <van-cell-group inset title="拜访信息" class="picc-card">
          <VantTreeSelectField
            v-model="form.mriskTypeCode"
            :options="riskTypeTree"
            value-key="value"
            label-key="title"
            children-key="children"
            label="目标险种"
            title="选择目标险种"
            placeholder="请选择目标险种"
            required
          />
          <VantTimePickerField
            v-model="form.visitTime"
            type="datetime"
            label="拜访时间"
            title="选择拜访时间"
          />
          <VantSelectField
            v-model="form.visitTypeCode"
            :options="visitTypeOptions"
            label="拜访类型"
            title="选择拜访类型"
            placeholder="请选择拜访类型"
            required
          />
        </van-cell-group>

        <!-- 拜访凭证（电话/微信 0/1）/ 拍照打卡（上门 2） -->
        <van-cell-group v-if="form.visitTypeCode === 2" inset title="打卡信息" class="picc-card">
          <VantUpload v-model="form.signInImgUrl" label="拍照打卡" type="image" :max-count="2" />
          <van-field
            v-model="form.signInPosAddr"
            label="打卡地点"
            placeholder="请输入打卡定位地址"
            :rules="[{ required: true, message: '请填写打卡地点' }]"
          />
          <van-field v-if="isEdit" :model-value="form.signInTime || ''" label="打卡时间" readonly />
        </van-cell-group>
        <van-cell-group
          v-else-if="form.visitTypeCode === 0 || form.visitTypeCode === 1"
          inset
          title="拜访凭证"
          class="picc-card"
        >
          <VantUpload v-model="form.signInImgUrl" label="拜访凭证" type="image" :max-count="2" />
        </van-cell-group>

        <van-cell-group inset title="拜访进程与去向" class="picc-card">
          <VantSelectField
            v-model="form.visitProcess"
            :options="visitProcessOptions"
            label="拜访进程"
            title="选择拜访进程"
            placeholder="请选择拜访进程"
            required
          />
          <!-- 同业投保(2)：业务去向 -->
          <template v-if="form.visitProcess === 2">
            <VantSelectField
              v-model="form.bussinessBelong"
              :options="businessBelongOptions"
              label="业务去向"
              title="选择业务去向"
              placeholder="请选择业务去向"
            />
            <van-field
              v-if="form.bussinessBelong === 9"
              v-model="form.bussinessBelongOther"
              label="其他同业投保"
              placeholder="请输入其他同业投保主体"
            />
            <van-field
              v-model="form.insuranceCondition"
              label="其他主体承保条件"
              type="textarea"
              rows="2"
              autosize
              placeholder="请输入其他主体承保条件"
            />
          </template>
          <!-- 跟进中(1)：预计签单信息 -->
          <template v-if="form.visitProcess === 1">
            <VantTimePickerField
              v-model="form.planDate"
              type="date"
              label="预计签单时间"
              title="选择预计签单时间"
            />
            <van-field
              v-model="form.planAmount"
              label="预估保费"
              type="number"
              placeholder="请输入预估保费"
            />
            <van-field
              v-model="form.planSumamount"
              label="预估保额"
              type="number"
              placeholder="请输入预估保额"
            />
          </template>
        </van-cell-group>

        <van-cell-group inset title="拜访对象" class="picc-card">
          <van-field v-model="form.targetName" label="拜访对象" placeholder="请输入拜访对象" />
          <van-field v-model="form.targetPosition" label="对象职务" placeholder="请输入对象职务" />
          <van-field v-model="form.targetPhone" label="联系方式" placeholder="请输入联系方式" />
        </van-cell-group>

        <van-cell-group inset title="拜访情况与支持" class="picc-card">
          <van-field
            v-model="form.remark"
            label="拜访情况"
            type="textarea"
            rows="3"
            autosize
            placeholder="请输入拜访情况（不少于 20 字）"
          />
          <van-cell title="是否可持续跟踪" center>
            <template #value>
              <van-switch v-model="form.continueFlag" :active-value="1" :inactive-value="0" />
            </template>
          </van-cell>
          <van-cell title="是否上级支持" center>
            <template #value>
              <van-switch v-model="form.upFlag" active-value="Y" inactive-value="N" />
            </template>
          </van-cell>
          <van-field
            v-if="form.upFlag === 'Y'"
            v-model="form.upContent"
            label="上级支持内容"
            type="textarea"
            rows="2"
            autosize
            placeholder="请输入上级支持内容（不少于 10 字）"
          />
        </van-cell-group>
      </template>
    </VantList>

    <!-- ==================== 点评弹层（4.1.5） ==================== -->
    <van-popup
      v-model:show="commentVisible"
      position="right"
      :style="{ width: '100%', height: '100%' }"
    >
      <div class="vl-form-popup">
        <van-nav-bar title="活动量点评" left-arrow @click-left="commentVisible = false" />
        <div class="vl-form-scroll">
          <van-form>
            <van-cell-group inset title="领导点评" class="picc-card">
              <van-field
                v-model="commentForm.comments"
                label="点评内容"
                type="textarea"
                rows="3"
                autosize
                placeholder="请输入点评内容"
              />
              <VantSelectField
                v-model="commentForm.commentsLv"
                :options="commentLevelOptions"
                label="领导评价"
                title="选择领导评价"
                placeholder="请选择领导评价"
                required
              />
              <VantTimePickerField
                v-model="commentForm.nextVisitTime"
                type="datetime"
                label="下次拜访时间"
                title="选择下次拜访时间"
              />
            </van-cell-group>
            <div class="vl-submit-bar">
              <van-button
                type="primary"
                block
                round
                :loading="submittingComment"
                @click="onSubmitComment"
                >提交点评</van-button
              >
            </div>
          </van-form>
        </div>
      </div>
    </van-popup>

    <!-- ==================== 详情弹层（录入内容只读） ==================== -->
    <van-popup
      v-model:show="detailVisible"
      position="bottom"
      round
      :style="{ height: '80%' }"
      closeable
      @closed="detailItem = null"
    >
      <div v-if="detailItem" class="ydl-detail">
        <h3 class="ydl-detail-title">活动量详情</h3>
        <van-cell-group inset class="picc-card">
          <van-cell title="业务员" :value="detailItem.realName" />
          <van-cell title="拜访类型" :value="YDL_VISIT_TYPE[detailItem.visitTypeCode]" />
          <van-cell title="拜访进程" :value="YDL_VISIT_PROCESS[detailItem.visitProcess]" />
          <van-cell title="拜访时间" :value="detailItem.visitTime" />
          <van-cell v-if="detailItem.signInTime" title="打卡时间" :value="detailItem.signInTime" />
          <van-cell
            v-if="detailItem.mriskTypeCode"
            title="目标险种"
            :value="findRiskTypePath(detailItem.mriskTypeCode)"
          />
          <van-cell
            v-if="isDoorVisit(detailItem)"
            title="打卡地点"
            :value="detailItem.signInPosAddr"
          />
          <van-cell
            v-if="detailItem.commentsLv"
            title="领导点评"
            :value="`${YDL_COMMENT_LEVEL[detailItem.commentsLv]}${detailItem.comments ? '：' + detailItem.comments : ''}`"
          />
          <van-cell
            v-if="detailItem.targetName"
            title="拜访对象"
            :value="`${detailItem.targetName}（${detailItem.targetPosition}）`"
          />
          <van-cell
            v-if="detailItem.targetPhone"
            title="对象联系方式"
            :value="detailItem.targetPhone"
          />
          <van-cell v-if="detailItem.remark" title="拜访情况" :label="detailItem.remark" />
        </van-cell-group>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.r-row {
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
.r-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--app-text-2);
  margin-top: 4px;
}
.r-time {
  color: var(--app-text-3);
}
.r-comment {
  margin-left: 4px;
  color: var(--app-text-3);
}
.ydl-detail {
  padding: 16px 0 40px;
}
.ydl-detail-title {
  text-align: center;
  font-size: 17px;
  margin: 0 0 12px;
  color: var(--app-text);
}
</style>
