<script setup lang="ts">
/**
 * 我的领航（需求文档 §8.1 `/lhzj`）
 * 领航拜访记录列表 + 新增 / 编辑 / 删除 + 详情。复用 VantList 内置能力。
 */
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import VantList from '@/components/VantList.vue'
import type { CrudApi } from '@/composables/useCrudList'
import VantSelectField from '@/components/VantSelectField.vue'
import VantTreeSelectField from '@/components/VantTreeSelectField.vue'
import VantSelectMultipleField from '@/components/VantSelectMultipleField.vue'
import VantCalendarField from '@/components/VantCalendarField.vue'
import type { DeptNode } from '@/api/modules/ydl/dict'
import { useYdlDict } from '@/composables/ydl/useYdlDict'
import {
  getYdlLhzjList,
  addYdlLhzj,
  updateYdlLhzj,
  deleteYdlLhzj,
  type YdlLhzjVisit,
} from '@/api/modules/ydl/ydl-lhzj'

const router = useRouter()
const { loadDeptTree, loadDictItems, loadLhzjCustomerType } = useYdlDict()

const api: CrudApi<YdlLhzjVisit, any, any> = {
  list: getYdlLhzjList,
  create: addYdlLhzj,
  update: updateYdlLhzj,
  remove: (id: number) => deleteYdlLhzj(id),
}

const initialQuery = reactive({ customerName: '', visitName: '' })

const initialForm = reactive({
  comzcode: '',
  visitName: '',
  visitPosition: [] as string[],
  customerName: '',
  customerTypeId: '',
  targetName: '',
  targetPosition: '',
  visitTime: '',
  visitContent: '',
})

const responseMap = { list: 'records', total: 'total', pageSize: 'size' }

const deptTreeData = ref<DeptNode[]>([])
const positionOptions = ref<{ text: string; value: string }[]>([])
const customerTypeOptions = ref<{ text: string; value: string }[]>([])

function flattenCustomer(nodes: any[], prefix = ''): { text: string; value: string }[] {
  const out: { text: string; value: string }[] = []
  for (const n of nodes) {
    out.push({ text: prefix + n.title, value: n.id })
    if (n.children?.length) out.push(...flattenCustomer(n.children, prefix + n.title + ' / '))
  }
  return out
}

onMounted(async () => {
  try {
    const [tree, pos, ct] = await Promise.all([
      loadDeptTree(),
      loadDictItems('VISIT_POSITION'),
      loadLhzjCustomerType(),
    ])
    deptTreeData.value = tree
    positionOptions.value = pos.map((c) => ({ text: c.text, value: c.value }))
    customerTypeOptions.value = flattenCustomer(ct)
  } catch {
    /* 下拉加载失败不阻塞 */
  }
})

const detailFields = (item: YdlLhzjVisit) => [
  { label: '拜访机构', value: item.comzname || item.comzcode },
  { label: '拜访人', value: item.visitName },
  { label: '拜访人职务', value: item.visitPosition },
  { label: '拜访时间', value: item.visitTime },
  { label: '客户名称', value: item.customerName },
  { label: '客户分类', value: item.customerTypeName || item.customerTypeId },
  { label: '拜访对象', value: item.targetName },
  { label: '对象职务', value: item.targetPosition },
  { label: '拜访内容', value: item.visitContent },
]
</script>

<template>
  <div class="ydl-lhzj-page">
    <VantList
      :api="api"
      title="我的领航"
      permission-prefix="lhzj"
      :free-actions="['create', 'edit', 'delete', 'view']"
      add-text="添加拜访"
      :initial-query="initialQuery"
      :initial-form="initialForm"
      :response-map="responseMap"
      search-placeholder="搜索客户名称"
      keyword-key="customerName"
      show-more
      @detail="() => {}"
    >
      <template #filters="{ query }">
        <van-cell-group inset class="f-group">
          <van-field v-model="query.customerName" label="客户名称" placeholder="输入客户名称" input-align="right" />
          <van-field v-model="query.visitName" label="拜访人" placeholder="输入拜访人" input-align="right" />
        </van-cell-group>
      </template>

      <template #item="{ item }">
        <div class="r-title">{{ item.customerName }}</div>
        <div class="r-meta">拜访人：{{ item.visitName }} ｜ {{ item.visitTime }}</div>
        <div class="r-meta">机构：{{ item.comzname }} ｜ 客户分类：{{ item.customerTypeName || item.customerTypeId }}</div>
        <div class="r-meta">拜访内容：{{ item.visitContent }}</div>
      </template>

      <template #detail="{ item }">
        <van-cell-group inset title="拜访详情" class="picc-card">
          <van-cell v-for="c in detailFields(item)" :key="c.label" :title="c.label" :value="c.value" />
        </van-cell-group>
      </template>

      <template #form="{ form }">
        <van-cell-group inset class="picc-card">
          <VantTreeSelectField
            v-model="form.comzcode"
            :options="deptTreeData"
            value-key="orgCode"
            label-key="title"
            children-key="children"
            select-parent
            label="拜访机构"
            title="选择拜访机构"
            placeholder="请选择拜访机构"
            required
          />
          <van-field v-model="form.visitName" label="拜访人" placeholder="请输入拜访人" :rules="[{ required: true, message: '请填写拜访人' }]" />
          <VantSelectMultipleField
            v-model="form.visitPosition"
            :options="positionOptions"
            value-key="value"
            label-key="text"
            label="拜访人职务"
            title="选择职务"
            placeholder="请选择职务"
          />
          <van-field v-model="form.customerName" label="客户名称" placeholder="请输入客户名称" :rules="[{ required: true, message: '请填写客户名称' }]" />
          <VantSelectField
            v-model="form.customerTypeId"
            :options="customerTypeOptions"
            label="客户分类"
            title="选择客户分类"
            placeholder="请选择客户分类"
            required
          />
          <van-field v-model="form.targetName" label="拜访对象" placeholder="请输入拜访对象" :rules="[{ required: true, message: '请填写拜访对象' }]" />
          <van-field v-model="form.targetPosition" label="对象职务" placeholder="请输入对象职务" :rules="[{ required: true, message: '请填写对象职务' }]" />
          <VantCalendarField
            v-model="form.visitTime"
            type="single"
            label="拜访时间"
            title="选择拜访时间"
            placeholder="请选择拜访时间"
            required
          />
          <van-field
            v-model="form.visitContent"
            label="拜访内容"
            type="textarea"
            rows="3"
            autosize
            placeholder="请输入拜访内容（以项目储备为主）"
            :rules="[{ required: true, message: '请填写拜访内容' }]"
          />
        </van-cell-group>
      </template>
    </VantList>
  </div>
</template>

<style scoped>
.ydl-lhzj-page {
  min-height: 100vh;
  background: #f5f6f8;
}
.f-group {
  margin: 8px 12px;
}
.r-title {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 6px;
}
.r-meta {
  font-size: 13px;
  color: #666;
  margin-top: 3px;
}
</style>
