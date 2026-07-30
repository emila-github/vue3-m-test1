<script setup lang="ts">
/**
 * VantInsIconDemo —— 保险行业图标展示页
 *
 * 仿 PICC 移动端截图「险种解读 / 查保单」两行的图标风格：
 *   白色圆角方块容器 + 品牌 红/彩色 描边线性 SVG 图标。
 * 通过 InsuranceIcon 组件统一渲染，按两行分组展示全部保险业务场景。
 */
import { ref } from 'vue'
import InsuranceIcon from '../../components/InsuranceIcon.vue'

interface InsItem {
  key: string
  title: string
  badge?: string
}
interface InsRow {
  title: string
  items: InsItem[]
}

const rows = ref<InsRow[]>([
  {
    title: '险种解读',
    items: [
      { key: 'ins-policy-read', title: '险种解读' },
      { key: 'ins-online-hall', title: '线上营业厅' },
      { key: 'ins-health-check', title: '健康评测' },
      { key: 'ins-new-citizen', title: '新市民', badge: 'NEW' },
      { key: 'ins-ev-zone', title: '新能源专区' },
    ],
  },
  {
    title: '查保单',
    items: [
      { key: 'ins-query-policy', title: '查保单' },
      { key: 'ins-life-renewal', title: '人身险续缴', badge: '¥' },
      { key: 'ins-price-compare', title: '保险价格', badge: '¥' },
      { key: 'ins-agri-service', title: '农险服务' },
      { key: 'ins-outlet-map', title: '网点服务' },
    ],
  },
])
</script>

<template>
  <div class="ins-demo">
    <van-nav-bar title="保险行业图标" left-text="返回" left-arrow @click-left="$router.back()" />

    <div class="ins-banner">仿 PICC 移动端截图：白底圆角方块 + 红色描边线形图标</div>

    <section v-for="(row, ri) in rows" :key="'r' + ri" class="ins-section">
      <h3 class="ins-section-title">{{ row.title }}</h3>
      <div class="ins-row">
        <div v-for="it in row.items" :key="it.key" class="ins-item">
          <InsuranceIcon :name="it.key" :size="52" :badge="it.badge" />
          <span class="ins-label">{{ it.title }}</span>
        </div>
      </div>
    </section>

    <div class="ins-tip">
      新增图标：在 <code>InsuranceIcon.vue</code> 的 ICONS 表中追加 key，并通过
      <code>&lt;InsuranceIcon :name="..." /&gt;</code> 使用。
    </div>
  </div>
</template>

<style scoped>
.ins-demo {
  min-height: 100vh;
  background: var(--app-bg);
  padding-bottom: 24px;
}
.ins-banner {
  margin: 12px 16px 4px;
  padding: 12px 16px;
  background: linear-gradient(135deg, var(--van-primary-color), var(--app-primary-deep));
  color: #fff;
  font-size: 13px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(215, 25, 32, 0.15);
}
.ins-section {
  background: var(--app-surface);
  border-radius: 12px;
  margin: 16px 12px 0;
  padding: 18px 6px 16px;
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.04);
}
.ins-section-title {
  margin: 0 0 14px 10px;
  font-size: 15px;
  font-weight: 600;
  color: var(--app-text);
  position: relative;
  padding-left: 10px;
}
.ins-section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 2px;
  bottom: 2px;
  width: 3px;
  border-radius: 2px;
  background: var(--van-primary-color);
}
.ins-row {
  display: flex;
  justify-content: space-between;
  gap: 2px;
}
.ins-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 9px;
  flex: 1;
  min-width: 0;
}
.ins-label {
  font-size: 12.5px;
  color: var(--app-text);
  text-align: center;
  line-height: 1.3;
  max-width: 64px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ins-tip {
  margin: 20px 16px 0;
  font-size: 12px;
  color: var(--app-text-3);
  line-height: 1.6;
}
.ins-tip code {
  background: #f0f0f0;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 11px;
  color: #1989fa;
}
</style>
