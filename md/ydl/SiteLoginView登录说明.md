# 站点登录页（SiteLoginView）维护说明

> 适用页面：`src/views/ydl/SiteLoginView.vue`
> 适用模块：ydl 站点登录（旧站 / JeecgBoot 体系，独立封装，不依赖 vant 侧登录组件）
> 文档目标：让后续维护者无需通读源码即可理解登录页结构、两种登录方式、接口契约、样式规范与扩展点。

---

## 1. 概述

站点登录页是 ydl 子系统的统一入口，提供**两种登录方式**：

| 位置 | 方式 | 说明 |
| --- | --- | --- |
| 左侧 Tab「企业微信登录」 | 企业微信 OAuth 授权 | 整页跳转企业微信授权页，回跳带 `code` 后换 token |
| 右侧 Tab「密码登录」 | 账号 + 图形验证码 + md5 密码 | 普通站点账号密码登录（旧站约定密码需 md5） |

登录成功后跳转到 `redirect`（默认 `/ydl`）。两种方式最终都通过 `setToken` + `loadPermissionsByToken` 完成“拿 token→拉权限”的本地态初始化。

UI 设计参考项目内 `VantLogin` 组件（白卡 + 胶囊 Tab + 自定义图标输入行 + 浅红药丸按钮），但**独立实现**，不引用 `VantLogin` 组件本身，避免与 vant 侧登录耦合。

---

## 2. 目录与职责

```
src/views/ydl/SiteLoginView.vue          ← 登录页（本文档主体，UI + 编排）
src/composables/ydl/useSiteWecomLogin.ts ← 企业微信登录逻辑（OAuth 跳转 / code 换 token）
src/composables/ydl/useSitePasswordLogin.ts ← 账号密码登录逻辑（验证码 + md5 + 登录）
src/api/modules/ydl/site-auth.ts        ← 接口定义（函数 → 后端路径）
src/api/modules/ydl/site-client.ts      ← HTTP 客户端（baseURL / 适配器 / 401 跳登录）
src/api/core/token.ts                   ← token 读写（setToken / clearAuth）
src/composables/usePermission.ts        ← 权限加载（loadPermissionsByToken）
src/mock/ydl-site-auth.ts               ← mock 数据（开发 / 演示用，挂载在 /site-api、/wx-api）
```

**分层原则**：页面只做 UI 与编排，绝不直接调接口；所有网络请求都经 composable → `site-auth.ts` → `siteClient`。

---

## 3. 页面结构（模板）

```
site-login
├── login-header        ← 顶部标题区（品牌 + 标题 + 副标题）
└── login-card          ← 白卡容器
    ├── card-tabs       ← 胶囊 Tab 切换器（左 企业微信 / 右 密码）
    ├── (wecom 面板)    ← v-if="activeTab==='wecom'"
    └── (password 面板) ← v-else
```

### 3.1 顶部标题区（login-header）

| 元素 | 内容 |
| --- | --- |
| `.brand-mark` | 红色圆角方块，文字「源」 |
| `.brand-text` | 「源动力平台」（品牌红 `#d71920`） |
| `.login-title` | 「福建源动力平台」 |
| `.login-subtitle` | 「站点登录」 |

### 3.2 胶囊 Tab 切换器（card-tabs）

- 两个等宽 `<button class="card-tab">`：`企业微信登录`、`密码登录`。
- 激活态 `.card-tab--active`：红粉渐变 `linear-gradient(135deg,#e88a91,#d71920)` + 白字；非激活红字，hover 加深。
- 绑定 `activeTab`（`ref<'wecom' | 'password'>`），点击切换面板。默认 `activeTab='wecom'`（左）。

### 3.3 企业微信面板（activeTab === 'wecom'）

- 一个药丸按钮 `企业微信扫码登录`，点击触发 `onWecomClick`。
- 文案提示：跳转后自动回登录页完成登录。
- 若企业微信回跳未绑定，`socialId` 有值时会显示 `.bind-tip` 红字提示。

### 3.4 密码面板（activeTab === 'password'）

三条自定义输入行（`.card-field` + 图标 + `<input>`，无边框、底部细线）：

| 字段 | 图标 | v-model | 类型 |
| --- | --- | --- | --- |
| 账号 | `contact` | `username` | text |
| 密码 | `lock` | `password` | password |
| 图形验证码 | `shield-o` | `captcha` | text(maxlength=4) |

验证码输入行右侧是 `.captcha-img` 点击刷新区：有图显示 `<img :src="captchaSrc">`，无图显示「加载中」。

面板底部 `.submit-btn` 药丸按钮「登录」，点击 `onSubmitPassword`。同样在 `socialId` 有值时显示 `.bind-tip`。

> **UI 一致性注意**：企业微信按钮与密码登录按钮共用 `.submit-btn` 样式（浅红药丸），两者视觉完全一致，仅文案不同。

---

## 4. 脚本逻辑（<script setup>）

### 4.1 状态变量

| 变量 | 类型 | 说明 |
| --- | --- | --- |
| `activeTab` | `ref<'wecom' \| 'password'>` | 当前激活 Tab，默认 `'wecom'` |
| `username` / `password` / `captcha` | `ref<string>` | 密码表单三字段 |
| `socialId` | `ref<string>` | 企业微信未绑定时回传，普通登录时带上去绑定 |
| `redirect` | `computed(string)` | `route.query.redirect \|\| '/ydl'` |

### 4.2 composable 引用

```ts
const wecom = useSiteWecomLogin()
const { captchaImg, loading: pwdLoading, refreshCaptcha, submit: submitPwd } = useSitePasswordLogin()
```

### 4.3 验证码图片源（captchaSrc）

后端 / mock 返回的是**不含 `data:` 前缀的 base64 字符串**，需要前端拼 `data:<mime>;base64,` 才能被 `<img>` 渲染。`captchaSrc` 通过 base64 头部前 8 个字符推断 MIME，避免写死导致 SVG/PNG 渲染失败：

| 头部特征 | 推断 MIME |
| --- | --- |
| `iVBOR` | `image/png` |
| `/9j/` | `image/jpeg` |
| `R0lGOD` | `image/gif` |
| `PHN2` 或 `PD94` | `image/svg+xml` |
| 其它 | 兜底 `image/gif` |

> mock 返回的是 base64 SVG，头部为 `PHN2`（`<svg`）或 `PD94`（含 `<?xml` 声明），会命中 SVG 分支正确渲染。

### 4.4 普通登录提交（onSubmitPassword）

```
onSubmitPassword()
  ├─ 校验 username/password/captcha 非空，否则 showToast 提示
  ├─ showLoadingToast('登录中...')
  ├─ await submitPwd({ username, password, captcha, socialId? })
  │     └─ 内部：password 经 md5 → userLogin → setToken → loadPermissionsByToken
  ├─ 成功：closeToast + showToast('登录成功') + router.replace(redirect)
  └─ 失败：closeToast + showToast(错误) + refreshCaptcha()（刷新验证码）
```

### 4.5 企业微信点击（onWecomClick）

```
onWecomClick()
  └─ wecom.start().then(finishWecom).catch(失败提示)
       ├─ 无 code：start 内部 location.href 整页跳转并 return {ok:false}
       │           → finishWecom 无 code 分支，不处理（页面已离开）
       └─ 带 code（等同回跳场景）：换 token 后由 finishWecom 统一处理
```

> 企业微信结果（成功 / 未绑定 / 失败）已抽成页面级 `finishWecom(res)` 共享函数，`onWecomClick`（跳转后回跳）与 `onMounted`（回跳带 code）都复用它，避免结果分支在多处重复（`res.code==='01'` 未绑定、其它失败、成功跳转逻辑只写一遍）。

### 4.6 挂载时回调处理（onMounted）

```
onMounted()
  ├─ refreshCaptcha()                         // 进入页面即拉一次验证码（原顶层调用已移入此处）
  └─ 取 URL 上 code
       ├─ 无 code → return（等待用户点击）
       └─ 有 code（企业微信回跳）
            ├─ showLoadingToast('企业微信登录中...')
            ├─ res = await wecom.start()      // 无 code 分支已被 return 跳过，这里必走换 token
            └─ finishWecom(res)               // 见 4.5：成功跳 redirect / 未绑定切密码 Tab / 其它提示
```

`finishWecom` 逻辑：

- `res.ok` → `showToast('登录成功')` + `router.replace(redirect)`
- `res.code === '01'` → 写入 `socialId`，切到 password Tab，提示「请先绑定账号」（密码登录时把 `socialId` 带上去绑定）
- `res.code` 其它 → `showToast(res.msg || '企业微信登录失败')`

---

## 5. 企业微信登录详解（useSiteWecomLogin）

### 5.1 流程

1. 当前 URL **无 `code`**：调 `getAuthUrl` 拿授权地址 → `location.href = authUrl` 整页跳转（此分支不返回）。
2. 企业微信**回跳带 `code`**：调 `getWxUserInfo({ wxAppId, code })` 用 code 换 token。
3. 结果判定（内层 `res.code`）：
   - `'00'` 成功 → `setToken` + `loadPermissionsByToken` → 返回 `{ ok: true }`
   - `'01'` 未绑定 → 返回 `{ ok:false, code:'01', socialId, wxAuthId }`
   - `'02'` / 其它 → 返回失败信息

### 5.2 关键配置（环境相关）

| 配置项 | 用途 | 回退 |
| --- | --- | --- |
| `VITE_SITE_WX_APP_ID` | 企业微信 AppId | 空串 |
| `VITE_SITE_OAUTH_REDIRECT_BASE` | 回调可信固定域名（真实联调必填） | `VITE_OAUTH_REDIRECT_BASE` → 当前 `location.origin` |

> 企业微信要求 `redirect_uri` 必须是后台登记的**可信固定域名**，不能用含动态 query/hash 的 `location.href`（dev 的 localhost 也无法登记）。真实联调务必配置 `VITE_SITE_OAUTH_REDIRECT_BASE`。

### 5.3 回调地址拼接规则

```
base        = (VITE_SITE_OAUTH_REDIRECT_BASE || location.origin).replace(/\/$/,'')
callbackUrl = base + location.pathname + '?redirect=<业务页>&wxAppId=<APP_ID>'
redirect     = encodeURIComponent(callbackUrl)
authUrl      = getAuthUrl({ wxAppId, redirect })
```

注意：路径固定为登录页，`不能`叠加 `location.search`（其已含 `redirect`，会造成参数重复）。

---

## 6. 账号密码登录详解（useSitePasswordLogin）

### 6.1 流程

1. `refreshCaptcha()`：调 `getCaptchaImg()` 取图形验证码。
   - 有 `res.img`（真实后端 base64 图）→ 赋值 `captchaImg`，清空字符回退。
   - 无 `res.img`（mock 字符）→ 用 `captchaPalette` 给每个字符随机配色 + 旋转，生成 `captchaItems`（**本站模板只渲染 `captchaImg`，字符回退不显示，仅作兼容保留**）。
2. `submit(form)`：`password` 经 `md5` → `userLogin({ username, password:md5, captcha, captchaKey, socialId? })` → `setToken` → `loadPermissionsByToken`。

### 6.2 密码约定

旧站约定密码传输前需 **md5**（`import md5 from 'md5'`），由 composable 内部统一处理，页面层传入明文即可。

### 6.3 captchaKey

`refreshCaptcha` 会把后端返回的 `captchaKey` 暂存于闭包变量，提交时一并传给 `userLogin` 用于后端校验验证码归属。

---

## 7. 接口清单

所有请求经 `siteClient`（baseURL = `VITE_SITE_API_BASE_URL`，缺省 `/site-api`）与 `siteWxClient`（baseURL = `VITE_SITE_WX_API_BASE_URL`，缺省 `/wx-api`）。

| 功能 | 函数 | 方法 | 路径 | 响应业务码 |
| --- | --- | --- | --- | --- |
| 企业微信授权地址 | `getAuthUrl` | GET | `/cp/wxAuth/getAuthUrl` | 鉴权类 `code:0` |
| 企业微信 code 换 token | `getWxUserInfo` | POST | `/cp/wxAuth/getWxUserInfo` | 内层 `result.code`：`'00'`/`'01'`/`'02'` |
| 图形验证码 | `getCaptchaImg` | GET | `/sys/captchaImage` | 业务 `code:200` |
| 账号密码登录 | `userLogin` | POST | `/sys/social/wxLogin` | 业务 `code:200` |
| 登录后拉权限 | `getUserPermissionByToken` | GET | `/sys/permission/getUserPermissionByToken` | 业务 `code:200` |
| 登出 | `siteLogout` | POST | `/sys/logout` | 业务 `code:200`（带 `__skipAuthFail`） |

响应包络由 `ydlFormat` 适配器统一处理，兼容双语义：

- 业务接口：`success===true && code===200`
- 鉴权接口（微信）：`code===0`

`401 / 510` 视为登录失效 → `clearAuth()` + 跳 `/ydl/login?redirect=<当前路径>`（见 `site-client.ts` 的 `onAuthFail`）。

---

## 8. Mock 数据（开发 / 演示）

`src/mock/ydl-site-auth.ts` 由 mock 中间件挂载在 `/site-api`、`/wx-api` 前缀下拦截。

| 接口 | Mock 行为 |
| --- | --- |
| `/sys/captchaImage` | 生成 **4 位 base64 SVG 验证码图**（字符来自 `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`），返回 `{ img, captchaKey }` |
| `/sys/social/wxLogin` | 任意账号密码；**校验验证码大小写不敏感**；错误返回 `code:500 验证码错误` |
| `/cp/wxAuth/getAuthUrl` | 演示：在传入 `redirect` 后拼 `code=MOCK_WX_CODE` 直接回跳 |
| `/cp/wxAuth/getWxUserInfo` | 演示：内层 `code:'00'`，返回 mock token |
| `/sys/permission/getUserPermissionByToken` | 返回样例权限 JSON（`ydl-site-perm.json` 的 `result`） |
| `/sys/logout` | 返回成功 |

> 验证码校验比对的是 mock 生成的 `currentCaptcha`，与 SVG 图上文字一致；mock 下直接在图上读取 4 位字符即可通过。

---

## 9. 样式规范（scoped CSS）

所有样式 `scoped`，不污染全局。核心视觉令牌：

| 令牌 | 值 | 用途 |
| --- | --- | --- |
| 品牌红 | `#d71920` | 文字 / 图标 / 渐变 |
| 渐变激活 | `linear-gradient(135deg,#e88a91,#d71920)` | Tab 激活态 / 主色 |
| 页面背景 | `linear-gradient(180deg,#fff1f2,#fce7ec 40%,#f5e8ec)` | 根容器 |
| 卡片 | 白底 / `border-radius:16px` / 柔和红阴影 | 登录卡 |
| 药丸按钮 | `border-radius:25px` / `rgba(215,25,32,0.08)` 浅红填充 / 红字 | 两个登录按钮共用 |

主要类清单：

| 类 | 作用 |
| --- | --- |
| `.site-login` | 根容器（居中，最大 480px） |
| `.login-header` / `.brand-mark` / `.brand-text` / `.login-title` / `.login-subtitle` | 顶部标题区 |
| `.login-card` | 白卡 |
| `.card-tabs` / `.card-tab` / `.card-tab--active` | 胶囊 Tab 切换器 |
| `.card-form` / `.tab-body` | 表单容器 / 企业微信面板居中 |
| `.card-field` / `.field-icon` / `.field-input` | 自定义输入行 |
| `.captcha-img` / `.captcha-svg-img` / `.captcha-loading` | 图形验证码 |
| `.submit-btn` / `.submit-btn.loading` | 登录按钮 + loading 态 |
| `.tip` / `.bind-tip` | 提示文案 / 绑定提示 |

---

## 10. 路由与跳转

| 场景 | 跳转目标 |
| --- | --- |
| 登录成功 | `router.replace(redirect)`（`route.query.redirect \|\| '/ydl'`） |
| 企业微信未绑定 | 切到 password Tab，保留 `socialId` 用于绑定；不跳页 |
| 401 / 510 失效 | `site-client` 自动 `clearAuth()` + 跳 `/ydl/login?redirect=<当前路径>` |

登录页路由路径约定为 `/ydl/login`（见 `onAuthFail`）。

---

## 11. 维护与扩展指南

### 11.1 修改文案 / 品牌

编辑 `<template>` 中对应文本，或顶部 `.login-title` / `.brand-text`。品牌色集中在 `<style scoped>` 顶部令牌，全局替换 `#d71920` 即可改主色。

### 11.2 调整验证码渲染

- 当前只渲染 `captchaImg`（base64 图）。若真实后端改为字符型（无 `img` 字段），需在密码面板增加 `captchaItems` 的 `<i v-for>` 内联渲染（参考 `useSitePasswordLogin` 的字符回退逻辑）。
- `captchaSrc` 的 MIME 推断如需支持新格式，在 `computed` 内追加 `head.startsWith(...)` 分支。

### 11.3 增加新的登录方式 Tab

1. `activeTab` 联合类型增加新值，如 `'sms'`。
2. `.card-tabs` 增加对应 `<button class="card-tab">`。
3. 新增面板 `v-else-if="activeTab==='sms'"`。
4. 新增对应 composable 并解构到页面。

### 11.4 修改密码校验规则

在 `onSubmitPassword` 中调整前置校验（如增加长度、正则）。密码 md5 在 `useSitePasswordLogin.submit` 内完成，页面层不改。

### 11.5 真实联调企业微信

配置 `.env.*` 中的：

```
VITE_SITE_WX_APP_ID=xxx
VITE_SITE_OAUTH_REDIRECT_BASE=https://可信域名
VITE_SITE_API_BASE_URL=https://真实后端
VITE_SITE_WX_API_BASE_URL=https://真实后端
```

确保 `VITE_SITE_OAUTH_REDIRECT_BASE` 与后台登记的回调域名一致。

---

## 12. 常见问题 / 排错

| 现象 | 可能原因 | 处理 |
| --- | --- | --- |
| 验证码区域空白 | 模板只渲染 `captchaImg`；若后端返回字符（`img` 为空）则无图 | 确认后端返回 `img`（base64 图）；或补 `captchaItems` 渲染 |
| 验证码图不显示 / 破图 | `captchaSrc` 的 MIME 推断未命中 | 检查 base64 头部，补 MIME 分支 |
| 企业微信点击无反应（dev） | 未配 `VITE_SITE_OAUTH_REDIRECT_BASE`，用 `location.origin` 跳转但无可信域名 | 真实联调配域名；演示依赖 mock `getAuthUrl` 直接回跳 |
| 登录后权限为空 | `loadPermissionsByToken` 失败或 token 无效 | 看 Network 中 `/sys/permission/getUserPermissionByToken` 返回 |
| 401 后反复跳登录 | `onAuthFail` 触发；可能 token 过期或接口需鉴权 | 检查请求是否错误携带过期 token |
| 构建报 `MISSING_EXPORT` | `src/api/index.ts` 未导出 `ydl-ins-source` 等模块 | 确认 `export * from './modules/ydl/ydl-ins-source'` 存在 |

---

## 13. 关键代码位置速查

| 内容 | 位置 |
| --- | --- |
| 胶囊 Tab 模板 | `SiteLoginView.vue` 模板 `.card-tabs` 段 |
| 验证码 base64→dataURL | `SiteLoginView.vue` `captchaSrc` computed |
| 密码提交 | `SiteLoginView.vue` `onSubmitPassword` |
| 企业微信启动 | `SiteLoginView.vue` `onWecomClick` + `onMounted` + `finishWecom`（结果统一处理） |
| 企业微信逻辑 | `composables/ydl/useSiteWecomLogin.ts` `start()` |
| 密码 / 验证码逻辑 | `composables/ydl/useSitePasswordLogin.ts` `refreshCaptcha` / `submit` |
| 接口定义 | `api/modules/ydl/site-auth.ts` |
| HTTP 客户端 / 401 跳登录 | `api/modules/ydl/site-client.ts` |
| Mock | `mock/ydl-site-auth.ts` |

---

## 14. 鉴权与免登录联调（共享机制，两套登录通用）

站点登录与 `VantLogin` 共用 `src/api/core/token.ts` 的鉴权内核。详细机制见 `md/两种登录方案与鉴权详解.md` 第 4 节，本站相关要点：

### 14.1 可配置项（环境变量）

| 变量 | 默认 | 作用 |
| --- | --- | --- |
| `VITE_TOKEN_HEADER` | `X-Access-Token` | 请求头携带 token 的字段名（响应拦截器经 `TOKEN_HEADER` 注入） |
| `VITE_TOKEN_STORAGE_KEY` | `app_token` | 本地存储 token 的 key |
| `VITE_DEV_TOKEN` | 空 | 开发期预置 token：强制 token，跳过登录联调真实后端 |
| `VITE_MOCK_CP` | 未设 | 仅把"站点鉴权链路"（/cp 与 /sys）强制走本地 mock |

### 14.2 VITE_DEV_TOKEN 免登录

在 `.env.zyn`（真实联调）或 `.env.development`（mock-cp）里配一枚有效 token，`src/main.ts` 启动即 `initDevToken()` 写入 `localStorage`。它是**强制 token**：`getToken()` 优先返回它，`setToken()`（含真实/mock 登录返回的 token）为 no-op，不会被覆盖。

> 后端（JeecgBoot）token 是"JWT 签名 + Redis 服务端会话"双重校验。`exp` 未过期不代表后端仍认——Redis 会话失效（服务重启 / TTL 到期）即返回 `401 认证失败`。此时需重新拿一枚有效 token 更新 `VITE_DEV_TOKEN` 并重启。

### 14.3 与 VITE_MOCK_CP 的关系

- `VITE_MOCK_CP=true`（development）：`siteWxClient(/cp/wxAuth/...)` 与 `siteClient(/sys/...)` 的 baseURL 在 `vite.config.ts` 被覆盖为 `/wx-api`、`/site-api`，由 mock 中间件拦截，避免"mock 登录换的 token 与真实权限接口对不上"而报认证失败。vant `/api`、ydl `/ydl-api` 仍走真实后端代理。
- `dev:zyn`：**不要**写 `VITE_MOCK_CP`（否则禁用整个 proxy，请求打不到后端），靠 `VITE_DEV_TOKEN` 免登录走真实后端。
