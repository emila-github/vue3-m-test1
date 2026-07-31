# API 层封装与工厂模式 —— 实现原理、扩展指南与使用示例

> 适用版本：本仓库 `src/api` 当前实现（`createClient` 工厂 + 适配器策略 + 回放网关）
> 阅读对象：需要**新增模块后端格式**、**排查请求链路**、**对接回放/拦截**、或**接手维护本层**的前端同学

---

## 0. 这份文档解决什么

- 讲清 `src/api` 里**工厂模式到底用在哪**、为什么这么设计（第 2 章）；
- 逐字段解释**两个适配器接口**和工厂入参/出参契约（第 3 章）；
- 完整还原一个请求从发起 → 拦截器 → 回放网关劫持 → 适配器解包 → 业务异常的**整改全过程**（第 4 章）；
- 说明 **Token 鉴权**与**后端如何识别/阻止回放流量**（第 5、4.6 章）；
- 给出**新增第三种前后端数据格式工厂**的标准步骤与可 Copy-Paste 模板（第 7 章）；
- 提供 **vant / ydl / track / 自定义** 等真实调用示例（第 8 章）；
- 补充**环境变量、代理与 mock 链路**、设计约定与 FAQ（第 9–11 章）。

---

## 1. 整体架构概览

### 1.1 目录结构

```
src/api/
├── core/                      # 与具体业务/格式无关的核心（可复用于任意模块目录）
│   ├── types.ts               # 抽象契约：ResponseAdapter / PaginationAdapter / ClientOptions / ApiClient
│   ├── adapters.ts            # 内置格式实现：vantFormat / ydlFormat / ydlPagination / defaultPagination
│   ├── http.ts                # createClient 工厂 + BizError + applyReplayGate（回放网关接入）
│   ├── token.ts               # token 存取 + 请求头字段名（可配置）
│   └── replayGate.ts          # 回放请求网关（模块级单例）
├── request.ts                 # 默认客户端（vant 格式），向后兼容原 get/post/put/del/instance
├── types.ts                   # 公共类型：PageParams / PageResult / ApiResponse
├── modules/                   # 按业务拆分；不同模块目录可挂不同客户端
│   ├── login.ts               # 共享/演示登录 API（沿用默认 vant 客户端）
│   ├── permission.ts
│   ├── demo-*.ts              # 演示模块，全部走默认 vant 客户端（/api 前缀）
│   ├── track.ts               # 操作记录上报（走默认 vant 客户端）
│   └── (ydl/、站点鉴权等)      # 各自拥有独立客户端/格式
│       ├── ydl/client.ts      # ydlClient = createClient({ adapter: ydlFormat, pagination: ydlPagination, baseURL: '/ydl-api' })
│       ├── ydl/ydl-renewal.ts # 业务 API（JeecgBoot 风格）
│       └── ydl-site-auth.ts   # 站点鉴权链路（独立 baseURL，见 vite.config 的 VITE_SITE_*）
└── index.ts                   # 统一导出入口
```

### 1.2 分层职责

| 层 | 文件 | 职责 | 是否关心"后端长什么样" |
| --- | --- | --- | --- |
| 抽象契约 | `core/types.ts` | 定义 `ResponseAdapter` / `PaginationAdapter` / `ClientOptions` / `ApiClient` 接口 | 否（只定义规则） |
| 格式实现 | `core/adapters.ts` | 提供 vant / ydl 两套具体格式 + 兜底分页 | 是（每个 adapter 描述一种后端） |
| 工厂 | `core/http.ts` | 用 adapter 构造 axios 实例、拦截器、便捷方法，**逻辑只写一遍** | 否（只依赖抽象） |
| 网关 | `core/replayGate.ts` + `http.ts#applyReplayGate` | 回放时劫持请求/打标记 | 否 |
| 客户端 | `request.ts` / `modules/*/client.ts` | 用工厂 + 具体 adapter 实例化一个"某格式的客户端" | 是（选哪个 adapter） |
| 业务 | `modules/*.ts` | 拼 URL、定义数据模型、导出 API 函数 | 否（拿到的已是通用 `T` / `PageResult<T>`） |

### 1.3 设计思想一句话总结

> **工厂 `createClient` 只依赖两个抽象（`ResponseAdapter`、`PaginationAdapter`）；具体"后端长什么样"通过策略对象注入。**
> 于是"新增一种前后端数据格式"= "新增一对 adapter"，**核心拦截器、异常、分页逻辑一行都不用改**，符合开闭原则（OCP）。

---

## 2. 工厂模式原理（核心）

### 2.1 这里的"工厂"指什么

`createClient(options: ClientOptions): ApiClient` 是一个**工厂函数**（更准确说是"带策略注入的参数化工厂"）。

- 输入：一组**配置/策略**（`adapter`、`pagination`、`baseURL`、`onRequest`、`onAuthFail` 等）；
- 输出：一个**已经配好一切**的 `ApiClient` 实例（`{ instance, get, post, put, del, paginate }`）；
- 调用方拿到的永远是**统一形态**的客户端，看不见 axios 细节，也看不见后端格式差异。

```ts
// src/api/core/http.ts
export function createClient(options: ClientOptions): ApiClient {
  const adapter = options.adapter
  const pagination = options.pagination ?? defaultPagination
  const instance = axios.create({ baseURL: ..., timeout: ..., headers: {...} })
  // 注册请求/响应拦截器、get/post/put/del/paginate ...
  return { instance, get, post, put, del, paginate }
}
```

### 2.2 两个抽象接口（策略模式）

工厂之所以能适配任意后端，是因为它把"**怎么解析响应**"和"**怎么换算分页**"抽象成了两个接口，由调用方注入具体实现：

```ts
// src/api/core/types.ts
export interface ResponseAdapter {
  isSuccess: (raw: any) => boolean          // 这一包响应算不算业务成功？
  extractData: (raw: any) => any            // 业务数据藏在哪里？（data / result / payload...）
  extractMessage: (raw: any) => string      // 失败时的提示文案
  extractCode: (raw: any) => number | undefined // 业务 code（用于 401/403 特殊处理）
}

export interface PaginationAdapter {
  toParams: (p: PageParams) => Record<string, any>     // 通用 {page,pageSize} → 后端要的 {current,size}
  fromResult: (raw: any) => PageResult<any>            // 后端 {records,total,...} → 通用 {list,total,...}
}
```

`createClient` 在内部只调用这四个方法，从不直接写 `raw.data` 或 `raw.result`——**这就是依赖倒置（DIP）**：高层（工厂）依赖抽象，低层（具体格式）实现抽象。

### 2.3 工厂内部做了什么（生命周期）

`createClient` 一次性完成 5 件事：

1. **创建 axios 实例**：`baseURL` 优先级 `options.baseURL` > `VITE_API_BASE_URL` > `/api`；默认 `timeout=15000`、`Content-Type=application/json`。
2. **装请求拦截器**：追加防缓存时间戳 `t`、注入 token、执行 `onRequest` 钩子、接入回放网关 `applyReplayGate`。
3. **装响应拦截器**：成功则**录制缓存**（供回放）+ `extractData` 解包；失败则 `extractMessage/extractCode` 后 `reject(new BizError(...))`；401/403/510 触发 `onAuthFail`。
4. **生成便捷方法** `get/post/put/del`：薄封装 `instance.xxx`，统一返回 `Promise<T>`。
5. **生成 `paginate`**：内部 `get` 后用 `pagination.fromResult` 把原始响应转成通用 `PageResult<T>`。

### 2.4 为什么这样设计（设计原则落地）

| 原则 | 体现 |
| --- | --- |
| 开闭原则 OCP | 新增格式 = 新增 adapter，工厂及拦截器零改动 |
| 单一职责 SRP | 工厂只管"装配"；格式解析归 adapter；token 归 `token.ts`；回放归 `replayGate` |
| 依赖倒置 DIP | 工厂依赖 `ResponseAdapter` 抽象，而非 `vantFormat`/`ydlFormat` 具体实现 |
| 策略模式 Strategy | 同一套工厂，换 adapter 即换"后端格式策略" |
| 关注点分离 | 业务 API 只写 URL + 数据模型，不碰 axios/格式 |

### 2.5 请求 / 响应时序图

```
[调用方]                      [createClient 产物]                [axios 管线]               [后端]
   │                              │                                  │                        │
   │─ get<T>('/x', params) ─────>│                                  │                        │
   │                              │─ instance.get(url,{params}) ───>│                        │
   │                              │                                  │─ 请求拦截器 ──────────>│
   │                              │                                  │   · 加 t 时间戳         │
   │                              │                                  │   · 注入 token          │
   │                              │                                  │   · applyReplayGate()   │
   │                              │                                  │        ├─ 回放本地? → 替换 adapter 直接返回
   │                              │                                  │        └─ 真实回放? → 加 ?te + X-Track-Replay
   │                              │                                  │                        │
   │                              │                                  │<─ 响应拦截器 ───────────│
   │                              │                                     · isSuccess?            │
   │                              │                                        ├─ 是 → record 缓存 + extractData
   │                              │                                        └─ 否 → BizError reject
   │<─ Promise<T> (业务数据) ─────│                                  │                        │
```

---

## 3. 适配器（Adapter）详解

### 3.1 `ResponseAdapter` 四方法契约

| 方法 | 入参 | 返回 | 何时被调用 | 说明 |
| --- | --- | --- | --- | --- |
| `isSuccess` | 原始响应 `raw` | `boolean` | 响应拦截器第一步 | `true` 才走 `extractData`；否则走失败分支 |
| `extractData` | 原始响应 `raw` | 业务数据 | 成功时 | 取出 `data`/`result`/`payload`，这是调用方 `await` 拿到的东西 |
| `extractMessage` | 原始响应 `raw` | `string` | 失败时 | 用于 `BizError.message` 弹 toast |
| `extractCode` | 原始响应 `raw` | `number \| undefined` | 失败时 | 用于 `401/403/510` 判断触发 `onAuthFail` |

> ⚠️ 业务内的"二级判定"（如 ydl 的 `getWxUserInfo` 内层 `result.code==='00'` 表示未绑定）**不要塞进适配器**，应在 composable 拿到 `result` 后再判。适配器只负责"包络层"的成功/数据。

### 3.2 `PaginationAdapter` 双向映射

- `toParams(p: PageParams)`：把前端统一的 `{ page, pageSize }` 转成后端要的入参（`{ current, size }` / `{ idx, limit }`）。
- `fromResult(raw)`：把后端返回的分页结构（`records/total/current/size`）转回通用 `PageResult<T>`（`{ list, total, page, pageSize }`）。

调用方（如 `VantList` / `useCrudList`）始终只认通用结构，**完全不知道后端用的是 `records` 还是 `list`**。

### 3.3 `ClientOptions` 全字段

```ts
export interface ClientOptions {
  adapter: ResponseAdapter          // 必填：决定如何解析后端包络
  pagination?: PaginationAdapter    // 可选：不填 → defaultPagination（同构 {page,pageSize,list,total}）
  baseURL?: string                  // 缺省：VITE_API_BASE_URL → /api
  timeout?: number                  // 缺省 15000
  withTimestamp?: boolean           // 缺省 true：自动加 ?t=Date.now() 防缓存
  onRequest?: (config) => void      // 请求前钩子（注入租户号/多语言等）
  onAuthFail?: (code: number) => void // 401/403/510 钩子，缺省仅 console.warn
}
```

### 3.4 `ApiClient` 对外能力

```ts
export interface ApiClient {
  instance: AxiosInstance                              // 原始实例（高级用法）
  get/post/put/del: <T>(url, params|data?, config?) => Promise<T>
  paginate: <T>(url, pageParams: PageParams, config?) => Promise<PageResult<T>>
}
```

### 3.5 内置实现清单

| 名称 | 类型 | 成功判定 | 数据位置 | 备注 |
| --- | --- | --- | --- | --- |
| `vantFormat` | `ResponseAdapter` | `code===0 \|\| code===200` | `data` | 默认 vant 包络 `{code,data,message}` |
| `ydlFormat` | `ResponseAdapter` | `success===true \|\| code===0 \|\| code===200` | `result` | JeecgBoot 风格 `{success,message,code,result,timestamp}`，兼容鉴权类(`code:0`)与业务类(`success:true`)两套语义 |
| `defaultPagination` | `PaginationAdapter` | — | — | 同构 `{page,pageSize} ↔ {list,total,page,pageSize}`；工厂兜底 |
| `ydlPagination` | `PaginationAdapter` | — | — | 入参 `current/size`，出参 `records/total/current/size/pages` |

### 3.6 两种格式对照表（现网事实）

| 维度 | vant（默认） | ydl（JeecgBoot） |
| --- | --- | --- |
| 响应包络 | `{ code, data, message }` | `{ success, message, code, result, timestamp }` |
| 成功判定 | `code===0 \|\| 200` | `success===true` |
| 业务数据位置 | `data` | `result` |
| 分页入参 | `page / pageSize` | `current / size` |
| 分页出参 | `list / total / page / pageSize` | `records / total / current / size / pages` |

---

## 4. 请求整改（拦截）原理全过程

"整改请求"指：**请求在生命周期中被拦截器/网关改写、劫持或模拟**——这是本层最容易被忽略但最关键的能力，尤其是配合回放系统。

### 4.1 请求发出后的完整链路

```
调用方 API 函数
   │
   ▼
get/post/put/del ──► instance.request(config)
   │
   ▼
【请求拦截器】（core/http.ts）
   1. withTimestamp：config.params.t = Date.now()
   2. 注入 token：config.headers[TOKEN_HEADER] = getToken()
   3. options.onRequest?.(config)   // 自定义钩子
   4. applyReplayGate(config)        // ★ 回放网关介入（见 4.3）
   │
   ▼
【真正发送】 或 【被替换 adapter 本地模拟】
   │
   ▼
【响应拦截器】（core/http.ts）
   1. adapter.isSuccess(raw) ?
      ├─ true  → replayGate.record(...) 缓存（供回放）
      │          return adapter.extractData(raw)   // 调用方拿到业务数据
      └─ false → 取 code/message
                  ├─ code∈{401,403,510} 且非 __skipAuthFail → onAuthFail(code)
                  └─ reject(new BizError(code, message, raw))
   2. 网络错误(err) → reject(new BizError(status, message, data))
```

### 4.2 请求拦截器（`http.ts`）

```ts
instance.interceptors.request.use((config) => {
  if (options.withTimestamp !== false) config.params = { ...config.params, t: Date.now() }
  const token = getToken()
  if (token) config.headers[TOKEN_HEADER] = token          // 字段名来自环境变量 VITE_TOKEN_HEADER
  options.onRequest?.(config)
  applyReplayGate(config)                                   // ★ 回放网关
  return config
})
```

### 4.3 回放网关 `applyReplayGate` 三态

```ts
function applyReplayGate(config) {
  if (!replayGate.isReplaying()) return                    // ① 非回放：原样放行，正常打后端
  if (replayGate.isRealReplay()) {
    const tag = replayGate.teMarker()                      // ② 真实回放：放行 + 打 te 标记
    if (tag) {
      config.params = { ...config.params, te: tag }        //     query ?te=会话id
      config.headers['X-Track-Replay'] = tag               //     header X-Track-Replay
    }
  } else {
    config.adapter = (() => Promise.resolve(               // ③ 本地模拟：替换最底层 adapter
      replayGate.buildLocalResponse(config))) as any        //     直接返回缓存/兜底，绝不发网络请求
  }
}
```

三态语义：

| 状态 | 触发条件 | 网络行为 | 用途 |
| --- | --- | --- | --- |
| ① 录制中 / 普通浏览 | `isReplaying()===false` | 正常请求后端 | 采集数据 + 缓存 GET 成功响应 |
| ② 真实回放 | `isReplaying() && isRealReplay()` | 放行到后端 | 用户主动要"真打后端验证"，但带 `te` 标记让后端识别 |
| ③ 本地模拟回放 | `isReplaying() && !isRealReplay()` | **不发请求**（adapter 被替换） | 默认回放：用录制缓存/兜底响应，避免对线上产生副作用 |

> **重点**：本地模拟的"阻止请求"是**在 axios 最底层 `adapter` 上做替换**，从源头就不产生网络调用——不是拦截响应，而是根本不发。这正是"后端回放阻止请求"在前端侧的落地方式：默认回放下，请求在浏览器侧就被消化掉了。

### 4.4 回放网关单例内部机制（`replayGate.ts`）

`replayGate` 是一个模块级单例（刻意不依赖 track 插件，避免与 http 形成循环依赖）：

- **缓存 key**（`buildKey`）：`方法 + URL + 序列化(params) + 序列化(data)`。注意会 `stripTs` 递归剔除 `t`/`_t` 字段，保证"录制时"和"回放时"的 key 一致（否则录制缓存命中不了）。
- **`record(method,url,params,data,raw)`**：仅当**非回放**且**GET**成功时，把 `raw`（含后端完整包络）存入 `cache`。回放中不记录，避免覆盖。
- **`lookup(...)`**：回放且非真实时，按 key 取缓存；命中返回原包络（与后端结构一致，响应拦截器照常解析），未命中返回 `undefined`。
- **`buildLocalResponse(config)`**：构造一个合法的 `AxiosResponse`：
  - 命中缓存 → 原样返回 `cached`；
  - 未命中 → 安全兜底 `{ code: 0, data: [], message: 'replay-local' }`（列表类返回空数组更友好，避免回放因缺数据报错）。
- **`teMarker()`**：真实回放时返回会话 id（缺省 `'1'`），非真实回放返回空串。
- 状态由回放 composable 在 `play/stop` 时写入：`setReplaying(true/false)`、`setRealReplay(...)`、`setSession(id)`。

### 4.5 响应拦截器（`http.ts`）

```ts
instance.interceptors.response.use(
  (res) => {
    const raw = res.data, cfg = res.config
    if (adapter.isSuccess(raw)) {
      replayGate.record(cfg.method||'GET', cfg.url||'', cfg.params, cfg.data, raw) // 录制缓存
      return adapter.extractData(raw)                                              // 解包业务数据
    }
    const code = adapter.extractCode(raw)
    const message = adapter.extractMessage(raw)
    if (code === 401 || code === 403 || code === 510) {
      if (!(res.config as any).__skipAuthFail) options.onAuthFail?.(code)          // 鉴权失败钩子
    }
    return Promise.reject(new BizError(code ?? -1, message, raw))
  },
  (err) => {  // 网络层错误（404/500/超时等）
    const data = err?.response?.data
    const message = data?.message ?? data?.msg ?? err?.message ?? '网络异常'
    return Promise.reject(new BizError(err?.response?.status ?? -1, message, data))
  },
)
```

### 4.6 后端如何"阻止 / 识别"回放请求（要给后端配置的）

前端在**真实回放**模式下会给请求打两类标记（见 4.3 ②）：

- **Query 参数**：`?te=<会话id>`（track event 标记）；
- **请求头**：`X-Track-Replay: <会话id>`。

这意味着后端要做的配置/约定是：

1. **识别回放流量**：后端网关/接口读取 `X-Track-Replay` 头（或 `te` 参数），将其视为"回放会话"。
2. **副作用隔离**：对 `te` 标记的请求，建议**不写业务审计、不触发短信/推送、不落真实业务流水**，或路由到影子库/只读副本，避免回放污染线上数据。
3. **幂等保护**：即便前端默认回放已不发请求（4.3 ③），但**真实回放**会真打后端，后端必须对这类流量做安全隔离——这是前后端配合的关键点。
4. **默认回放前端侧已自消化**：若使用本地模拟（非真实回放），请求根本到不了后端，后端无需任何改动；只有"真实回放"场景才需要上述识别与隔离。

> 一句话交代前端能做的边界：前端只能决定"发不发"和"带不带标记"；**是否真正阻止/隔离**，由后端依据 `X-Track-Replay` / `te` 实现。本层已把标记打齐，剩下的拦截策略属于后端职责。

### 4.7 真实回放 vs 本地模拟 对比

| 对比项 | 本地模拟（默认） | 真实回放 |
| --- | --- | --- |
| 是否发网络请求 | 否（adapter 替换） | 是 |
| 数据来源 | 录制缓存 / 兜底 | 真实后端 |
| 对线上影响 | 无 | 有（需后端隔离） |
| 标记 | 无 | `?te` + `X-Track-Replay` |
| 适用 | 回放演示/验证 UI 行为 | 验证真实接口链路 |

---

## 5. Token 与鉴权机制（`core/token.ts`）

- **字段名可配置**：`VITE_TOKEN_HEADER`（缺省 `X-Access-Token`）。请求时通过 `getToken()` 读取并注入 `config.headers[TOKEN_HEADER]`，**不写死在代码里**。
- **存储 key 可配置**：`VITE_TOKEN_STORAGE_KEY`（缺省 `app_token`）；用户信息 key 自动派生为 `${key}_user`。
- **开发预置 token**（`VITE_DEV_TOKEN`）：
  - 在 `.env.development` 配一个真实 token，`main.ts` 启动时 `initDevToken()` 自动写入本地存储；
  - 一旦配置，`getToken()` **始终返回它**，`setToken()` 变 no-op → 所有请求（含企业微信登录 mock 流程）都带这个强制 token，不会被登录换来的 token 顶替；
  - 生产环境**不应**配置该变量。
- **统一登出**：`clearAuth()` = `clearToken()` + `clearUserInfo()`，并触发 `onAuthFail` 跳转登录。
- **`__skipAuthFail` 特殊标记**：如登出接口本身目标就是去登录页，不需要 `onAuthFail` 抢跳（会与本地清理/跳转竞争导致闪烁/错误回跳）。在单个请求 config 上置 `__skipAuthFail=true` 即可跳过鉴权失败处理（见响应拦截器 4.5）。

---

## 6. 现有客户端实例清单

### 6.1 命名约定

- 默认 vant 客户端：`request.ts` 导出 `instance/get/post/put/del`；
- 某模块专属客户端：`modules/<dir>/client.ts` 导出 `<dir>Client` + `<dir>Get/<dir>Post/...`；
- 统一从 `src/api/index.ts` 或 `src/api/modules/...` 引入。

### 6.2 默认 vant 客户端（`request.ts`）

```ts
import { createClient } from './core/http'
import { vantFormat } from './core/adapters'

const client = createClient({ adapter: vantFormat, withTimestamp: true })
export const instance = client.instance
export const get = client.get
export const post = client.post
export const put = client.put
export const del = client.del
export { BizError } from './core/http'
export type { ApiResponse } from './types'
```

> 注释明确指出：其它模块目录后端格式不同，请各自在 `src/api/modules/<dir>/client.ts` 用 `createClient({ adapter, pagination, baseURL })` 创建，详见 `src/api/README.md`。

### 6.3 ydl 客户端（`modules/ydl/client.ts`）

```ts
import { createClient } from '../../core/http'
import { ydlFormat, ydlPagination } from '../../core/adapters'

export const ydlClient = createClient({
  adapter: ydlFormat,
  pagination: ydlPagination,
  baseURL: (import.meta.env.VITE_YDL_API_BASE_URL as string) || '/ydl-api',
  withTimestamp: true,
})

export const { instance: ydlInstance, get: ydlGet, post: ydlPost, put: ydlPut, del: ydlDel, paginate: ydlPaginate } = ydlClient
```

### 6.4 站点鉴权链路（独立 baseURL）

`vite.config.ts` 中还存在 `VITE_SITE_API_BASE_URL`、`VITE_SITE_WX_API_BASE_URL` 两条站点鉴权链路（同 host、前缀不同），对应 `src/api/modules/ydl-site-auth.ts` 等，使用各自的 baseURL 与（必要时）独立 adapter。其工厂用法与 ydl 完全一致，仅 `baseURL` 与格式策略不同。新增站点链路时，复制 ydl 客户端的写法并替换 adapter/baseURL 即可。

---

## 7. 如何新增第三种前后端数据格式工厂（重点）

### 7.1 判定：什么时候需要新工厂

出现以下任一情况，就应为该模块目录新建客户端 + adapter，**不要复用 vant/ydl 客户端**：

- 后端响应的**包络字段名不同**（如 `{ ok, payload }` 而非 `data`/`result`）；
- 成功判定逻辑不同（如 `ok===true` 而非 `code===0`）；
- 分页的**入参/出参字段名不同**（如 `idx/limit/rows`）；
- 需要**独立 baseURL**（不同域名/前缀）；
- 需要注入特有请求头（租户号、渠道标识等，可用 `onRequest` 或自定义 adapter 层处理）。

> 如果仅是"同一份 vant 格式、不同业务 URL"，**直接复用默认 `get/post/put/del`** 即可，无需新工厂。

### 7.2 步骤一：在 `core/adapters.ts` 定义格式适配器

```ts
// src/api/core/adapters.ts（追加）
export const abcFormat: ResponseAdapter = {
  isSuccess: (r) => !!r && r.ok === true,                 // 以 ok 判定成功
  extractData: (r) => r?.payload,                        // 业务数据在 payload
  extractMessage: (r) => r?.msg ?? '请求失败',
  extractCode: (r) => r?.code,
}

export const abcPagination: PaginationAdapter = {
  toParams: (p) => ({ idx: p.page, limit: p.pageSize }), // 入参 idx/limit
  fromResult: (raw) => ({
    list: raw?.rows ?? [],
    total: raw?.total ?? 0,
    page: raw?.idx ?? 1,
    pageSize: raw?.limit ?? 10,
  }),
}
```

> 也可以不放在 `adapters.ts`，而是在 `modules/abc/` 下就近定义；但放在 `core/adapters.ts` 便于全局复用与统一查阅。

### 7.3 步骤二：新建 `modules/abc/client.ts` 工厂实例

```ts
// src/api/modules/abc/client.ts
import { createClient } from '../../core/http'
import { abcFormat, abcPagination } from '../../core/adapters'

export const abcClient = createClient({
  adapter: abcFormat,
  pagination: abcPagination,
  baseURL: (import.meta.env.VITE_ABC_API_BASE_URL as string) || '/abc-api',
  withTimestamp: true,
})

export const { instance: abcInstance, get: abcGet, post: abcPost, put: abcPut, del: abcDel, paginate: abcPaginate } = abcClient
```

### 7.4 步骤三：编写业务 API

```ts
// src/api/modules/abc/xxx.ts
import { abcGet, abcPaginate } from './client'
import type { PageParams, PageResult } from '../../types'

export interface AbcItem { id: number; name: string }

export function getAbcList(params: PageParams & { keyword?: string }) {
  // abcGet 解包出 payload（rows/total/idx/limit），
  // 再由 abcPagination.fromResult 转回通用 PageResult，调用方无感知：
  return abcGet<{ rows: AbcItem[]; total: number; idx: number; limit: number }>('/items', params as Record<string, any>)
    .then((res) => abcPagination.fromResult(res) as PageResult<AbcItem>)
}
```

### 7.5 步骤四：baseURL / 代理 / mock 接线

- **环境变量**：在 `.env*` 增加 `VITE_ABC_API_BASE_URL`（绝对地址或留空用缺省 `/abc-api`）。
- **dev 代理**：`vite.config.ts` 的 `envBaseUrls` 已自动遍历所有 `VITE_*_API_BASE_URL` 生成代理；只要变量名遵循 `VITE_..._API_BASE_URL` 命名，代理会自动生成（见 9.2）。
- **mock**：若需要本地 mock，参考 `src/mock` 插件，在 `/abc-api` 前缀下注册拦截器和 `mode==='mock'` 加载即可。

### 7.6 步骤五：统一导出 `index.ts`

```ts
// src/api/index.ts（追加）
export * from './modules/abc/xxx'
```

调用方即可 `import { getAbcList } from '@/api'`。

### 7.7 完整 Copy-Paste 模板（假设后端返回 `{ ok, payload }`，分页 `idx/limit/rows`）

> 直接复制下面两段即可跑通，仅需把 `abc` / 字段名改成你的业务。

```ts
// ===== core/adapters.ts 末尾追加 =====
export const abcFormat: ResponseAdapter = {
  isSuccess: (r) => !!r && r.ok === true,
  extractData: (r) => r?.payload,
  extractMessage: (r) => r?.msg ?? '请求失败',
  extractCode: (r) => r?.code,
}
export const abcPagination: PaginationAdapter = {
  toParams: (p) => ({ idx: p.page, limit: p.pageSize }),
  fromResult: (raw) => ({
    list: raw?.rows ?? [], total: raw?.total ?? 0,
    page: raw?.idx ?? 1, pageSize: raw?.limit ?? 10,
  }),
}

// ===== modules/abc/client.ts =====
import { createClient } from '../../core/http'
import { abcFormat, abcPagination } from '../../core/adapters'
export const abcClient = createClient({
  adapter: abcFormat, pagination: abcPagination,
  baseURL: (import.meta.env.VITE_ABC_API_BASE_URL as string) || '/abc-api',
})
export const { get: abcGet, post: abcPost, put: abcPut, del: abcDel, paginate: abcPaginate } = abcClient
```

### 7.8 进阶：扩展"请求体格式"（可扩展点）

当前工厂抽象**主要解决"响应包络"与"分页字段"**。如果某后端要求**请求体也被包裹**（如所有 POST 体为 `{ data: {...} }`），现有 `ClientOptions` 没有直接抽象，但有两种合规扩展方式：

1. **在 `onRequest` 钩子里改写** `config.data`：

   ```ts
   createClient({
     adapter: myFormat,
     onRequest: (config) => {
       if (['post','put'].includes((config.method||'').toLowerCase()) && config.data) {
         config.data = { data: config.data }   // 统一包裹请求体
       }
     },
   })
   ```

2. **自定义一层 thin wrapper**：在 `modules/abc/client.ts` 里对 `abcPost` 再包一层，把入参包成后端要的结构，业务 API 调用 wrapper 而非原始 `abcPost`。

> 不建议在工厂核心里硬编码某种请求体格式——保持工厂只关心"响应/分页"抽象，请求体差异用 `onRequest` 或 wrapper 处理，符合单一职责。

---

## 8. 使用示例

### 8.1 vant 默认（零改动，向后兼容）

```ts
import { get, post, put, del } from '@/api'

// 列表（通用分页结构）
const page = await get<PageResult<DemoRenewal>>('/demo/renewal/list', { page: 1, pageSize: 10 })
page.list        // DemoRenewal[]
page.total

// 详情
const detail = await get<DemoRenewal>('/demo/renewal', { id })

// 新增 / 编辑 / 删除
await post<DemoRenewal>('/demo/renewal', form)
await put<DemoRenewal>('/demo/renewal', form)
await del<void>('/demo/renewal', { id })
```

> 注意 `demo-renewal.ts` 的 `getDemoRenewalList` 直接返回 `PageResult<DemoRenewal>`（因为 vant 格式里 `data` 已是 `{list,total,...}`，`extractData` 直接取出即通用分页结构），无需再 `fromResult`；而 ydl 需要显式 `fromResult` 转换（见 8.2）。

### 8.2 ydl 分页自动转换（重点对比）

```ts
// src/api/modules/ydl/ydl-renewal.ts
export function getYdlRenewalList(params: YdlRenewalQuery & PageParams) {
  return ydlGet<YdlPageResult<YdlRenewal>>('/data/renewal/list', params as Record<string, any>)
    .then((res) => ydlPagination.fromResult(res) as PageResult<YdlRenewal>)
}
```

- `ydlGet` 用 `ydlFormat.extractData` 取出 `result`（含 `records/total/current/size`）；
- 再经 `ydlPagination.fromResult` 把 `records→list`、`current→page`、`size→pageSize`；
- 调用方（`VantList` / `useCrudList`）拿到**与 vant 完全一致**的 `PageResult<YdlRenewal>`，无需任何 `responseMap` 配置。

页面侧差异仅在 `VantList` 传 `:request-map="{ page: 'current', pageSize: 'size' }"`（把前端发的 `page/pageSize` 映射成 ydl 要的 `current/size`），见 `src/api/README.md`。

### 8.3 track 上报（走默认 vant 客户端）

```ts
import { sendTrackEvents, listTrackSessions, getTrackSessionEvents } from '@/api'

await sendTrackEvents(payload)                       // POST /track/events
const { list } = await listTrackSessions({ userId }) // GET /track/sessions
const { session, events } = await getTrackSessionEvents(sessionId) // GET /track/sessions/:id/events
```

### 8.4 在 composable / 组件里调用

```ts
import { getDemoRenewalList } from '@/api'
import { useCrudList } from '@/composables/useCrudList'

const { items, loading, query, reload } = useCrudList({
  api: { list: getDemoRenewalList },
  initialQuery: DEMO_DEFAULT_RENEWAL_QUERY,
})
```

### 8.5 自定义 `onRequest` 注入租户号

```ts
export const tenantClient = createClient({
  adapter: vantFormat,
  onRequest: (config) => {
    config.headers = config.headers ?? {}
    config.headers['X-Tenant-Id'] = getTenantId()   // 多租户场景
  },
})
```

### 8.6 删除接口带 body（ydl 写法，与 vant 不同）

```ts
// ydl：DELETE 携带 body，mock 从请求体读取 id
export function deleteYdlRenewal(id: number) {
  return ydlDel<void>('/data/renewal', { data: { id } } as Record<string, any>)
}
```

> 注意：axios 的 `delete(url, config)` 第二个参数是 config，`data` 应放在 `config.data` 里（如上），否则不会发送请求体。

---

## 9. 环境变量、代理与 mock 链路

### 9.1 关键环境变量表

| 变量 | 作用 | 缺省 | 示例 |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | 默认 vant 客户端 baseURL（也驱动 dev 代理生成） | `/api` | `http://40.33.32.20:8090/is` |
| `VITE_YDL_API_BASE_URL` | ydl 客户端 baseURL | `/ydl-api` | `http://40.33.32.20:8090/is` |
| `VITE_SITE_API_BASE_URL` | 站点鉴权链路 baseURL | — | `/site-api`（mock-cp 模式覆盖） |
| `VITE_SITE_WX_API_BASE_URL` | 站点微信鉴权 baseURL | — | `/wx-api`（mock-cp 模式覆盖） |
| `VITE_TOKEN_HEADER` | 注入 token 的请求头字段名 | `X-Access-Token` | — |
| `VITE_TOKEN_STORAGE_KEY` | 本地 token 存储 key | `app_token` | — |
| `VITE_DEV_TOKEN` | 开发期强制 token（跳过登录联调） | 空 | `eyJ...`（仅开发环境） |
| `VITE_MOCK_CP` | 仅 `/cp` 走 mock 开关 | `false` | `true` |

> 命名约定：**所有需要自动生成代理的后端地址变量，必须以 `VITE_..._API_BASE_URL` 结尾**，`vite.config.ts` 的 `envBaseUrls` 才会扫描到它。

### 9.2 dev 下绝对地址 → 相对前缀代理（解决跨域）

`vite.config.ts` 的 `parseProxyFromBaseURL` 会从 baseURL 解析出 `{ prefix, target }`：

- 例如 `http://40.33.32.20:8090/is` → 生成代理 `{ '/is': { target: 'http://40.33.32.20:8090', changeOrigin: true, ... } }`；
- dev 下若 baseURL 是绝对地址，会通过 `define` 把它**覆盖为相对前缀**（如 `/is`），让 axios 走 Vite 同源代理；
- 代理会剥掉 `Origin`/`Referer`，规避后端 JeecgBoot CORS 过滤器对"未白名单 Origin"的 `403 Invalid CORS request`。

### 9.3 mock 模式

- `mode==='mock'`：全部接口走 `mockPlugin()`（在 `vite.config.ts` 的 `plugins` 加载）；
- `VITE_MOCK_CP==='true'`：仅 `/cp` 走 mock，其余仍走代理连真实后端；此时会 `define` 覆盖站点两条 baseURL 为 `/wx-api`、`/site-api`，且**不**为它们生成代理（避免 404）；
- 纯 mock 模式（全部接口）下不启用 proxy。

---

## 10. 设计约定与注意事项（Do / Don't）

**Do（推荐）**
- 新后端格式 → 新增 adapter + 独立 `client.ts`，不污染默认客户端；
- 业务 API 只写 URL、数据模型与导出函数，解析交给 adapter；
- 分页统一返回 `PageResult<T>`，让 `VantList`/`useCrudList` 零配置；
- 删除带 body 用 `del(url, { data: {...} })`；
- 需要特殊请求头/租户号，用 `onRequest` 或 wrapper，不碰工厂核心；
- 登录成功调用 `setToken`/`setUserInfo`，登出调用 `clearAuth`。

**Don't（避免）**
- 不要在适配器里做"业务二级判定"（如 `result.code==='00'` 表示未绑定）——那是 composable 的职责；
- 不要在业务 API 里直接 `raw.data.result` 硬取——应通过 adapter 解包，否则换格式要改一堆业务代码；
- 不要把 token 头字段名写死成 `X-Access-Token`——读 `TOKEN_HEADER`；
- 不要在默认 vant 客户端里塞 ydl 的 `current/size` 分页逻辑；
- 生产环境不要配 `VITE_DEV_TOKEN`（会导致所有请求带死 token、且无法被真实登录顶替）；
- 真实回放场景不要指望前端阻止后端副作用——必须由后端依据 `X-Track-Replay` / `te` 隔离。

---

## 11. 附录：常见 FAQ

**Q1：为什么我直接在 `<van-button>` 上加 `data-track-anchor` 不生效？**
与 API 无关，但属于"埋点/回放"体系：Vant4 `van-button` 用 `createVNode` 渲染根 `<button>`、不转发 `$attrs`，所以应把锚点放在按钮内层 `<span>`（覆盖默认 slot），这与本 API 层无关，仅作提醒。

**Q2：本地模拟回放为什么拿不到最新数据？**
本地模拟用的是**录制阶段缓存的 GET 成功响应**（`replayGate.record` 仅在非回放且 GET 成功时写入）。录制后后端变了数据，缓存不会更新。需要真实数据请开启"真实回放"（带 `te` 标记打后端）。

**Q3：缓存 key 命中不了怎么办？**
`buildKey` 会递归剔除 `t`/`_t` 字段。若你的请求参数里包含其它"每次都变"的字段（如随机 nonce），需在 `stripTs` 里追加忽略键，否则录制与回放的 key 不一致导致未命中、回退到空数组兜底。

**Q4：新增格式后列表不显示数据？**
检查 `extractData` 是否指向正确字段，以及 `pagination.fromResult` 的 `list` 映射字段名是否与后端一致（如后端用 `rows` 而你在 `fromResult` 写成了 `list`）。

**Q5：如何临时跳过某次请求的鉴权失败跳转？**
在调用时给 config 加 `__skipAuthFail: true`（如登出接口），响应拦截器会跳过 `onAuthFail`。

**Q6：工厂和适配器算哪种设计模式？**
`createClient` = **工厂方法/参数化工厂**；`ResponseAdapter`/`PaginationAdapter` = **策略模式（Strategy）**；整体组合体现**依赖倒置（DIP）** 与**开闭原则（OCP）**。核心逻辑对扩展开放（新格式=新策略），对修改封闭（工厂不动）。

---

> 文档配套源码位置速查：
> - 工厂与拦截：`src/api/core/http.ts`
> - 适配器实现：`src/api/core/adapters.ts`
> - 抽象契约：`src/api/core/types.ts`
> - token：`src/api/core/token.ts`
> - 回放网关：`src/api/core/replayGate.ts`
> - 默认客户端：`src/api/request.ts`
> - ydl 客户端与业务：`src/api/modules/ydl/client.ts`、`src/api/modules/ydl/ydl-renewal.ts`
> - 统一导出：`src/api/index.ts`
> - 更早的模块级说明：`src/api/README.md`
