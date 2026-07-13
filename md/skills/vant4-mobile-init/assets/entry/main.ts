import './assets/main.css'
import 'vant/lib/index.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from './App.vue'
import router from './router'
import {
  permissionDirective,
  permissionAllDirective,
  permissionNoneDirective,
} from './directives/permission'

const app = createApp(App)

// ==================== 全局权限指令家族（依赖 usePermission 单例） ====================
// v-permission       拥有任意一个即可见 (hasAny)   <van-button v-permission="'car:edit'">
// v-permission-all   必须拥有全部才可见 (hasAll)   v-permission-all="['a','b']"
// v-permission-none  拥有任意一个就隐藏 (hasNone)  v-permission-none="'car:view'"
// 无权限时 display:none（规避 v-for 下 removeChild 的 DOM 复用问题），
// 并 watch 权限/角色变化，加载完成或角色切换后自动重新生效。
app.directive('permission', permissionDirective)
app.directive('permission-all', permissionAllDirective)
app.directive('permission-none', permissionNoneDirective)

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
app.use(pinia)
app.use(router)
app.mount('#app')
