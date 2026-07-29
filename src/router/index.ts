import { createRouter, createWebHistory } from 'vue-router'
// 自由路由（约定式 / 文件路由）：vue-router 5 原生（vue-router/vite 插件）扫描 vite.config 中
// routesFolder（本项目为 src/views/test）自动生成路由表，导出为 routes。
// 手写路由与约定式路由可并存，最终用 [...manualRoutes, ...routes] 合并即可。
import { routes, handleHotUpdate } from 'vue-router/auto-routes'
import { getToken } from '@/api/core/token'
import { usePermission } from '@/composables/usePermission'

// ==================== 手写路由（业务页接入方式） ====================
const manualRoutes = [
  // ====== 通用：模块总入口（业务模块选择菜单） + 关于 ======
  {
    path: '/',
    name: 'modules',
    component: () => import('../views/HomeView.vue'),
    meta: { title: '业务模块' },
  },
  {
    path: '/about',
    name: 'about',
    // route level code-splitting
    component: () => import('../views/AboutView.vue'),
  },

  // ============================================================
  // ====== vant 模块：底部 tabbar（首页 / 我的）包裹 vant 子目录页 ======
  // ============================================================
  {
    path: '/vant',
    component: () => import('../views/vant/MainLayout.vue'),
    children: [
      { path: '', name: 'vant-home', component: () => import('../views/vant/HomeView.vue') },
      {
        path: 'mine',
        name: 'vant-mine',
        component: () => import('../views/vant/MineView.vue'),
        meta: { title: '我的' },
      },
      // Vant 组件演示入口（在 tabbar 框架内展示）
      {
        path: 'index',
        name: 'vant-index',
        component: () => import('../views/vant/VantIndex.vue'),
        meta: { title: 'Vant 移动端' },
      },
    ],
  },
  // vant 业务组件演示（tabbar 框架外独立页）
  {
    path: '/vant/vant-select-field-demo',
    name: 'vant-select-field-demo',
    component: () => import('../views/vant/VantSelectFieldDemo.vue'),
    meta: { title: 'VantSelectField' },
  },
  {
    path: '/vant/vant-select-multiple-field-demo',
    name: 'vant-select-multiple-field-demo',
    component: () => import('../views/vant/VantSelectMultipleFieldDemo.vue'),
    meta: { title: 'VantSelectMultipleField' },
  },
  {
    path: '/vant/vant-time-picker-field-demo',
    name: 'vant-time-picker-field-demo',
    component: () => import('../views/vant/VantTimePickerFieldDemo.vue'),
    meta: { title: 'VantTimePickerField' },
  },
  {
    path: '/vant/vant-tree-select-field-demo',
    name: 'vant-tree-select-field-demo',
    component: () => import('../views/vant/VantTreeSelectFieldDemo.vue'),
    meta: { title: 'VantTreeSelectField' },
  },
  {
    path: '/vant/vant-tree-tags-field-demo',
    name: 'vant-tree-tags-field-demo',
    component: () => import('../views/vant/VantTreeTagsFieldDemo.vue'),
    meta: { title: 'VantTreeTagsField' },
  },
  {
    path: '/vant/vant-calendar-field-demo',
    name: 'vant-calendar-field-demo',
    component: () => import('../views/vant/VantCalendarFieldDemo.vue'),
    meta: { title: 'VantCalendarField' },
  },
  {
    path: '/vant/vant-search-demo',
    name: 'vant-search-demo',
    component: () => import('../views/vant/VantSearchDemo.vue'),
    meta: { title: 'VantSearch' },
  },
  {
    path: '/vant/vant-search-field-demo',
    name: 'vant-search-field-demo',
    component: () => import('../views/vant/VantSearchFieldDemo.vue'),
    meta: { title: 'VantSearchField' },
  },
  {
    path: '/vant/vant-upload-field-demo',
    name: 'vant-upload-field-demo',
    component: () => import('../views/vant/VantUploadDemo.vue'),
    meta: { title: 'VantUpload' },
  },
  {
    path: '/vant/vant-list-demo',
    name: 'vant-list-demo',
    component: () => import('../views/vant/VantListDemo.vue'),
    meta: { title: 'VantList' },
  },
  {
    path: '/vant/vant-list-nopage-demo',
    name: 'vant-list-nopage-demo',
    component: () => import('../views/vant/VantListNoPageDemo.vue'),
    meta: { title: 'VantList 不分页' },
  },
  {
    path: '/vant/vant-list-map-demo',
    name: 'vant-list-map-demo',
    component: () => import('../views/vant/VantListMapDemo.vue'),
    meta: { title: 'VantList 字段映射' },
  },
  {
    path: '/vant/vant-permission-demo',
    name: 'vant-permission-demo',
    component: () => import('../views/vant/VantPermissionDemo.vue'),
    meta: { title: '权限指令' },
  },
  {
    path: '/vant/vant-checkin-demo',
    name: 'vant-checkin-demo',
    component: () => import('../views/vant/VantCheckinDemo.vue'),
    meta: { title: '外出定位打卡' },
  },
  {
    path: '/vant/vant-checkin-field-demo',
    name: 'vant-checkin-field-demo',
    component: () => import('../views/vant/VantCheckinFieldDemo.vue'),
    meta: { title: '表单内打卡' },
  },
  {
    path: '/vant/vant-insurance-form-demo',
    name: 'vant-insurance-form-demo',
    component: () => import('../views/vant/VantInsuranceFormDemo.vue'),
    meta: { title: '保险报案表单' },
  },
  {
    path: '/vant/vant-login-demo',
    name: 'vant-login-demo',
    component: () => import('../views/vant/VantLoginDemo.vue'),
    meta: { title: 'VantLogin 登录', public: true },
  },
  {
    path: '/vant/vant-slider-verify-demo',
    name: 'vant-slider-verify-demo',
    component: () => import('../views/vant/VantSliderVerifyDemo.vue'),
    meta: { title: 'VantSliderVerify 滑块验证' },
  },
  // ============================================================
  // ====== ydl 模块（福建源动力平台） ======
  // ============================================================
  // ydl 站点登录页（白名单，独立于 tabbar 框架）
  {
    path: '/ydl/login',
    name: 'ydl-login',
    component: () => import('../views/ydl/SiteLoginView.vue'),
    meta: { title: '站点登录', public: true },
  },
  // ydl tabbar 框架
  {
    path: '/ydl',
    component: () => import('../views/ydl/MainLayout.vue'),
    children: [
      { path: '', name: 'ydl-home', component: () => import('../views/ydl/HomeView.vue') },
      {
        path: 'mine',
        name: 'ydl-mine',
        component: () => import('../views/ydl/MineView.vue'),
        meta: { title: '我的' },
      },
    ],
  },
  // ydl：VantList 综合示例（ydl 数据格式）
  {
    path: '/ydl/ydl-list-demo',
    name: 'ydl-list-demo',
    component: () => import('../views/ydl/YdlListDemo.vue'),
    meta: { title: 'VantList 示例（ydl）' },
  },
  // ydl：我的保源（保险来源）及详情子功能
  {
    path: '/ydl/my-insurance-source',
    name: 'ydl-my-insurance-source',
    component: () => import('../views/ydl/MyInsuranceSource.vue'),
    meta: { title: '我的保源' },
  },
  {
    path: '/ydl/my-insurance-active',
    name: 'ydl-my-insurance-active',
    component: () => import('../views/ydl/MyInsuranceActive.vue'),
    meta: { title: '活动量' },
  },
  {
    path: '/ydl/my-insurance-result',
    name: 'ydl-my-insurance-result',
    component: () => import('../views/ydl/MyInsuranceResult.vue'),
    meta: { title: '销售结果' },
  },
  // ydl：数据统计（§3 机构维度看板）
  {
    path: '/analysis',
    name: 'ydl-analysis',
    component: () => import('../views/ydl/AnalysisView.vue'),
    meta: { title: '数据汇总' },
  },
  {
    path: '/track-summary',
    name: 'ydl-track-summary',
    component: () => import('../views/ydl/TrackSummaryView.vue'),
    meta: { title: '跟踪统计' },
  },
  {
    path: '/user-summary',
    name: 'ydl-user-summary',
    component: () => import('../views/ydl/UserSummaryView.vue'),
    meta: { title: '劳效统计' },
  },
  // ydl：数据统计明细（§3.4 / §3.5 分页大表）
  {
    path: '/visit',
    name: 'ydl-visit',
    component: () => import('../views/ydl/VisitView.vue'),
    meta: { title: '拜访明细' },
  },
  {
    path: '/policy-summary',
    name: 'ydl-policy-summary',
    component: () => import('../views/ydl/PolicySummaryView.vue'),
    meta: { title: '签单明细' },
  },
  // ydl：工作台（§4.2 / §4.3）
  {
    path: '/fcdd-policy-main',
    name: 'ydl-fcdd-policy-main',
    component: () => import('../views/ydl/FcddPolicyMainView.vue'),
    meta: { title: '非车待续保跟踪' },
  },
  {
    path: '/monitor/track/visit',
    name: 'ydl-track-visit',
    component: () => import('../views/ydl/TrackVisitView.vue'),
    meta: { title: '拜访汇总' },
  },
  // ydl：千万级企业决策（§5）
  {
    path: '/JcEnterpriseItemList',
    name: 'ydl-jc-JcEnterpriseItemList',
    component: () => import('../views/ydl/JcEnterpriseItemListView.vue'),
    meta: { title: '客户渗透率' },
  },
  {
    path: '/JcEnterpriseRiskList',
    name: 'ydl-jc-JcEnterpriseRiskList',
    component: () => import('../views/ydl/JcEnterpriseRiskListView.vue'),
    meta: { title: '新续企业增量保费' },
  },
  // ydl：续保管理（非车，§6）
  {
    path: '/xb/renewedList',
    name: 'ydl-xb-renewedList',
    component: () => import('../views/ydl/XbRenewedListView.vue'),
    meta: { title: '我的续保' },
  },
  {
    path: '/xb/questionList',
    name: 'ydl-xb-questionList',
    component: () => import('../views/ydl/XbQuestionListView.vue'),
    meta: { title: '问题项目' },
  },
  {
    path: '/xb/endList',
    name: 'ydl-xb-endList',
    component: () => import('../views/ydl/XbEndListView.vue'),
    meta: { title: '项目终止' },
  },
  // ydl：车险续保管理（§7）
  {
    path: '/xbCar/renewedList',
    name: 'ydl-xbCar-renewedList',
    component: () => import('../views/ydl/XbCarRenewedListView.vue'),
    meta: { title: '车险我的续保' },
  },
  // ydl：领航足迹（§8）
  {
    path: '/lhzj',
    name: 'ydl-lhzj',
    component: () => import('../views/ydl/LhzjView.vue'),
    meta: { title: '我的领航' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [...manualRoutes, ...routes],
})

// 支持开发环境下的热更新（无需刷新页面即可更新路由）
if (import.meta.hot) {
  handleHotUpdate(router)
}

// ==================== 路由白名单（免登录可访问） ====================
// 配置方式有两种，满足「有些页面不用登录就能访问」：
//   1) 在 routeWhiteList 数组里列 path；
//   2) 任意路由定义里加 meta: { public: true }。
const LOGIN_PATH = '/vant/vant-login-demo' // vant 模块登录页
const SITE_LOGIN_PATH = '/ydl/login' // ydl 站点登录页
const routeWhiteList: string[] = [
  '/', // 模块总入口（业务模块选择菜单）
  '/about',
  // vant 白名单
  LOGIN_PATH, // vant 登录页自身必须可访问，否则未登录会无限重定向
  '/vant/vant-ins-icon-demo',
  // ydl 白名单
  SITE_LOGIN_PATH, // ydl 站点登录页自身必须可访问
]

// 扩展 RouteMeta 类型（title / public）
declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    /** 标记为公开路由：免登录即可访问 */
    public?: boolean
  }
}

router.beforeEach(async (to) => {
  const token = getToken()
  const isPublic = to.meta.public === true || routeWhiteList.includes(to.path)
  if (!token) {
    if (isPublic) return true
    // 未登录：ydl 模块跳站点登录页，其余跳 vant 登录页，并记录来源地址
    const login = to.path.startsWith('/ydl') ? SITE_LOGIN_PATH : LOGIN_PATH
    return { path: login, query: { redirect: to.fullPath } }
  }
  // 已登录：进入 ydl 站点模块（路由名以 ydl- 开头，含 /lhzj 等不以 /ydl 开头的页面）
  // 且菜单权限尚未加载时，用 token 拉一次真实权限树。
  // 注：仅凭 to.path.startsWith('/ydl') 会漏掉 /lhzj、/analysis 等独立路径的 ydl 页面，
  // 导致刷新后权限单例清空却未重新拉取（useCrudList 会 fallback 到角色权限，丢失 lhVisitInfo:*）。
  if (to.path.startsWith('/ydl') || to.name?.toString()?.startsWith('ydl-')) {
    const { menuAuth, loadPermissionsByToken } = usePermission()
    if (menuAuth.value.length === 0) {
      try {
        await loadPermissionsByToken(token)
      } catch {
        /* 拉权限失败不拦截，交由页面处理 */
      }
    }
  }
  return true
})

export default router
