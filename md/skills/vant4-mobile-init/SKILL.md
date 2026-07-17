---
name: vant4-mobile-init
description: >
  Vant4 移动端 Vue3 项目初始化 / 改造脚手架 + 组件选型顾问。一键落地「API 分层（axios 拦截 +
  模块化）+ 本地 Mock 插件（写盘上传 + 约定路由）+ 角色权限（v-permission 指令 + usePermission
  单例）+ 自由路由（vue-router 5 原生约定式 + 手写并存）+ Vite 优化（代理自解析 / Mock 插件 /
  组件按需 / 包分析）」的完整工程化能力，并附带 src/views/vant 下 16 个 Vant 示例页
  （VantIndex + 16 个 VantXXXXXDemo）及其对应的 12 个通用业务组件（VantList / VantUpload /
  VantSelectField / VantSelectMultipleField / VantTimePickerField / VantCalendarField /
  VantTreeSelectField / VantTreeTagsField / VantSearch / VantSearchField / VantCheckin /
  VantCheckinField）、composables（useCrudList / usePermission / usePiccSkin）与单元测试
  （Vitest + @vue/test-utils）。除初始化外，本技能还内置「组件选型指引」：当接到 Vant4 需求时，
  据此判断该用哪个自定义业务组件（而非从零写 van-*），例如「表单里的可搜索下拉」用 VantSearchField、
  「CRUD 列表页」用 VantList + useCrudList、「图片/证件上传」用 VantUpload、「定位打卡」用 VantCheckin(Field)。
  涉及「从零搭建 Vant4 移动端」「给现有 Vue3 项目接入 Vant4 移动端工程化」「套用本项目 Vant 示例」
  「实现某个 Vant4 移动端需求 / 页面 / 表单 / 列表」的任务必须加载此技能；若目标项目同时存在
  vant-picc-skin 技能则自动完成 PICC 皮肤初始化。
version: 1.2.0
license: MIT
metadata:
  author: 'PICC Design System'
  category: 'Scaffold / Vant4 / Mobile'
  tags: ['Vant4', 'Vue3', '移动端', '脚手架', 'API', 'Mock', '权限', '自由路由', 'Vite']
---

# Vant4 移动端工程化脚手架技能

本技能把一套**已在生产项目验证的 Vant4 移动端工程化能力**打包成可复用技能，用于：

1. **从零初始化**一个新的 Vant4 + Vue3 移动端项目（含完整 api / mock / 权限 / 自由路由 / Vite 优化）。
2. **改造现有** Vue3 项目，为其接入上述能力（不破坏你已有的入口与配置，除非 `--force`）。
3. 直接**带入本项目 `src/views/vant` 下 16 个示例页**（`VantIndex.vue` + 16 个 `VantXXXXXDemo.vue`）及其依赖的 12 个通用 `components` 与 `composables`，开箱即跑。
4. **组件选型顾问**：接到任意 Vant4 移动端需求时，先对照 [第 5 节「组件选型指引」](#5-组件选型指引接到-vant4-需求时先查这里)，判断能否复用本技能已封装的业务组件（`VantXXX`），**优先复用而非从零手写 `van-*`**。
5. 若目标项目已存在（或同级存在）**`vant-picc-skin`** 技能，则**自动完成 PICC Vant 皮肤初始化**。

> 技能自包含：`assets/` 内已打包真实源码（api / mock / composables / components / views/vant / styles / 配置），
> 把整个技能目录复制到任意 Vue3 项目后，运行 `assets/setup.mjs` 即可一键落地。

---

## 0. 初始化（核心用法）

把技能目录 `.codebuddy/skills/vant4-mobile-init` 复制/安装到目标 Vue3 项目后，在**目标项目根目录**运行：

```bash
# 全新项目 / 想整体覆盖配置
node <技能目录>/assets/setup.mjs --force

# 改造现有项目（保护已有 package.json / vite.config / main.ts / App.vue / router）
node <技能目录>/assets/setup.mjs

# 指定目标目录（默认当前目录）
node <技能目录>/assets/setup.mjs ../other-project

# 跳过 PICC 皮肤自动初始化
node <技能目录>/assets/setup.mjs --skip-skin
```

脚本行为（详见 `assets/setup.mjs`）：

| 步骤 | 内容 | 覆盖策略 |
|------|------|----------|
| 1 | `src` 脚手架：`api` / `mock` / `composables` / `components` / `views/vant` / `assets` / `styles` | 始终覆盖脚手架自带文件 |
| 2 | 根配置：`package.json` / `vite.config.ts` / `tsconfig*` / `.env*` / `env.d.ts` / `components.d.ts` / `index.html` / `eslint.config.ts` | 不存在才写；已存在且非 `--force` 跳过 |
| 3 | 入口：`src/main.ts` / `src/App.vue` / `src/router/index.ts` | 已存在且非 `--force` 跳过 |
| 4 | 自动应用 **PICC 皮肤**（若检测到 `vant-picc-skin` 技能） | — |

完成后：
```bash
pnpm install          # 新项目需先安装依赖
pnpm dev:mock         # 本地 Mock 模式（vite --mode mock），无需后端即可跑通全部示例
```

---

## 1. 工程化能力总览（技能落地的内容）

### 1.1 API 分层（`src/api`）
- `request.ts`：axios 实例 + 请求/响应拦截器；统一 `ApiResponse<T>`（`{code,data,message}`）、`BizError`；`get/post/put/del` 便捷方法；`code===0||200` 视为成功直接返回 `data`。
- `types.ts`：`PageParams` / `PageResult<T>` 分页类型。
- `modules/*.ts`：按业务拆分的 API（`demo-renewal` / `demo-upload` / `demo-claim` / `demo-customer` / `demo-idcard` / `demo-map` / `permission`），`index.ts` 统一再导出。
- 基础地址来自 `import.meta.env.VITE_API_BASE_URL`（见 `.env*`）。

### 1.2 本地 Mock 插件（`src/mock`）
- `index.ts`：`vite` 插件 `mockPlugin()`，拦截 `/api/*` 请求；并静态服务 `/demo-upload/*` → `src/assets/demo-upload/*`（上传文件预览）。
- `types.ts`：`MockRoute`；`matchRoute` 按「最长路径优先」匹配。
- 各业务文件 `export default routes`（如 `demo-renewal.ts` / `demo-upload.ts` / `demo-claim.ts` / `demo-customer.ts` / `demo-idcard.ts` / `demo-map.ts` / `permission.ts`），在 `index.ts` 底部合并即可新增接口，**无需改 vite.config**。
- 上传：文件以 base64 传入 → 写盘 `src/assets/demo-upload/` → 返回 `/demo-upload/文件名`，预览天然可用。

### 1.3 角色权限
- `composables/usePermission.ts`：模块级单例（`currentRole` / `permissions` / `hasAny` 等），切换角色全站同步；数据来自 `api/modules/permission`（由 `mock/permission.ts` 提供）。
- 全局指令 `v-permission`：在 `src/main.ts` 注册，无权限元素 `display:none`，角色切换后自动重算。
  ```vue
  <van-button v-permission="'car:edit'">编辑</van-button>
  <van-button v-permission="['car:edit','car:delete']">更多</van-button>
  ```

### 1.4 自由路由（约定式 + 手写并存）
- 约定式：`vite.config.ts` 用 vue-router 5 原生的 `VueRouter({ routesFolder: 'src/views/test', dts: 'typed-router.d.ts' })`（`vue-router/vite` 插件），在 `src/views/test` 放 `xxx.vue` 即自动得到 `/xxx` 路由。
- 手写式：`src/router/index.ts` 手写业务路由，并与 `...routes`（来自 `vue-router/auto-routes`）合并；支持 `handleHotUpdate` 热更新。
- 兼容性：vue-router 5 已内置自由路由，已废弃的 `unplugin-vue-router` 会在初始化时自动从目标项目 `package.json` 移除，避免与其冲突报错；若原项目 `vite.config` 用了 `UnpluginVueRouter()`，请用 `--force` 让技能覆盖为 `vue-router/vite`。

### 1.5 Vite 优化（`vite.config.ts`）
- **代理自解析**：从 `VITE_API_BASE_URL` 自动提取 `prefix`/`target` 配置 dev proxy；开发模式下把绝对 baseURL 重写为相对路径走代理（解决跨域）。
- **Mock 插件**：`mode==='mock'` 时挂载 `mockPlugin()`；非 mock 模式自动启用 proxy 连真后端。
- **组件按需**：`unplugin-vue-components` + `VantResolver`（Ant/Element 解析器亦保留，按需启用）。
- **包分析**：`rollup-plugin-visualizer` 打包后生成 `stats.html`。
- **开发体验**：`vite-plugin-vue-devtools`、`@vitejs/plugin-vue-jsx`。

### 1.6 单元测试（Vitest + @vue/test-utils）
- **配置**：`vitest.config.ts` 复用 `vite.config.ts`；因 Vite 8 的 `mergeConfig` 不支持合并回调式配置，先解析 `vite.config` 导出函数，并**过滤掉 `Components` 插件**（避免 VantResolver 在编译期注入 `import { X } from 'vant'` 及其 `.css` 副作用，导致 Node ESM 下 `ERR_UNKNOWN_FILE_EXTENSION`）；测试环境为 `jsdom`。
- **vant mock**：`src/test/setup.ts` 用 `vi.mock('vant', ...)` 全局 mock `vant`（仅 `VantUpload` 在脚本中 `import { showToast } from 'vant'`，其余 `van-*` 标签由 `shallowMount` 的 `global.stubs` 接管）。
- **测试范围**（组件 / composable / 指令全覆盖，`pnpm test:unit` 全绿）：
  - `src/components/__tests__/`：12 个 `VantXXX` 组件用例（字段回传 / 事件派发 / 权限门禁 / 上传回填 / 打卡回调）。
  - `src/composables/__tests__/`：`useCrudList`（分页 / CRUD / 权限码）、`usePermission`（单例角色权限）、`usePiccSkin`（皮肤挂载）。
  - `src/directives/__tests__/`：`v-permission` / `v-permission-all` / `v-permission-none` 三种指令。
- **断言要点**（写组件测试易踩的坑）：`wrapper.emitted('x')` 返回 `[[args]]`，取真实入参用 `emitted('x')?.[0]?.[0]`；`script setup` 暴露的 ref 在 `wrapper.vm` 上**已自动解包**（直接 `wrapper.vm.loading`，无需 `.value`）；`VantUpload` 单选 `update:modelValue` 回传**字符串**、多选取数组。

---

## 2. 附带示例（开箱即跑）

`src/views/vant` 下 16 个示例页（依赖的 `components` 与 `composables` 已一并打包）：

| 示例 | 演示要点 |
|------|----------|
| `VantIndex.vue` | 示例导航首页（16 个组件入口 + 核心组件速览） |
| `VantPermissionDemo.vue` | 权限指令 `v-permission` / `v-permission-all` / `v-permission-none` 三种全局指令，配合角色切换实时显隐 |
| `VantInsuranceFormDemo.vue` | **综合表单**：组合全部 `VantXXXField` + `VantUpload(field)` + `VantCheckinField` 的保险报案页，含新增 / 编辑回填 |
| `VantListDemo.vue` | 通用列表控件 `VantList`（增删改查 + 行级权限 `rowPermission` + 骨架屏 `skeletonCount` / `#skeleton` 插槽） |
| `VantListNoPageDemo.vue` | `VantList` **不分页**：mock 把全量数组直接放进 `data`，`useCrudList` 识别数组即 `finished` |
| `VantListMapDemo.vue` | `VantList` **字段映射**：配 `responseMap` / `requestMap` 对接返回 `records/totalCount`、入参 `current/size` 的异构后端 |
| `VantSelectFieldDemo.vue` / `VantSelectMultipleFieldDemo.vue` | 下拉单选 / 多选字段 |
| `VantTimePickerFieldDemo.vue` / `VantCalendarFieldDemo.vue` | 时间 / 日历字段 |
| `VantTreeSelectFieldDemo.vue` / `VantTreeTagsFieldDemo.vue` | 树型下拉 / 树型打标签 |
| `VantSearchDemo.vue` / `VantSearchFieldDemo.vue` | 动态搜索（独立） / 搜索字段（表单内） |
| `VantUploadDemo.vue` | 图片 / 证件上传（先上传拿回地址再随表单提交，支持 OCR 回填） |
| `VantCheckinDemo.vue` / `VantCheckinFieldDemo.vue` | 外出定位打卡（独立） / 表单内定位打卡字段 |

> **12 个通用业务组件**：`VantList` / `VantUpload` / `VantSearch` / `VantSearchField` / `VantSelectField` /
> `VantSelectMultipleField` / `VantTimePickerField` / `VantCalendarField` / `VantTreeSelectField` /
> `VantTreeTagsField` / `VantCheckin` / `VantCheckinField`。
> **通用 Hook**：`useCrudList`（列表 CRUD + 权限 + 分页）、`usePermission`（角色权限单例，供 `v-permission`
> 指令与 `useCrudList` 复用）、`usePiccSkin`（PICC 皮肤挂载）。
> 以上组件 / composables / directives 均配套单元测试用例（`__tests__/` 目录），初始化后可直接 `pnpm test:unit` 验证。

---

## 3. 工作流（在业务项目里使用）

1. 运行 `assets/setup.mjs` 初始化（新项目 `--force`，改造项目默认）。
2. `pnpm dev:mock` 启动，访问 `/vant` 即可看全部示例。
3. 新增业务页面：在 `src/views` 下建 `.vue`，并在 `src/router/index.ts` 手写路由（或放 `src/views/test` 走约定式）。
4. 调接口：在 `src/api/modules` 加 `xxx.ts`，页面 `import { ... } from '@/api/modules/xxx'`；无后端时在 `src/mock` 加对应路由。
5. 控权限：页面写 `v-permission="'xxx:edit'"`；行级差异化用 `VantList` 的 `:row-permission` 回调。
6. 接 PICC 皮肤：若已装 `vant-picc-skin` 技能，初始化时已自动接入；否则单独运行该技能。
7. 跑单测：`pnpm test:unit`（或 `pnpm test:unit <文件>` 单文件；`jsdom` 环境，已内置 vant mock，101 用例全绿）。

---

## 4. 可做 / 不可做

### 可做
- 把 api / mock / composables / components 当作基线直接复用、按需删减。
- 用 `VantList` + `useCrudList` 快速搭 CRUD 列表页。
- 用 `VantUpload` 的 `:upload` + `:result-field` 控制「先上传拿地址、保存 url/base64/fileName」。
- 用 `@vue/test-utils` + `vitest` 给 `VantXXX` 组件 / `useCrudList` / `usePermission` / `v-permission` 指令补回归测试（参考 `__tests__/` 目录写法）。

### 不可做
- 不要手动改 `src/mock/index.ts` 的路由匹配逻辑，新增接口只需在 `index.ts` 底部加 import 并展开。
- 不要删除 `v-permission` 指令注册（权限门禁依赖它）。
- 改造现有项目时慎用 `--force`，它会覆盖你已有的 `package.json` / `vite.config.ts` / `main.ts` / `App.vue` / `router`。

---

## 5. 组件选型指引（接到 Vant4 需求时先查这里）

> **核心原则**：接到任何 Vant4 移动端需求，**先判断能否复用本技能已封装的 12 个 `VantXXX` 业务组件，
> 优先复用、按需配置，而不是从零手写 `van-*` 组合**。这些组件已内置防抖 / 竞态保护 / 数据格式归一化 /
> 表单校验 / 权限门禁 / 皮肤适配等易错逻辑，直接用能省下大量重复劳动并避免踩坑。
> 只有当需求明显超出下表能力时，才回退到裸 `van-*` 或新写组件。

### 5.1 需求 → 组件 速查表

| 当你的需求是… | 用这个组件 | 关键点 / 别踩的坑 |
|---------------|-----------|-------------------|
| 一个「带增删改查 + 搜索 + 分页」的**列表页 / 管理页** | **`VantList`**（内部用 `useCrudList`） | 只传 `:api` + `filters` + 插槽即可；后端字段不一致用 `responseMap`/`requestMap`；行级权限用 `:row-permission` |
| 列表数据**不分页**（后端一次性返回全量数组） | **`VantList`**（同上） | mock/后端把数组直接放进 `data`，`useCrudList` 识别数组即 `finished`，无需额外配置（见 `VantListNoPageDemo`） |
| 只要 CRUD 逻辑、UI 想自己写 | **`useCrudList`**（组合式） | 单独用 hook，拿到 `list/loading/query/onLoad/create/update/remove` 自己渲染 |
| 表单里的**普通下拉单选**（车型、状态…） | **`VantSelectField`** | 支持字符串数组 / `{text,value}` / `valueKey`+`labelKey` / `format()` 四种数据格式 |
| 表单里的**下拉多选**（可限制最多选几个） | **`VantSelectMultipleField`** | 基于 Checkbox，`maxCount` 限制数量 |
| 表单里的**可搜索下拉**（远程联想 / 本地过滤） | **`VantSearchField`** | 放进 `van-form`；`:fetch` 远程或 `:options` 本地；已内置防抖 + 竞态保护 |
| **页面级**联想搜索框（非表单项，如顶部搜索） | **`VantSearch`** | 独立搜索面板，`:fetch` 返回结果数组；`select` 事件拿选中项 |
| **时间 / 日期**选择（time/date/datetime/year-month） | **`VantTimePickerField`** | `type` 切换粒度，支持 min/max 范围 |
| **日历**选日期（单选 / 区间 / 多选） | **`VantCalendarField`** | 区间 / 多选场景优先用它而非 TimePicker |
| **树型级联**单选（省市区、分类树） | **`VantTreeSelectField`** | 基于 Cascader，选叶子回显完整路径 |
| **树型多选 + 标签**回显（可删标签） | **`VantTreeTagsField`** | 分类打标签场景；`maxCount` 限制数量 |
| **图片 / 头像 / 证件 / 发票 / 附件上传** | **`VantUpload`** | `type` 选 `image/avatar/idcard/invoice/document`；`:upload` 传自定义上传函数；`resultField`/`fieldMap` 适配后端返回；身份证可配 `ocrField` 自动回填识别号 |
| 上传项要**放进 van-form 一起校验提交** | **`VantUpload`** + `field` | 传 `field`、`name`、`rules`，会额外渲染一行 `van-field` 参与表单校验 |
| **外出定位打卡**（地图 + 经纬度 + 地址 + 时间） | **`VantCheckin`** | 腾讯地图；微信内自动走 `wx.getLocation`；`mode` 控制一次/多次 |
| 打卡项要**作为表单字段**（弹层定位后回填 v-model） | **`VantCheckinField`** | 封装成 `van-field`，可放进 `van-form` |
| **元素级权限显隐**（按钮/入口按角色/权限点显示） | **`v-permission` 指令家族** | `v-permission`(任一)、`v-permission-all`(全部)、`v-permission-none`(排除)；数据来自 `usePermission` 单例 |
| 一个**综合业务表单**（多种字段 + 上传 + 打卡 + 新增/编辑回填） | 组合上述 `VantXXXField` | 直接参考 `VantInsuranceFormDemo.vue` 的写法与回填模式 |

### 5.2 判定流程（简版）

1. **是「列表 / 管理页」吗？** → `VantList`（要不分页/异构字段就配 `responseMap`/`requestMap`）；只想要逻辑就 `useCrudList`。
2. **是「表单里的某种输入项」吗？** → 按数据形态选 `VantSelectField` / `VantSelectMultipleField` /
   `VantSearchField` / `VantTimePickerField` / `VantCalendarField` / `VantTreeSelectField` /
   `VantTreeTagsField` / `VantUpload(field)` / `VantCheckinField`。这些都是 `van-field` 形态，能直接进 `van-form`。
3. **是「页面级搜索 / 独立打卡」吗？** → `VantSearch` / `VantCheckin`（非表单项版本）。
4. **是「按权限显隐 UI」吗？** → `v-permission` 指令家族，不要自己写 `v-if=角色判断`。
5. **以上都不匹配** → 再用裸 `van-*` 组合，或参考 `references/architecture.md` 新写一个可复用组件（沿用现有 props 归一化 / 事件命名约定）。

### 5.3 通用约定（所有 `VantXXXField` 组件共享）

- **数据格式统一可配**：可传字符串/数字数组、`{text,value}` 对象数组、`valueKey`/`labelKey` 指定字段，或 `format()` 完全自定义归一化。
- **`v-model` 回写**：字段组件均支持 `v-model`；`VantUpload` 单选回写 `string`、多选回写 `string[]`。
- **可直接进 `van-form`**：`XxxField` 系列渲染为 `van-field`，支持 `label` / `required` / `rules` / `name`，参与表单校验与提交。
- **皮肤自适应**：若启用 `vant-picc-skin`，这些组件自动继承 PICC 品牌样式，无需改组件代码。

---

## 参考
- `references/architecture.md`：各子系统实现细节 + 关键代码片段。
- `assets/`：真实可运行源码（初始化脚本会复制到目标项目）；`assets/src` 已同步最新 16 个示例页与 12 个组件。
- 皮肤联动：`vant-picc-skin` 技能（存在时本技能自动调用其 `setup.mjs`）。
