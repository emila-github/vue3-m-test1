<script setup lang="ts">
/**
 * MenuIcon —— 首页菜单图标（双风格）
 *
 * 支持两种图标风格，通过 style 属性切换：
 *
 *   highlight（车险算费风格 / 突出显示）：
 *     白色圆角方块容器 + 品牌红/彩色线性图标，用于红底区域中的高亮菜单项。
 *     参考截图中「查保单 / 车险续保 / 百万医疗」等顶部图标区。
 *
 *   default（福建源动力平台风格 / 默认）：
 *     红色圆形徽章背景 + 白色线性图标，用于白底卡片区域的常规菜单项。
 *     参考截图中「车险算费 / 办理赔 / 保单变更 / 福建源动力平台」等底部图标区。
 */
import { computed } from 'vue'

export type IconStyle = 'highlight' | 'default'

const props = withDefaults(
  defineProps<{
    /** 菜单唯一 key，对应 HomeView 中的 menu key */
    name: string
    /** 图标风格：highlight=车险算费(突出), default=福建源动力平台(默认) */
    style?: IconStyle
    /** 容器尺寸（px），highlight 方块边长 / default 圆形直径 */
    size?: number
    /** 角标文字（如 '0免赔'/'焕新'/¥） */
    badge?: string
  }>(),
  { style: 'default', size: 48 },
)

// key -> { c: 主题色（highlight 时作为描边+填充色，default 时作为圆形背景色）, p: SVG 内部路径 }
const ICONS: Record<string, { c: string; p: string }> = {
  // ============ 数据统计 ============
  'dashboard-analysis': {
    c: '#d71920',
    p: `<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>`,
  },
  'insurance-source-stats-TrackSummary': {
    c: '#d71920',
    p: `<path d="M4 18c0-4.5 3.5-6.5 6.5-6.5S14 12 17 14"/><circle cx="4" cy="18" r="1.2"/><circle cx="17" cy="14" r="1.2"/>`,
  },
  'insurance-source-stats-UserSummary': {
    c: '#d71920',
    p: `<circle cx="9" cy="8" r="3"/><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/><path d="M16 14v5M19 16v3"/>`,
  },
  'insurance-source-stats-Visit': {
    c: '#d71920',
    p: `<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 8h6M9 11.5h6M9 15h4"/>`,
  },
  'insurance-source-stats-PolicySummary': {
    c: '#d71920',
    p: `<path d="M7 3h7l4 4v11a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 18V4.5A1.5 1.5 0 0 1 7 3z"/><path d="M14 3V7h4"/><path d="M9.5 12.5l3 3 2-2-3-3z"/>`,
  },

  // ============ 工作台 ============
  'insurance-source-workplace': {
    c: '#e69000',
    p: `<circle cx="12" cy="6" r="2.5"/><circle cx="6" cy="17" r="2.5"/><circle cx="18" cy="17" r="2.5"/><path d="M12 8.5 7 15M12 8.5l5 6.5"/>`,
  },
  'insurance-source-fcdd-policy-main': {
    c: '#d71920',
    p: `<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 9h16M8 3v4M16 3v4"/><path d="M12 12.5v4M12 18.5v.01"/>`,
  },
  'insurance-source-monitor-track-visit': {
    c: '#d71920',
    p: `<path d="M5 19V9M10 19V5M15 19v-7M20 19V11M4 19h17"/>`,
  },

  // ============ 千万级企业决策 ============
  'jc-JcEnterpriseItemList': { c: '#7a3fb5', p: `<path d="M4 6h16l-6 7v5l-4 2v-7z"/>` },
  'jc-JcEnterpriseRiskList': { c: '#5b21b6', p: `<path d="M4 16l5-5 4 3 7-7M16 7h4v4"/>` },

  // ============ 续保管理 ============
  'xb-renewedList': {
    c: '#07c160',
    p: `<path d="M19 8A8 8 0 1 0 19.1 16"/><path d="M19 4v4h-4"/>`,
  },
  'xb-questionList': {
    c: '#ff7a18',
    p: `<circle cx="12" cy="12" r="9"/><path d="M9.4 9.6a2.6 2.6 0 0 1 5 1.4c0 1.6-2 2.1-2 3.2"/><circle cx="12" cy="17" r=".8" fill="#fff" stroke="none"/>`,
  },
  'xb-endList': { c: '#969799', p: `<circle cx="12" cy="12" r="9"/><path d="M7.6 7.6l9 9"/>` },

  // ============ 车险续保管理 ============
  'xbCar-renewedList': {
    c: '#1989fa',
    p: `<path d="M4 13l1.5-5A2 2 0 0 1 7.4 6.5h9.2A2 2 0 0 1 18.5 8L20 13"/><path d="M4 13h16v5h-2v-2H6v2H4z"/><circle cx="7.5" cy="16" r="1.1"/><circle cx="16.5" cy="16" r="1.1"/>`,
  },

  // ============ 领航足迹 ============
  'lhzj-lhVisitInfoList': {
    c: '#06b6d4',
    p: `<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2.2 5-5 2.2 2.2-5z"/>`,
  },

  // ============ Demo 演示 ============
  'ydl-demo-list': {
    c: '#1989fa',
    p: `<path d="M4 6h16M4 12h16M4 18h10"/><circle cx="19" cy="18" r="2"/>`,
  },

  // 兜底
  _default: { c: '#d71920', p: `<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 17v.02"/>` },
}

const meta = computed(() => ICONS[props.name] ?? ICONS._default)
const isHighlight = computed(() => props.style === 'highlight')
</script>

<template>
  <!-- ====== highlight：白色方块 + 彩色图标（车险算费风格）====== -->
  <span
    v-if="isHighlight"
    class="menu-icon menu-icon--hl"
    :style="{ width: size + 'px', height: size + 'px' }"
  >
    <svg
      viewBox="0 0 24 24"
      :width="size * 0.54"
      :height="size * 0.54"
      fill="none"
      :stroke="meta.c"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      v-html="meta.p"
    />
    <span v-if="badge" class="icon-badge">{{ badge }}</span>
  </span>

  <!-- ====== default：红色圆形徽章 + 白色图标（福建源动力平台风格）====== -->
  <span
    v-else
    class="menu-icon menu-icon--df"
    :style="{ width: size + 'px', height: size + 'px', background: meta.c }"
  >
    <svg
      viewBox="0 0 24 24"
      :width="size * 0.5"
      :height="size * 0.5"
      fill="none"
      stroke="#fff"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      v-html="meta.p"
    />
    <span v-if="badge" class="icon-badge icon-badge--df">{{ badge }}</span>
  </span>
</template>

<style scoped>
/* ====== highlight（车险算费风格）：白色圆角方块 ====== */
.menu-icon--hl {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  position: relative;
  flex-shrink: 0;
}
.menu-icon--hl svg {
  filter: drop-shadow(0 0.5px 0.5px rgba(0, 0, 0, 0.06));
}

/* ====== default（福建源动力平台风格）：红色圆形徽章 ====== */
.menu-icon--df {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  position: relative;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

/* ====== 角标 ====== */
.icon-badge {
  position: absolute;
  top: -6px;
  right: -10px;
  font-size: 10px;
  line-height: 1.2;
  padding: 1px 5px;
  border-radius: 8px 8px 8px 2px;
  background: #1989fa;
  color: #fff;
  white-space: nowrap;
  font-weight: 600;
  transform: scale(0.85);
  transform-origin: right bottom;
}
.icon-badge--df {
  background: #ee5a24;
}
</style>
