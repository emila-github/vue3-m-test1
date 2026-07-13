import './assets/main.css'
import { initSkin } from './composables/usePiccSkin'

import './styles/vant-picc.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import {
  permissionDirective,
  permissionAllDirective,
  permissionNoneDirective,
} from './directives/permission'

const app = createApp(App)

app.use(createPinia())
app.use(router)
// 全局注册权限指令家族（配合 usePermission 单例）
app.directive('permission', permissionDirective) // 拥有任意一个即可见 (hasAny)
app.directive('permission-all', permissionAllDirective) // 必须拥有全部才可见 (hasAll)
app.directive('permission-none', permissionNoneDirective) // 拥有任意一个就隐藏 (hasNone)

initSkin(true)
app.mount('#app')
