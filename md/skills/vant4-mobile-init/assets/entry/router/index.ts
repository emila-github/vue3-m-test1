import { createRouter, createWebHistory } from 'vue-router'
// 自由路由（约定式 / 文件路由）：vue-router 5 原生（vue-router/vite 插件）扫描 vite.config 中
// routesFolder（本项目为 src/views/test）自动生成路由表，导出为 routes。
// 手写路由与约定式路由可并存，最终用 [...manualRoutes, ...routes] 合并即可。
import { routes, handleHotUpdate } from 'vue-router/auto-routes'

// ==================== 手写路由（业务页接入方式） ====================
const manualRoutes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/vant/VantIndex.vue'),
    meta: { title: 'Vant 移动端' },
  },
  // ====== Vant 移动端学习（演示业务页如何挂到路由） ======
  { path: '/vant/vant-select-field-demo', name: 'vant-select-field-demo', component: () => import('../views/vant/VantSelectFieldDemo.vue'), meta: { title: 'VantSelectField' } },
  { path: '/vant/vant-select-multiple-field-demo', name: 'vant-select-multiple-field-demo', component: () => import('../views/vant/VantSelectMultipleFieldDemo.vue'), meta: { title: 'VantSelectMultipleField' } },
  { path: '/vant/vant-time-picker-field-demo', name: 'vant-time-picker-field-demo', component: () => import('../views/vant/VantTimePickerFieldDemo.vue'), meta: { title: 'VantTimePickerField' } },
  { path: '/vant/vant-tree-select-field-demo', name: 'vant-tree-select-field-demo', component: () => import('../views/vant/VantTreeSelectFieldDemo.vue'), meta: { title: 'VantTreeSelectField' } },
  { path: '/vant/vant-tree-tags-field-demo', name: 'vant-tree-tags-field-demo', component: () => import('../views/vant/VantTreeTagsFieldDemo.vue'), meta: { title: 'VantTreeTagsField' } },
  { path: '/vant/vant-calendar-field-demo', name: 'vant-calendar-field-demo', component: () => import('../views/vant/VantCalendarFieldDemo.vue'), meta: { title: 'VantCalendarField' } },
  { path: '/vant/vant-search-demo', name: 'vant-search-demo', component: () => import('../views/vant/VantSearchDemo.vue'), meta: { title: 'VantSearch' } },
  { path: '/vant/vant-search-field-demo', name: 'vant-search-field-demo', component: () => import('../views/vant/VantSearchFieldDemo.vue'), meta: { title: 'VantSearchField' } },
  { path: '/vant/vant-upload-field-demo', name: 'vant-upload-field-demo', component: () => import('../views/vant/VantUploadDemo.vue'), meta: { title: 'VantUpload' } },
  { path: '/vant/vant-list-demo', name: 'vant-list-demo', component: () => import('../views/vant/VantListDemo.vue'), meta: { title: 'VantList' } },
  { path: '/vant/vant-permission-demo', name: 'vant-permission-demo', component: () => import('../views/vant/VantPermissionDemo.vue'), meta: { title: '权限指令' } },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [...manualRoutes, ...routes],
})

// 支持开发环境下的热更新（无需刷新页面即可更新路由）
if (import.meta.hot) {
  handleHotUpdate(router)
}

export default router
