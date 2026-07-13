# 架构参考（vant4-mobile-init）

本文件详述技能落地的各子系统实现要点与关键代码，便于在业务项目里扩展或排错。

---

## A. API 分层（`src/api`）

目录约定：
```
src/api/
  request.ts   # axios 实例 + 拦截器 + get/post/put/del
  types.ts     # PageParams / PageResult<T>
  modules/     # 按业务拆分：demo-renewal / demo-upload / permission
  index.ts     # 统一再导出
```

`request.ts` 关键设计：
- `baseURL: import.meta.env.VITE_API_BASE_URL || '/api'`
- 响应拦截器：`code === 0 || code === 200` 视为成功，直接 `return data`；否则 `reject(new BizError(code, message))`
- 统一返回结构：`ApiResponse<T> = { code, data, message }`

新增接口示例（`modules/demo-renewal.ts`）：
```ts
import { get, post } from '@/api/request'
export function getRenewalList(params: any) {
  return get<PageResult<Renewal>>('/demo/renewal/list', params)
}
export function uploadRenewalImage(fileName: string, base64: string) {
  return post<{ url: string; fileName: string }>('/demo/upload-file/image', { fileName, base64 })
}
```

---

## B. 本地 Mock 插件（`src/mock`）

`index.ts` 导出 `mockPlugin()`（vite 插件），核心能力：
1. `configureServer` 中用 `server.middlewares.use('/api', ...)` 拦截 mock 路由。
2. `server.middlewares.use('/demo-upload', ...)` 静态服务 `src/assets/demo-upload/*`，支持预览上传图片（含路径穿越防护）。
3. `matchRoute` 按「URL 长度降序」匹配，保证子路由不被父路由吞掉。

新增 mock 接口三步（**无需改 vite.config**）：
```ts
// 1) src/mock/foo.ts
import type { MockRoute } from './types'
const routes: MockRoute[] = [
  { url: '/foo/list', method: 'GET', response: () => ({ code: 200, data: [], message: 'ok' }) },
]
export default routes

// 2) 在 src/mock/index.ts 顶部 import 并展开
import fooRoutes from './foo'
const allRoutes = [/* ...已有 */ ...fooRoutes]
```

上传写盘（`demo-upload.ts`）：
- 接收 `{ fileName, base64 }` → `base64ToBuffer` → 写 `src/assets/demo-upload/<时间戳><ext>` → 返回 `{ url:'/demo-upload/xxx', fileName, base64 }`。
- 预览靠 B 节的 `/demo-upload` 静态服务，天然可用。

---

## C. 角色权限

`composables/usePermission.ts`（模块级单例，非 pinia store，故可在 `main.ts` 顶层安全调用）：
```ts
const currentRole = ref('admin')
const permissions = ref<string[]>([])
export function usePermission() {
  async function loadPermissions(role?: string) { /* 调 getUserPermissions */ }
  function hasAny(...perms: string[]) { return perms.some(p => permissions.value.includes(p)) }
  return { currentRole, permissions, loadPermissions, hasAny, /* ... */ }
}
```

`main.ts` 注册全局指令（无权限 `display:none`，角色切换后 `updated` 重算）：
```ts
const { hasAny } = usePermission()
function applyPermission(el, value) {
  const perms = Array.isArray(value) ? value : [value]
  el.style.display = hasAny(...perms) ? '' : 'none'
}
app.directive('permission', { mounted: applyPermission, updated: applyPermission })
```

页面用法：`<van-button v-permission="'car:edit'">编辑</van-button>`

行级差异化（`VantList` 的 `rowPermission` prop）：
```ts
:VantList :row-permission="(item) => ({ edit: item.status !== '已续保', delete: item.editable !== false })"
```
`rowCan(item, action)` 将「角色权限」与「item 字段」做「与」运算。

---

## D. 自由路由（约定式 + 手写）

`vite.config.ts`：
```ts
import VueRouter from 'vue-router/vite'
VueRouter({ routesFolder: 'src/views/test', dts: 'typed-router.d.ts' })
```

`src/router/index.ts`：
```ts
import { routes, handleHotUpdate } from 'vue-router/auto-routes'
const manualRoutes = [ /* 手写业务路由 */ ]
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [...manualRoutes, ...routes], // 手写 + 约定式并存
})
if (import.meta.hot) handleHotUpdate(router)
```

- 约定式：在 `src/views/test` 放 `xxx.vue` → 自动 `/xxx` 路由。
- 手写式：`manualRoutes` 里声明业务页（技能已内置 11 个 `/vant/*` 示例路由）。

---

## E. Vite 优化（`vite.config.ts`）

1. **代理自解析**：`parseProxyFromBaseURL(VITE_API_BASE_URL)` 提取 `prefix`/`target`；开发模式下把绝对 `VITE_API_BASE_URL` 用 `define` 重写为相对路径，让 axios 走 Vite proxy 解决跨域。
2. **Mock 切换**：`mode === 'mock'` 时挂载 `mockPlugin()`；否则自动启用 proxy 连真后端（对应 `pnpm dev:mock` vs `pnpm dev`）。
3. **组件按需**：`Components({ resolvers: [AntDesignVueResolver(), ElementPlusResolver(), VantResolver()] })`。
4. **包分析**：`visualizer({ open: true, gzipSize: true, brotliSize: true })` → 产物 `stats.html`。
5. **开发体验**：`vite-plugin-vue-devtools`、`@vitejs/plugin-vue-jsx`。

---

## F. 通用组件要点

- `VantUpload`：支持 `:upload` 回调（先上传拿回结果）与 `:result-field`（决定保存 `url`/`base64`/`fileName` 等返回结果中的任意键）。预览优先 `url`/`base64(data:)`/本地 ObjectURL。
- `VantList`：封装「搜索 + 更多筛选 + 列表 + 增删改 + 详情 + 删除确认 + 更多 ActionSheet + 权限门禁」，通过 `api` / `filters` / `actions` / `rowPermission` 配置驱动；内部复用 `useCrudList`。
- `useCrudList`：列表 CRUD + 分页 + 权限码（`prefix:action`）+ 角色切换自动重渲染（`permTick`）。

---

## H. 单元测试（Vitest + @vue/test-utils）

### H.1 配置要点（`vitest.config.ts`）
```ts
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

// vite.config 以「回调函数」形式导出，需先解析为普通对象才能 merge
// （Vite 8 的 mergeConfig 不支持直接合并回调形式的配置）
const resolvedVite =
  typeof viteConfig === 'function'
    ? viteConfig({ command: 'serve', mode: 'test' })
    : viteConfig

// 单元测试中移除 Components 插件：避免 VantResolver 在编译期注入 `import { X } from 'vant'`
// 及其 .css 副作用，导致 Node ESM 下报 ERR_UNKNOWN_FILE_EXTENSION
resolvedVite.plugins = (resolvedVite.plugins || [])
  .flat()
  .filter((p) => !/components/i.test(p?.name || ''))

export default mergeConfig(resolvedVite, defineConfig({
  test: {
    setupFiles: ['./src/test/setup.ts'],
    environment: 'jsdom',
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
}))
```

### H.2 全局 mock（`src/test/setup.ts`）
```ts
import { vi } from 'vitest'
vi.mock('vant', () => ({
  default: {},
  showToast: vi.fn(), showSuccessToast: vi.fn(),
  showFailToast: vi.fn(), showLoadingToast: vi.fn(), closeToast: vi.fn(),
}))
```

### H.3 写组件测试的坑
- `wrapper.emitted('x')` 返回 `[[args]]`（数组的数组），取真实入参用 `emitted('x')?.[0]?.[0]`。
- `script setup` 暴露的 `ref` 在 `wrapper.vm` 上**自动解包**：直接 `wrapper.vm.loading`，不要 `.value`。
- `shallowMount` 自动 stub 子组件；`<van-*>` 标签默认被 stub，无需真实加载 vant。
- `VantUpload` 单选模式 `update:modelValue` 回传**字符串**、多选取数组；测试 `afterRead` 需先把文件项 `push` 进内部 `fileList` 再断言 `item.value`。
- `VantTreeTagsField.onRowClick` 在折叠态点击父节点仅展开（`expanded` 为 `ref<Set>`，断言用 `expanded.value.has('zj')`）。
- 测试环境会出现 `[Vue warn]: injection "Symbol(router)" not found`，属无害噪音，不影响结果。

### H.4 运行
```bash
pnpm test:unit                                         # 全量（jsdom + vant mock）
pnpm test:unit src/components/__tests__/VantUpload.spec.ts  # 单文件
```

---

## G. 故障排查

- **`vue-router/auto-routes` 报缺类型**：运行一次 `pnpm dev` 由 vue-router 5 生成 `typed-router.d.ts`（技能内置占位声明，dev 后会被覆盖）。
- **上传图片预览 404**：确认 `src/assets/demo-upload` 目录存在（技能已带 `.gitkeep`）；mock 模式需重启 dev（`mock` 模块在 vite 启动时静态加载）。
- **`v-permission` 不生效**：确认 `src/main.ts` 已注册指令且 `usePermission` 已 `loadPermissions`（首次进入页面在 `useCrudList` 的 `onMounted` 中触发）。
- **改造现有项目后白屏**：默认初始化会跳过已有 `main.ts`/`App.vue`/`router`，请按 SKILL.md §0 手动合并入口与路由。
