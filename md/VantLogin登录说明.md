# VantLogin 登录组件说明

> 组件：`src/components/VantLogin.vue`
> 登录逻辑已按「登录方式」拆分为独立组合式函数：`src/composables/login/*`
> 配套 API：`src/api/modules/login.ts`（mock：`src/mock/login.ts`）

---

## 一、支持的能力

| 分类 | 登录方式 key | 说明 | 入口位置 |
|---|---|---|---|
| 表单类（卡片内胶囊 Tab） | `sms` | 短信验证码登录 | 卡片 Tab |
| 表单类（卡片内胶囊 Tab） | `password` | 账号 + 密码 + 图形验证码登录 | 卡片 Tab |
| OAuth 类（底部「其他方式」） | `wechat` | 微信扫码授权登录 | 底部图标 |
| OAuth 类（底部「其他方式」） | `wecom` | 企业微信扫码授权登录 | 底部图标 |
| 辅助 | 找回密码 | 手机号 + 验证码 + 新密码重置（弹窗） | 密码登录页下方链接 |

---

## 二、配置来源优先级

```
props 覆盖  >  后端 GET /login/config  >  内置默认值
```

- 可用方式 / 默认方式 / 标题 / 副标题均可由 props 直接指定，否则拉后端配置，再不行用内置默认值。
- 若默认方式是 OAuth（微信/企业微信）且存在表单方式，会自动回退到第一个表单方式（OAuth 入口在底部，不适合做初始 Tab）。

---

## 三、各登录方式流程

### 1) 短信验证码登录（sms） —— `useSmsLogin.ts`
1. 输入手机号（正则 `^1[3-9]\d{9}$`）。
2. 拖动滑块完成人机校验（`VantSliderVerify`）。
3. 点「获取验证码」→ `POST /login/sms-code` → 进入 `smsCountdown`（默认 60s）倒计时；发送成功后滑块自动复位。
4. 输入 6 位验证码 → 提交 → `POST /login/sms` → 登录成功派发 `success`。
> 演示环境 `sendSmsCode` 会返回 `devCode`，toast 中提示演示码。

### 2) 密码登录（password） —— `usePasswordLogin.ts`
1. 输入账号（手机号 / 工号）。
2. 输入密码（≥6 位）。
3. 输入图形验证码（组件挂载时 `GET /login/captcha` 拉取 SVG，点图可刷新）。
4. 提交 → `POST /login/password`（验证码转大写 + `captchaId` 一并提交）→ 登录成功派发 `success`。
> 密码页下方有「忘记密码？」入口（`forgotPassword` 可关）。

### 3) 微信 / 企业微信 OAuth（wechat / wecom） —— `useOAuthLogin.ts`
真实 OAuth（code 由后端用 code 换 token 并拉取用户信息）：
1. `onOAuth(method)` → `GET /login/wechat|wecom/authorize`（`demo=true` 强制演示降级）。
2. 桌面端 `window.open` 弹窗扫码；移动端（UA 命中）或弹窗被拦截时整页跳转（`redirectOAuth`）。
3. 回调由后端完成 code 交换，结果回传：
   - 弹窗模式：子窗口 `postMessage({ type:'oauth-success'|'oauth-error', result })`。
   - 整页跳转：回调页写入 `sessionStorage['oauth_result']` 后跳回，组件 `onMounted` 读取恢复。
4. 收到结果 → 关闭 loading → 派发 `success` / `error`。
> 组件卸载时清理定时器 / 消息监听器 / 弹窗。

### 4) 找回密码 —— `useForgotPassword.ts`
弹窗：手机号 → 滑块校验 → 获取短信验证码（60s 倒计时）→ 6 位验证码 → 8-20 位新密码 →
`POST /login/reset-password` → 成功后关闭弹窗并**自动切到密码登录**。

---

## 四、登录流程总图

```
┌──────────────── 登录页加载（onMounted） ────────────────┐
│  useLoginConfig.fetchConfig()  → 解析 可用/默认/标题       │
│  usePasswordLogin.refreshCaptcha() → 拉图形验证码          │
│  useOAuthLogin → 注册 message 监听 + 恢复 session 结果     │
└──────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
   [sms Tab]         [password Tab]      [底部 OAuth 图标]
   滑块→发码→登录     图形码→登录       弹窗/整页跳转→授权→结果
        │                 │                 │
        └─────────────────┼─────────────────┘
                          ▼
                  useLoginCore.doLogin()
                   loading → 成功/失败提示
                   emit('success' | 'error')
```

---

## 五、目录结构与职责（拆分后便于单独维护）

```
src/composables/login/
├── index.ts            # 统一出口，组件直接 import 本目录
├── useLoginCore.ts     # 共用：loading / toast / doLogin / 结果派发
├── useLoginConfig.ts   # 配置解析：可用方式/默认/标题 + ORDER / METHOD_META + activeMethod
├── useSmsLogin.ts      # 短信验证码登录逻辑
├── usePasswordLogin.ts # 密码登录逻辑
├── useOAuthLogin.ts    # 微信/企业微信 OAuth 弹窗/整页跳转逻辑
└── useForgotPassword.ts# 找回密码弹窗逻辑
```

`VantLogin.vue` 现在只负责：声明 props/emits、组装上述 composables、模板渲染、样式。

---

## 六、如何新增 / 修改一种登录方式

- **只改某一种登录**：直接编辑对应的 `useXxx.ts`，不影响其它方式。
- **新增一种登录方式**：
  1. `api/modules/login.ts` 增加 `LoginMethod` 枚举值、类型与接口函数。
  2. `useLoginConfig.ts`：把新 key 加入 `ORDER`，并在 `METHOD_META` 补元信息（标题/图标/颜色）。
  3. 新建 `useXxxLogin.ts`（参考 `useSmsLogin.ts`，复用 `useLoginCore` 的 `doLogin`）。
  4. `VantLogin.vue` 引入并解构到模板；在模板对应区块（`formMethods` 或 `oauthMethods`）补充 UI。
- **改登录后行为**：统一在 `useLoginCore.doLogin` 处理即可全局生效。

---

## 七、Props / Events / 接口清单

### Props
| 名称 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `enabledMethods` | `LoginMethod[]` | — | 仅启用的登录方式（覆盖后端） |
| `defaultMethod` | `LoginMethod` | — | 默认选中方式（覆盖后端） |
| `title` / `subtitle` | `string` | — | 标题 / 副标题（覆盖后端） |
| `autoFetchConfig` | `boolean` | `true` | 是否自动拉取后端配置 |
| `logo` | `string` | `''` | logo 图片地址 |
| `smsCountdown` | `number` | `60` | 验证码倒计时秒数 |
| `demoMode` | `boolean` | `false` | 强制 OAuth 演示降级 |
| `forgotPassword` | `boolean` | `true` | 是否展示「忘记密码」入口 |

### Events
- `success: [result: LoginResult]` — 登录成功（token / userInfo / method / expireAt）。
- `error: [{ method, message }]` — 登录失败。

### 后端接口（baseURL `/api`，mock `src/mock/login.ts`）
| 接口 | 说明 |
|---|---|
| `GET /login/config` | 登录方式配置 |
| `POST /login/sms-code` | 发送短信验证码 |
| `POST /login/sms` | 验证码登录 |
| `GET /login/captcha` | 图形验证码（密码登录前置） |
| `POST /login/password` | 密码登录 |
| `POST /login/reset-password` | 找回密码重置 |
| `GET /login/wechat/authorize` | 微信授权地址 |
| `GET /login/wecom/authorize` | 企业微信授权地址 |
| `POST /login/wechat` | 微信登录（传 code，后端换用户信息） |
| `POST /login/wecom` | 企业微信登录（传 code） |
