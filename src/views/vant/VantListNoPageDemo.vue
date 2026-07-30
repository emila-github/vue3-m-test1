<script setup lang="ts">
/**
 * VantList 示例：客户名单（不分页数据）
 *
 * 与 VantListDemo（车险保源，分页）形成对照，演示「不分页」场景：
 *   - mock 的 /demo/customer/list 忽略 page/pageSize，把全部筛选结果数组**直接放进 data**；
 *   - useCrudList 识别到「列表返回值是数组」即刻置 finished，不再触发「加载更多」，
 *     整页数据一次性呈现，底部直接显示「没有更多了」。
 *
 * 查询/筛选/增删改/详情/权限 均由通用 VantList + useCrudList 承载；
 * 筛选条件用 filters 声明式配置（与 VantListDemo 的 #filters 插槽写法对照）。
 */
import { showToast } from 'vant'
import VantList from '@/components/VantList.vue'
import VantSelectField from '@/components/VantSelectField.vue'
import type { ListFilter } from '@/components/VantList.vue'
import type { CrudApi } from '@/composables/useCrudList'

import {
  type DemoCustomer,
  type DemoCustomerForm,
  type DemoCustomerQuery,
  DEMO_CUSTOMER_TYPES,
  DEMO_CITIES,
  DEMO_DEFAULT_CUSTOMER_QUERY,
  DEMO_DEFAULT_CUSTOMER_FORM,
  getDemoCustomerList,
  createDemoCustomer,
  updateDemoCustomer,
  deleteDemoCustomer,
} from '@/api'

// ==================== 数据模型与接口 ====================
// API 集合：直接指向真实接口函数（请求经 /api 由 mock 拦截）
const api: CrudApi<DemoCustomer, DemoCustomerForm, DemoCustomerQuery> = {
  list: getDemoCustomerList,
  create: createDemoCustomer,
  update: updateDemoCustomer,
  remove: deleteDemoCustomer,
}

// 初始查询条件 / 新增表单（reset 可复位）
const initialQuery = DEMO_DEFAULT_CUSTOMER_QUERY
const initialForm = DEMO_DEFAULT_CUSTOMER_FORM

// 不分页说明：mock 直接把 list 数组放进 data，useCrudList 检测到返回值为数组即 finished，
// 无需传大 pageSize 占位。

// 声明式筛选配置（对照 VantListDemo 的 #filters 插槽，写法更简洁）
const filters: ListFilter[] = [
  { key: 'type', label: '客户类型', type: 'select', options: DEMO_CUSTOMER_TYPES },
  { key: 'city', label: '城市', type: 'select', options: DEMO_CITIES },
  { key: 'levelMin', label: '客户等级≥', type: 'number', min: 0, max: 5, placeholder: '如 3' },
]

function typeColor(type: string) {
  return type === 'VIP' ? 'var(--van-primary-color)' : type === '会员' ? '#07c160' : '#969799'
}

function onAction(payload: { key: string; item: DemoCustomer }) {
  if (payload.key === 'call') showToast(`呼叫 ${payload.item.name}：${payload.item.phone}`)
}

// 自定义扩展操作：拨打电话
const actions = [{ key: 'call', name: '拨打电话', icon: 'phone-o' }]
</script>

<template>
  <VantList
    :api="api"
    title="客户名单（不分页）"
    permission-prefix="car"
    :initial-query="initialQuery"
    :initial-form="initialForm"
    :filters="filters"
    more-filter-title="筛选客户"
    search-placeholder="搜索姓名 / 电话 / 公司"
    keyword-key="keyword"
    :actions="actions"
    enable-log
    finished-text="已全部加载（不分页）"
    @action="onAction"
  >
    <!-- ==================== 列表行 ==================== -->
    <template #item="{ item }">
      <div class="r-row">
        <span class="r-name">{{ item.name }}</span>
        <van-tag :color="typeColor(item.type)" text-color="#fff" size="medium">
          {{ item.type }}
        </van-tag>
      </div>
      <div class="r-meta">
        <van-icon name="phone-o" />
        <span>{{ item.phone }}</span>
        <span class="r-sep">|</span>
        <span>{{ item.city }}</span>
        <van-rate :model-value="item.level" :count="5" size="12" readonly class="r-rate" />
      </div>
      <div class="r-meta">
        <span class="r-company">{{ item.company }}</span>
        <span class="r-amount">¥{{ item.amount.toLocaleString() }}</span>
      </div>
    </template>

    <!-- ==================== 新增/编辑 表单 ==================== -->
    <template #form="{ form }">
      <van-cell-group inset class="picc-card">
        <van-field v-model="form.name" label="姓名" placeholder="请输入姓名" required clearable />
        <van-field
          v-model="form.phone"
          label="电话"
          placeholder="请输入联系电话"
          type="tel"
          clearable
        />
        <van-field v-model="form.company" label="公司" placeholder="请输入公司名称" clearable />

        <!-- 客户类型：原生 radio -->
        <div class="f-row">
          <span class="f-row-label">客户类型</span>
          <van-radio-group v-model="form.type" direction="horizontal">
            <van-radio name="普通" icon-size="16px">普通</van-radio>
            <van-radio name="会员" icon-size="16px">会员</van-radio>
            <van-radio name="VIP" icon-size="16px">VIP</van-radio>
          </van-radio-group>
        </div>

        <!-- 城市：自定义下拉组件 VantSelectField（演示表单内组件接入） -->
        <VantSelectField
          v-model="form.city"
          :options="DEMO_CITIES.filter((c) => c.value)"
          label="城市"
          title="选择城市"
          placeholder="请选择城市"
        />

        <!-- 客户等级 -->
        <div class="f-row">
          <span class="f-row-label">客户等级</span>
          <van-rate v-model="form.level" :count="5" size="20" />
        </div>

        <!-- 累计消费 -->
        <van-field label="累计消费（元）">
          <template #input>
            <van-stepper v-model="form.amount" :min="0" :step="500" />
          </template>
        </van-field>

        <van-field
          v-model="form.remark"
          label="备注"
          type="textarea"
          rows="2"
          autosize
          placeholder="填写备注"
        />
      </van-cell-group>
    </template>

    <!-- ==================== 详情 ==================== -->
    <template #detail="{ item }">
      <van-cell-group inset>
        <van-cell title="姓名" :value="item.name" />
        <van-cell title="电话" :value="item.phone" />
        <van-cell title="公司" :value="item.company" />
        <van-cell title="客户类型">
          <van-tag :color="typeColor(item.type)" text-color="#fff" size="medium">
            {{ item.type }}
          </van-tag>
        </van-cell>
        <van-cell title="城市" :value="item.city" />
        <van-cell title="客户等级">
          <van-rate :model-value="item.level" :count="5" size="14" readonly />
        </van-cell>
        <van-cell title="累计消费" :value="`¥${item.amount.toLocaleString()}`" />
        <van-cell title="备注" :value="item.remark || '—'" />
      </van-cell-group>
    </template>
  </VantList>

  <div class="usage-page">
    <div class="section-title">使用说明</div>
    <div class="card" style="margin: 0 12px 16px">
      <p class="hint">
        复用同一个 <code>VantList</code> 演示「不分页」：mock 直接把全量数组放进
        <code>data</code>，<code>useCrudList</code> 识别到返回值为数组即视为已加载完成（finished）。
      </p>
      <p class="hint">
        <b>关键</b>：api.list 返回 <code>T[]</code> 而非
        <code>{ list, total }</code> 即可启用不分页模式， 无需额外配置。其余 Props / 插槽与 VantList
        完全一致。
      </p>
    </div>
  </div>
</template>

<style scoped>
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
.r-sep {
  color: #dcdee0;
}
.r-rate {
  margin-left: 2px;
}
.r-company {
  color: #1989fa;
}
.r-amount {
  margin-left: auto;
  color: var(--van-primary-color);
  font-weight: 600;
}

/* 表单内行（radio / rate） */
.f-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--app-border);
}
.f-row-label {
  font-size: 14px;
  color: var(--app-text);
  min-width: 76px;
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
