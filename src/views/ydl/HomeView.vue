<script setup lang="ts">
/**
 * HomeView（ydl 模块）—— PICC 风格业务菜单首页
 *
 * 依据《Menu菜单权限开发文档》重构：
 *  - 菜单结构（分组 → 菜单项）抽为 menuConfig，权限字符串与后端菜单树 name 对齐；
 *  - 分组级显隐：groupAny 任一命中才显示整组（对齐 v-has-any-permission-menu）；
 *  - 项级显隐：命中 perm 任一即显示（对齐 v-has-permission-menu / hasAny 语义）；
 *  - 「工作台」无分组级指令，容器始终渲染，子项各自鉴权（见文档 §四.3）。
 * 图标直接复用 MenuIcon（其 key 即权限字符串）。
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import MenuIcon from '../../components/MenuIcon.vue'
import { usePermission } from '@/composables/usePermission'

const router = useRouter()
const { hasMenuAny } = usePermission()

// ============ 菜单配置（权限字符串需与后端菜单树 name 完全一致，详见开发文档）============
interface MenuConf {
  /** 权限字符串，同时作为 MenuIcon 的图标 name */
  key: string
  title: string
  to: string
  /** 项级显隐：菜单权限（name 数组），命中任一即显示 */
  perm: string[]
}
interface GroupConf {
  title: string
  /** 分组级显隐：权限（name 数组），任一命中即显示整组；省略=无分组级指令（容器始终渲染） */
  groupAny?: string[]
  items: MenuConf[]
}

const groups: GroupConf[] = [
  {
    title: '数据统计',
    groupAny: [
      'dashboard-analysis',
      'insurance-source-stats-TrackSummary',
      'insurance-source-stats-UserSummary',
      'insurance-source-stats-Visit',
      'insurance-source-stats-PolicySummary',
    ],
    items: [
      {
        key: 'dashboard-analysis',
        title: '数据汇总',
        to: '/analysis',
        perm: ['dashboard-analysis'],
      },
      {
        key: 'insurance-source-stats-TrackSummary',
        title: '跟踪统计',
        to: '/track-summary',
        perm: ['insurance-source-stats-TrackSummary'],
      },
      {
        key: 'insurance-source-stats-UserSummary',
        title: '劳效统计',
        to: '/user-summary',
        perm: ['insurance-source-stats-UserSummary'],
      },
      {
        key: 'insurance-source-stats-Visit',
        title: '拜访明细',
        to: '/visit',
        perm: ['insurance-source-stats-Visit'],
      },
      {
        key: 'insurance-source-stats-PolicySummary',
        title: '签单明细',
        to: '/policy-summary',
        perm: ['insurance-source-stats-PolicySummary'],
      },
    ],
  },
  {
    // 工作台：无分组级指令（容器始终渲染），子项各自鉴权
    title: '工作台',
    items: [
      {
        key: 'insurance-source-workplace',
        title: '我的保源',
        to: '/ydl/my-insurance-source',
        perm: [
          'insurance-source-workplace',
          'insurance-source-workplace-my-insurance-source',
          'insurance-source-workplace-my-is-detail-@id',
        ],
      },
      {
        key: 'insurance-source-fcdd-policy-main',
        title: '非车待续保跟踪',
        to: '/fcdd-policy-main',
        perm: ['insurance-source-fcdd-policy-main'],
      },
      {
        key: 'insurance-source-monitor-track-visit',
        title: '拜访汇总',
        to: '/monitor/track/visit',
        perm: ['insurance-source-monitor-track-visit'],
      },
    ],
  },
  {
    title: '千万级企业决策',
    groupAny: ['jc-JcEnterpriseItemList', 'jc-JcEnterpriseRiskList'],
    items: [
      {
        key: 'jc-JcEnterpriseItemList',
        title: '客户渗透率',
        to: '/JcEnterpriseItemList',
        perm: ['jc-JcEnterpriseItemList'],
      },
      {
        key: 'jc-JcEnterpriseRiskList',
        title: '新续企业增量保费',
        to: '/JcEnterpriseRiskList',
        perm: ['jc-JcEnterpriseRiskList'],
      },
    ],
  },
  {
    title: '续保管理',
    groupAny: ['xb-renewedList', 'xb-questionList', 'xb-endList'],
    items: [
      { key: 'xb-renewedList', title: '我的续保', to: '/xb/renewedList', perm: ['xb-renewedList'] },
      {
        key: 'xb-questionList',
        title: '问题项目',
        to: '/xb/questionList',
        perm: ['xb-questionList'],
      },
      { key: 'xb-endList', title: '项目终止', to: '/xb/endList', perm: ['xb-endList'] },
    ],
  },
  {
    title: '车险续保管理',
    groupAny: ['xbCar-renewedList'],
    items: [
      {
        key: 'xbCar-renewedList',
        title: '我的续保',
        to: '/xbCar/renewedList',
        perm: ['xbCar-renewedList'],
      },
    ],
  },
  {
    title: '领航足迹',
    groupAny: ['lhzj-lhVisitInfoList'],
    items: [
      {
        key: 'lhzj-lhVisitInfoList',
        title: '我的领航',
        to: '/lhzj',
        perm: ['lhzj-lhVisitInfoList'],
      },
    ],
  },
  {
    // Demo 演示：免权限，始终渲染（perm 为空数组 → 始终可见）
    title: 'Demo 演示',
    items: [
      {
        key: 'ydl-demo-list',
        title: 'VantList 示例',
        to: '/ydl/ydl-list-demo',
        perm: [],
      },
    ],
  },
]

/** 项级显隐：命中 perm 任一即显示；perm 为空（如 Demo 演示）表示免权限，始终可见 */
function itemVisible(it: MenuConf): boolean {
  if (it.perm.length === 0) return true
  return hasMenuAny(...it.perm)
}

/**
 * 渲染用分组列表：过滤掉不可见项；仅保留「至少含一个可见项」的分组，
 * 避免「工作台」在无任何子权限时出现空卡片（见文档 §四.3 备注）。
 */
const visibleGroups = computed(() =>
  groups
    .map((g) => ({ group: g, items: g.items.filter(itemVisible) }))
    .filter((g) => g.items.length > 0),
)

function go(it: MenuConf) {
  router.push(it.to)
}
</script>

<template>
  <div class="picc-page ydl-home">
    <header class="picc-header-gradient ydl-header">
      <div class="ydl-brand">保保财险</div>
      <div class="ydl-title">福建源平台</div>
      <div class="ydl-sub">数据驱动 · 保源续保一体化</div>
    </header>

    <main class="ydl-body">
      <section v-for="g in visibleGroups" :key="g.group.title" class="picc-card ydl-group">
        <h2 class="picc-section-title ydl-group-title">{{ g.group.title }}</h2>
        <div class="ydl-grid">
          <button
            v-for="it in g.items"
            :key="it.key"
            class="ydl-item"
            type="button"
            @click="go(it)"
          >
            <MenuIcon :name="it.key" :size="46" />
            <span class="ydl-label">{{ it.title }}</span>
          </button>
        </div>
      </section>

      <div v-if="visibleGroups.length === 0" class="picc-card ydl-empty">
        暂无可用菜单权限，请联系管理员
      </div>

      <div class="bottom-spacer"></div>
    </main>
  </div>
</template>

<style scoped>
/* 头部内容（容器与渐变由 .picc-header-gradient 提供） */
.ydl-header {
  color: #fff;
}
.ydl-brand {
  font-size: 13px;
  letter-spacing: 3px;
  opacity: 0.92;
}
.ydl-title {
  margin-top: 8px;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 1px;
}
.ydl-sub {
  margin-top: 6px;
  font-size: 13px;
  opacity: 0.85;
}

/* 卡片区上移，叠在红渐变下缘 */
.ydl-body {
  margin-top: -16px;
  position: relative;
}
.ydl-group {
  margin-bottom: 14px;
}
/* 分组标题（覆盖 .picc-section-title 自带内边距，贴合卡片） */
.ydl-group-title {
  margin: 0;
  padding: 0 0 14px;
}

/* 菜单宫格 */
.ydl-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  row-gap: 20px;
}
.ydl-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 9px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}
.ydl-item:active {
  opacity: 0.65;
}
.ydl-label {
  font-size: 12.5px;
  color: var(--app-text-2);
  text-align: center;
  line-height: 1.3;
}

/* 无权限空态 */
.ydl-empty {
  text-align: center;
  color: var(--app-text-3);
  padding: 32px 16px;
  font-size: 14px;
}

.bottom-spacer {
  height: 70px;
}
</style>
