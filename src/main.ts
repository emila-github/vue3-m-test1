import './assets/main.css'
import { initSkin } from './composables/usePiccSkin'

import './styles/vant-picc.css'
// 函数式组件（showToast/showLoadingToast/showConfirmDialog/showDialog 等）基于 Popup 渲染，
// 其定位/居中/边框样式不会由模板 <van-*> 的按需机制自动带入；这里显式引入，
// 确保任意页面的 toast 与二次确认弹窗都能正常显示。
import 'vant/es/toast/style'
import 'vant/es/dialog/style'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import {
  permissionDirective,
  permissionAllDirective,
  permissionNoneDirective,
  menuDirective,
  menuAllDirective,
} from './directives/permission'

const app = createApp(App)

app.use(createPinia())
app.use(router)
// 全局注册权限指令家族（配合 usePermission 单例）
app.directive('permission', permissionDirective) // 拥有任意一个即可见 (hasAny)
app.directive('permission-all', permissionAllDirective) // 必须拥有全部才可见 (hasAll)
app.directive('permission-none', permissionNoneDirective) // 拥有任意一个就隐藏 (hasNone)
app.directive('menu', menuDirective) // 菜单权限：拥有任意一个即可见 (hasMenuAny)
app.directive('menu-all', menuAllDirective) // 菜单权限：必须拥有全部才可见 (hasMenuAll)

initSkin(true)
app.mount('#app')
