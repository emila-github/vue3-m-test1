<script setup lang="ts">
/**
 * InsuranceIcon —— 保险行业业务图标组件
 *
 * 仿 PICC 移动端截图「险种解读 / 查保单」行的图标风格：
 *   白色圆角方块容器 + 品牌 红/彩色 描边线性 SVG 图标。
 *
 * 内置全部保险业务场景的图标定义，通过 name 属性选用；
 * 支持可选角标文字（如 '¥' / 'NEW' / '热'）。
 */
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 图标唯一标识，对应 ICONS 表 */
    name: string
    /** 容器尺寸 px */
    size?: number
    /** 角标文字 */
    badge?: string
  }>(),
  { size: 52 },
)

// key -> { c: 主题描边色, p: SVG 内部路径 }
const ICONS: Record<string, { c: string; p: string }> = {
  /* ========== 第一行：险种解读 ========== */

  // 险种解读 — 文档+搜索放大镜
  'ins-policy-read': {
    c: 'var(--van-primary-color)',
    p: `<rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 7h6M9 10h6M9 13h3"/><circle cx="15.5" cy="16.5" r="4" fill="#fff" stroke-width="1.8"/><path d="m17.5 18.5 2 2"/>`,
  },
  // 线上营业厅 — 商店门面
  'ins-online-hall': {
    c: '#e69000',
    p: `<path d="M4 11V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8"/><path d="M3 11l2-6h14l2 6"/><rect x="8" y="13" width="3" height="7" rx=".5"/><rect x="13" y="13" width="3" height="7" rx=".5"/>`,
  },
  // 健康评测 — 心脏 + 心电图
  'ins-health-check': {
    c: 'var(--van-primary-color)',
    p: `<path d="M12 4C9 4 7 6.5 7 9c0 5 5 9 5 9s5-4 5-9c0-2.5-2-5-5-5z"/><path d="M3 16h3l2-4 3 6 2-6 2 4h3" stroke-linecap="round"/>`,
  },
  // 新市民 — 人像轮廓
  'ins-new-citizen': {
    c: '#1989fa',
    p: `<circle cx="12" cy="7" r="4"/><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6"/>`,
  },
  // 新能源专区 — 闪电 + 循环箭头
  'ins-ev-zone': {
    c: '#07c160',
    p: `<path d="M13 2L8 10h5v6l5-8h-5z"/><path d="M4 14a8 8 0 0 1 12-6.5M20 10a8 8 0 0 1-12 6.5" stroke-linecap="round"/>`,
  },

  /* ========== 第二行：查保单 ========== */

  // 查保单 — 文件夹+搜索
  'ins-query-policy': {
    c: 'var(--van-primary-color)',
    p: `<path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="15" cy="16" r="3.5" fill="#fff" stroke-width="1.8"/><path d="m17 18 2 2"/>`,
  },
  // 人身险续缴 — 人+¥
  'ins-life-renewal': {
    c: 'var(--van-primary-color)',
    p: `<circle cx="11" cy="7" r="4"/><path d="M3 21c0-4 3.5-6.5 8-6.5s8 2.5 8 6.5"/><text x="17" y="10" font-size="8" font-weight="700" fill="currentColor" stroke="none">¥</text>`,
  },
  // 保险价格 — 盾牌+¥
  'ins-price-compare': {
    c: 'var(--van-primary-color)',
    p: `<path d="M12 2.5l8 3.5v5.5c0 5-8 10-8 10S4 16.5 4 11.5V6l8-3.5z"/><text x="10" y="15" font-size="9" font-weight="700" fill="currentColor" stroke="none">¥</text>`,
  },
  // 农险服务 — 盾牌+麦穗叶子
  'ins-agri-service': {
    c: '#07c160',
    p: `<path d="M12 2.5l8 3.5v5.5c0 5-8 10-8 10S4 16.5 4 11.5V6l8-3.5z"/><path d="M9 11c1-2 3-3 5-2 .5 2-.5 4-2 5-1.5.5-3 0-3-3z"/>`,
  },
  // 网点服务 — 定位标记
  'ins-outlet-map': {
    c: '#1989fa',
    p: `<path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>`,
  },

  /* ========== 兜底 ============ */
  _default: {
    c: 'var(--van-primary-color)',
    p: `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>`,
  },
}

const meta = computed(() => ICONS[props.name] ?? ICONS._default)
</script>

<template>
  <span class="ins-icon" :style="{ width: size + 'px', height: size + 'px' }">
    <svg
      viewBox="0 0 24 24"
      :width="size * 0.5"
      :height="size * 0.5"
      fill="none"
      stroke="currentColor"
      :style="{ color: meta.c }"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      v-html="meta.p"
    />
    <span v-if="badge" class="ins-badge">{{ badge }}</span>
  </span>
</template>

<style scoped>
.ins-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  position: relative;
  flex-shrink: 0;
}
.ins-icon svg {
  filter: drop-shadow(0 0.5px 0.5px rgba(0, 0, 0, 0.04));
}
.ins-badge {
  position: absolute;
  top: -6px;
  right: -10px;
  font-size: 10px;
  line-height: 1.2;
  padding: 1px 5px;
  border-radius: 8px 8px 8px 2px;
  background: var(--app-primary-light);
  color: #fff;
  white-space: nowrap;
  font-weight: 600;
  transform: scale(0.85);
  transform-origin: right bottom;
}
</style>
