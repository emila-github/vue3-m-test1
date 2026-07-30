import './assets/main.css'
import { initSkin } from './composables/useSkin'

// 移动端基础布局层：与皮肤开关无关，始终生效（修复 Vant 皮肤下页面排版错乱）。
// 须先于 vant-picc.css 引入，使 PICC 皮肤的 html.picc-skin 作用域规则能覆盖中性版。
import './styles/base-mobile.css'
import './styles/vant-picc.css'
// 全套主题（Vant 蓝 / 翡翠绿 / 琥珀橙 / 紫罗兰 / 青碧 / 玫瑰粉 / 暗夜）：
// 以 html.theme-<id> 提供主色与表面配套，须置于 vant-picc.css 之后。
import './styles/skins.css'
// 函数式组件（showToast/showLoadingToast/showConfirmDialog/showDialog 等）基于 Popup 渲染，
// 其定位/居中/边框样式不会由模板 <van-*> 的按需机制自动带入；这里显式引入，
// 确保任意页面的 toast 与二次确认弹窗都能正常显示。
import 'vant/es/toast/style'
import 'vant/es/dialog/style'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { initDevToken } from './api/core/token'
import {
  permissionDirective,
  permissionAllDirective,
  permissionNoneDirective,
  menuDirective,
  menuAllDirective,
} from './directives/permission'

// 开发期预置 token（VITE_DEV_TOKEN）：后端不可用时跳过登录，后续请求自动带 token。
// 需在挂载前执行，确保首屏发起的请求即可携带。生产环境不配置该变量则为空操作。
initDevToken()

const app = createApp(App)

app.use(createPinia())
app.use(router)
// 全局注册权限指令家族（配合 usePermission 单例）
app.directive('permission', permissionDirective) // 拥有任意一个即可见 (hasAny)
app.directive('permission-all', permissionAllDirective) // 必须拥有全部才可见 (hasAll)
app.directive('permission-none', permissionNoneDirective) // 拥有任意一个就隐藏 (hasNone)
app.directive('menu', menuDirective) // 菜单权限：拥有任意一个即可见 (hasMenuAny)
app.directive('menu-all', menuAllDirective) // 菜单权限：必须拥有全部才可见 (hasMenuAll)

initSkin('picc')
app.mount('#app')
