# VantLogin 登录组件说明

> 组件：`src/components/VantLogin.vue`
> 登录逻辑已按「登录方式」拆分为独立组合式函数：`src/composables/login/*`
> 配套 API：`src/api/modules/login.ts`（mock：`src/mock/login.ts`）

---

## 一、支持的能力

| 分类                         | 登录方式 key | 说明                                 | 入口位置           |
| ---------------------------- | ------------ | ------------------------------------ | ------------------ |
| 表单类（卡片内胶囊 Tab）     | `sms`        | 短信验证码登录                       | 卡片 Tab           |
| 表单类（卡片内胶囊 Tab）     | `password`   | 账号 + 密码 + 图形验证码登录         | 卡片 Tab           |
| OAuth 类（底部「其他方式」） | `wechat`     | 微信扫码授权登录                     | 底部图标           |
| OAuth 类（底部「其他方式」） | `wecom`      | 企业微信扫码授权登录                 | 底部图标           |
| 辅助                         | 找回密码     | 手机号 + 验证码 + 新密码重置（弹窗） | 密码登录页下方链接 |

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

| 名称                 | 类型            | 默认    | 说明                         |
| -------------------- | --------------- | ------- | ---------------------------- |
| `enabledMethods`     | `LoginMethod[]` | —       | 仅启用的登录方式（覆盖后端） |
| `defaultMethod`      | `LoginMethod`   | —       | 默认选中方式（覆盖后端）     |
| `title` / `subtitle` | `string`        | —       | 标题 / 副标题（覆盖后端）    |
| `autoFetchConfig`    | `boolean`       | `true`  | 是否自动拉取后端配置         |
| `logo`               | `string`        | `''`    | logo 图片地址                |
| `smsCountdown`       | `number`        | `60`    | 验证码倒计时秒数             |
| `demoMode`           | `boolean`       | `false` | 强制 OAuth 演示降级          |
| `forgotPassword`     | `boolean`       | `true`  | 是否展示「忘记密码」入口     |

### Events

- `success: [result: LoginResult]` — 登录成功（token / userInfo / method / expireAt）。
- `error: [{ method, message }]` — 登录失败。

### 后端接口（baseURL `/api`，mock `src/mock/login.ts`）

| 接口                          | 说明                                |
| ----------------------------- | ----------------------------------- |
| `GET /login/config`           | 登录方式配置                        |
| `POST /login/sms-code`        | 发送短信验证码                      |
| `POST /login/sms`             | 验证码登录                          |
| `GET /login/captcha`          | 图形验证码（密码登录前置）          |
| `POST /login/password`        | 密码登录                            |
| `POST /login/reset-password`  | 找回密码重置                        |
| `GET /login/wechat/authorize` | 微信授权地址                        |
| `GET /login/wecom/authorize`  | 企业微信授权地址                    |
| `POST /login/wechat`          | 微信登录（传 code，后端换用户信息） |
| `POST /login/wecom`           | 企业微信登录（传 code）             |

---

## 八、真实 OAuth 打通前置条件（外部配置，必读）

> 上面第三、四节描述的是**前端流程**。要让微信 / 企业微信走**真实扫码并拉回真实用户信息**，
> 还必须满足以下外部配置，否则会降级为「演示数据」或报 `redirect_uri 与配置的授权完成回调域名不一致`。

### 1) `.env` 凭证（node 端读取，不下发浏览器）

```
WECHAT_APPID=xxx            # 微信开放平台 appid（微信登录用）
WECHAT_SECRET=xxx
WECOM_CORPID=wwxxxx         # 企业微信企业 ID（即 qrConnect 的 appid）
WECOM_CORPSECRET=xxx
WECOM_AGENTID=xxx       # 自建应用 agentid
OAUTH_REDIRECT_BASE=https://你的公网域名   # 回调 base，见下
```

- 未配齐 → `wechatReal` / `wecomReal` 为 false → 自动走演示降级（用户信息显示「微信用户(演示)」）。

### 2) 必须是公网 HTTPS 域名（localhost 不行）

- 企业微信 / 微信要求回调地址是**公网可信域名**，localhost 无法回调。
- 本地开发用穿透工具（如 cpolar）把 `https://你的域名` 转发到 dev server(5173)。
- `OAUTH_REDIRECT_BASE` 填这个公网域名，mock 会拼出
  `https://你的域名/api/login/wecom/callback` 作为 `redirect_uri`。

### 3) 企业微信后台登记回调域名 + 校验文件（最容易漏）

路径：**应用管理 → 自建应用(agentid 1000005) → 网页授权及JS-SDK → 设置可信域名**

- 把 **OAuth2.0 网页授权回调域名** 填为 `你的域名`（纯域名，不带 `https://`、不带 `/api` 路径）。
- 下载校验文件 `WW_verify_xxxx.txt`，放进项目 `public/` 根目录（dev server 重启后可由
  `https://你的域名/WW_verify_xxxx.txt` 直接访问），再点「确定」完成域名校验。
- **三处域名必须完全一致**：浏览器访问域名 == `OAUTH_REDIRECT_BASE` == 后台登记回调域名。

### 4) `demoMode` 必须为 false

- `VantLogin` 的 `demoMode` 默认 `false`（走真实）。只有显式传 `true` 才强制演示降级。
- 若页面一直显示「演示」或「微信用户(演示)」，先检查调用处是否把 `demoMode` 写死成了 `true`。

### 5) 免费穿透隧道域名会变（cpolar 等）

- 免费隧道每次重启换子域 → 后台登记的域名失效 → 报 `redirect_uri 不一致`。
- 根治：在 cpolar 控制台**保留一个固定域名**，后台只配一次；本地用 `cpolar.yml` 配 `hostname` 固定。
- 临时方案：每次换域名后同步改 ①`.env` 的 `OAUTH_REDIRECT_BASE` ②后台回调域名 ③`public/` 校验文件。

### 6) cpolar 启动命令（本地穿透）

> 本地开发用 cpolar 把公网 HTTPS 域名转发到 dev server(5173)。

**前提**：cpolar 已安装。若 `cpolar` 不是内部命令，用完整路径：
`"C:\Program Files\cpolar\cpolar.exe"`。

#### 临时随机隧道（每次域名都变，免费）

```bat
cpolar http 5173
```

启动后终端会打印公网地址，取 `https://xxxx.cpolar.top`：

```
Forwarding    http://xxxx.cpolar.top -> http://127.0.0.1:5173
Forwarding    https://xxxx.cpolar.top -> http://127.0.0.1:5173
```

把该 `https://` 域名抄进 `.env` 的 `OAUTH_REDIRECT_BASE`，**重启 dev server** 即可。

> 注意：每次重启 cpolar 域名都变，需同步改 `.env` + 后台回调域名 + `public/` 校验文件。

#### 固定域名隧道（一劳永逸，推荐）

1. 控制台 https://dashboard.cpolar.cn → 左侧 **预留 → 保留域名**，保留一个固定域名（如 `picc-test.vip.cpolar.cn`）。
2. 编辑 `C:\Users\<用户名>\.cpolar\cpolar.yml`，让 web 隧道固定用该域名：
   ```yaml
   tunnels:
     web:
       addr: 5173
       proto: http
       hostname: picc-test.vip.cpolar.cn # 换成你保留的固定域名
   ```
3. 之后一键启动（域名永远不变）：
   ```bat
   cpolar start-all
   ```
4. 后台「OAuth2.0 回调域名」改成该固定域名（**只改一次**），`.env` 也填它，之后不再变动。

#### 命令行直接指定固定域名（不想改配置时）

```bat
cpolar http 5173 --hostname picc-test.vip.cpolar.cn
```

#### 其他常用变体

| 命令                                                  | 说明                                                         |
| ----------------------------------------------------- | ------------------------------------------------------------ |
| `cpolar http 5173`                                    | 临时随机隧道（每次域名都变）                                 |
| `cpolar http -region=cn 5173`                         | 指定国内节点                                                 |
| `cpolar start-all`                                    | 启动 `cpolar.yml` 里配置好的所有隧道（配了固定域名就用这个） |
| `cpolar http 5173 --hostname picc-test.vip.cpolar.cn` | 用保留的固定域名                                             |

### 7) 一键启动脚本（自动同步域名到 .env）

- 已提供 `C:\Program Files\cpolar\start-and-sync.bat`：**双击即可**启动 cpolar 并从本地 API 读取当前公网域名、自动写进项目 `.env` 的 `OAUTH_REDIRECT_BASE`。
- 运行后 **重启 dev server** 让 `.env` 重新加载，再用脚本打印的域名打开登录页扫码。
- 该脚本只同步 `.env`；**企业微信后台回调域名仍需手动改成脚本打印的域名**（免费版每次都变）。保留固定域名后后台只需改一次。

### 真实打通自检清单

- [ ] `.env` 配齐 WECHAT*\*/WECOM*\* 凭证
- [ ] `demoMode` 为 false（未写死 true）
- [ ] 用 `https://你的域名` 打开登录页（非 localhost）
- [ ] 后台「网页授权及JS-SDK」OAuth2.0 回调域名 = 你的域名 且校验通过
- [ ] `public/WW_verify_*.txt` 能被公网访问
- [ ] 终端 mock 日志打印的 `base` 域名 == 后台登记域名
