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
    path: '/vant/vant-ins-icon-demo',
    name: 'vant-ins-icon-demo',
    component: () => import('../views/vant/VantInsIconDemo.vue'),
    meta: { title: 'VantInsIcon 图标' },
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
  {
    path: '/vant/vant-track-demo',
    name: 'vant-track-demo',
    component: () => import('../views/vant/VantTrackDemo.vue'),
    meta: { title: '操作记录' },
  },
  {
    path: '/vant/vant-record-demo',
    name: 'vant-record-demo',
    component: () => import('../views/vant/VantRecordDemo.vue'),
    meta: { title: '屏幕录屏' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [...manualRoutes, ...routes],
})

// 支持开发环境下的热更新（无需刷新页面即可更新路由）
// 注意需同时判断 `import.meta.hot.data`：单元测试（vitest）环境下 hot 对象存在但 data 为
// undefined，直接调用 handleHotUpdate 会抛 "Cannot set properties of undefined (setting 'router')"，
// 导致所有间接 import 本文件的测试套件整体收集失败。
if (import.meta.hot?.data) {
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
