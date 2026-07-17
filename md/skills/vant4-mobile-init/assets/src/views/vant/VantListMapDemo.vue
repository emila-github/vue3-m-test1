<script setup lang="ts">
/**
 * VantList 示例：字段映射（对接异构命名后端）
 *
 * 与 VantListDemo（标准命名）/ VantListNoPageDemo（不分页）形成对照，演示 VantList 的
 * 字段映射能力：
 *   - requestMap：把发往后端的页码/每页大小参数由 page/pageSize 改为 current/size；
 *   - responseMap：把后端返回的 records / totalCount / currPage / pageSize 映射回
 *     list / total / page / pageSize。
 * 业务页只需在 VantList 上声明这两个映射对象，列表加载逻辑无需任何改动。
 */
import { showToast } from 'vant'
import VantList from '@/components/VantList.vue'
import type { ListFilter } from '@/components/VantList.vue'
import type { CrudApi } from '@/composables/useCrudList'

import {
  type DemoMapItem,
  type DemoMapForm,
  type DemoMapQuery,
  DEMO_MAP_DEPTS,
  DEMO_MAP_STATUS,
  DEMO_DEFAULT_MAP_QUERY,
  DEMO_DEFAULT_MAP_FORM,
  getDemoMapList,
  createDemoMap,
  updateDemoMap,
  deleteDemoMap,
} from '@/api'

// ==================== 数据模型与接口 ====================
const api: CrudApi<DemoMapItem, DemoMapForm, DemoMapQuery> = {
  list: getDemoMapList,
  create: createDemoMap,
  update: updateDemoMap,
  remove: deleteDemoMap,
}

const initialQuery = DEMO_DEFAULT_MAP_QUERY
const initialForm = DEMO_DEFAULT_MAP_FORM

// ==================== 字段映射（对接异构后端） ====================
// 请求参数映射：页码 → current，每页大小 → size
const requestMap = { page: 'current', pageSize: 'size' }
// 响应字段映射：records → list，totalCount → total，currPage → page，pageSize 保持
const responseMap = { list: 'records', total: 'totalCount', page: 'currPage', pageSize: 'pageSize' }

// ==================== 声明式筛选 ====================
const filters: ListFilter[] = [
  { key: 'dept', label: '部门', type: 'select', options: DEMO_MAP_DEPTS },
  { key: 'status', label: '状态', type: 'select', options: DEMO_MAP_STATUS },
]

function statusColor(status: string) {
  return status === '在职' ? '#07c160' : status === '试用期' ? '#1989fa' : '#969799'
}

function onAction(payload: { key: string; item: DemoMapItem }) {
  if (payload.key === 'score') showToast(`${payload.item.name} 绩效分：${payload.item.score}`)
}

const actions = [{ key: 'score', name: '查看绩效', icon: 'chart-trending-o' }]
</script>

<template>
  <VantList
    :api="api"
    title="员工列表（字段映射）"
    permission-prefix="car"
    :page-size="10"
    :request-map="requestMap"
    :response-map="responseMap"
    :initial-query="initialQuery"
    :initial-form="initialForm"
    :filters="filters"
    more-filter-title="筛选员工"
    search-placeholder="搜索姓名"
    keyword-key="keyword"
    :actions="actions"
    enable-log
    finished-text="没有更多了"
    @action="onAction"
  >
    <!-- ==================== 列表行 ==================== -->
    <template #item="{ item }">
      <div class="r-row">
        <span class="r-name">{{ item.name }}</span>
        <van-tag :color="statusColor(item.status)" text-color="#fff" size="medium">
          {{ item.status }}
        </van-tag>
      </div>
      <div class="r-meta">
        <van-icon name="friends-o" />
        <span>{{ item.dept }}</span>
        <span class="r-sep">|</span>
        <span>绩效 {{ item.score }}</span>
      </div>
    </template>

    <!-- ==================== 新增/编辑 表单 ==================== -->
    <template #form="{ form }">
      <van-cell-group inset class="picc-card">
        <van-field v-model="form.name" label="姓名" placeholder="请输入姓名" required clearable />
        <van-field v-model="form.dept" label="部门" placeholder="请输入部门" clearable />
        <van-field v-model="form.score" label="绩效分" type="digit" placeholder="请输入绩效分" />
        <van-field v-model="form.status" label="状态" placeholder="请输入状态" clearable />
      </van-cell-group>
    </template>

    <!-- ==================== 详情 ==================== -->
    <template #detail="{ item }">
      <van-cell-group inset>
        <van-cell title="姓名" :value="item.name" />
        <van-cell title="部门" :value="item.dept" />
        <van-cell title="绩效分" :value="String(item.score)" />
        <van-cell title="状态">
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
        复用同一个 <code>VantList</code> 演示「字段映射」：通过 <code>responseMap</code> /
        <code>requestMap</code> 适配返回 <code>{ records, totalCount }</code>、入参
        <code>{ current, size }</code> 的异构后端。
      </p>
      <p class="hint">
        <b>例</b><br />
        <code>:response-map="{ list: 'records', total: 'totalCount' }"</code><br />
        <code>:request-map="{ page: 'current', pageSize: 'size' }"</code>
      </p>
    </div>
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
