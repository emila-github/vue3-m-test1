# 页面操作记录（Track）插件 —— 使用说明、埋点指南与回放拦截配置

> 适用版本：本仓库 `src/plugins/track` 当前实现
> 阅读对象：需要**接入埋点 / 排查回放 / 理解拦截器 / 对接后端回放隔离**的前端、测试与后端同学
> 配套源码：`src/plugins/track/`（插件）、`src/composables/useTrackReplay.ts`（回放状态）、`src/api/core/{http,replayGate}.ts`（请求网关）、`src/api/modules/track.ts`（上报接口）

---

## 0. 这份文档解决什么

- **怎么用**：在 `main.ts` 安装插件、在业务里 `enable/disable` 记录（第 3 章）；
- **埋点要打哪些**：哪些组件/字段必须打 `data-track-anchor`、哪些会自动生成、命名规范（第 7 章，重点）；
- **回放怎么拦**：前端在 axios 拦截器接入了什么、后端要在自己的拦截器/Gateway 配置什么才能阻止/隔离回放流量（第 8 章，重点）；
- **API 怎么查**：录制器、回放器、composable 的全部方法/选项速查（第 4、5、6 章）；
- **踩过的坑**：事故类型弹层按钮此前回放选不中、van- 动态类导致选择器脆弱等（第 9 章）。

---

## 1. 插件能做什么（能力边界）

| 能力 | 说明 |
| --- | --- |
| 无感知录制 | 全站 DOM 事件监听（click/input/change/submit/scroll/drag/page_view），被动、不阻塞主线程 |
| 隐私安全 | 输入值默认记录（供回放回填），**密码框明文默认不记**；可运行时关闭值记录 |
| 稳定选择器 | 录制时生成"去 van- 动态类"的稳定 CSS 选择器，回放稳定命中（见 7.4） |
| 滚轮列归一成 click | 下拉选项的"拖拽手势"录制为"最终选中项的 click"，坐标回放无法复现惯性落点 |
| 本地回放 | 给定事件序列在当前 DOM 重演（点击/输入/选择/拖拽/滚动/页面跳转） |
| 回放请求网关 | 回放中触发的接口请求默认本地模拟（不触达后端），可选"真实回放"打标记放行（见 8） |
| 会话上报 | 会话 + 事件批量上报 `/track/events`，可查询/回放（见 10） |

---

## 2. 架构总览

```
┌──────────────────────── 录制侧 ────────────────────────┐
│  main.ts: app.use(createTrackPlugin({ enabled }))        │
│       │ install → new TrackRecorder(options, router)     │
│       ▼                                                   │
│  TrackRecorder（recorder.ts）                            │
│   · 监听 DOM 事件 → 生成 TrackEvent（稳定选择器 + 值）   │
│   · 缓冲区 + 周期/离开时 flush → post(/track/events)      │
│   · 回放网关标记（replayGate.setReplaying 等，由 composable 写入）│
└──────────────────────────────────────────────────────────┘

┌──────────────────────── 回放侧 ────────────────────────┐
│  useTrackReplay（composables/useTrackReplay.ts）        │
│   · 载入会话事件 → replayTrackEvents(events, options)    │
│   · 标记 replayGate（setReplaying/setRealReplay）        │
│       ▼                                                   │
│  replayTrackEvents（replay.ts）                          │
│   · 按 t 时序逐步重演：定位元素→模拟点击/输入/拖拽/滚动/跳转│
│   · 找不到目标就"等就绪"或 onHint 提示                    │
│       ▼                                                   │
│  重演过程中触发的接口请求 → 被 api/core/http.ts 的       │
│  applyReplayGate 拦截（本地模拟 / 真实回放带 te 标记）    │
└──────────────────────────────────────────────────────────┘

        ┌──────── 后端 / 网关拦截器（第 8 章）────────┐
        │ 识别 X-Track-Replay / ?te → 隔离副作用 / 审计 │
        └──────────────────────────────────────────────┘
```

---

## 3. 快速开始

### 3.1 安装（main.ts）

```ts
import { createTrackPlugin } from '@/plugins/track'
// 默认 enabled=false：需业务主动 enable() 才开始记录（推荐，避免无差别记录）
app.use(createTrackPlugin())
// 若希望进入应用即全站记录：
// app.use(createTrackPlugin({ enabled: true }))
```

插件会把录制器单例挂到：
- `app.config.globalProperties.$track`
- `window.__track`（运行时调试入口，如 `window.__track.isEnabled()`）

### 3.2 在业务里开关记录

```ts
import { useTrack } from '@/plugins/track'

const track = useTrack()
track.enable()            // 开启记录（开始新会话）
track.disable()           // 关闭并落盘（强制上报残差）
track.toggle()            // 切换
track.setOptions({ captureValues: false }) // 运行时改配置（不重启、不上报）
```

### 3.3 在业务里回放

```ts
import { useTrackReplay } from '@/composables/useTrackReplay'
const { sessions, loadSessions, loadReplay, playReplay, stopReplay, setRealReplay } = useTrackReplay()

await loadSessions()      // 拉取会话列表
await loadReplay(id)      // 载入某会话的事件序列
playReplay()              // 开始回放（自动关闭记录、标记 replayGate）
stopReplay()              // 停止回放
setRealReplay(true)       // 开启"真实回放"：回放触发的请求放行后端并打 te 标记
```

> `playReplay` 内部会 `replayGate.setReplaying(true)` 并把会话 id 写入 `replayGate.setSession(id)`；停止时复位。这正是后端能识别"这是回放流量"的前提（见第 8 章）。

---

## 4. 录制器 API 速查

### 4.1 配置项 `TrackRecorderOptions`（也用于 `createTrackPlugin`）

| 选项 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `events` | `TrackEventType[]` | 全部 7 种 | 需要记录的动作类型 |
| `maxBatch` | `number` | `20` | 缓冲区达此数即自动 flush 上报 |
| `flushInterval` | `number` | `5000` | 周期检查间隔；仅在缓冲区已达 maxBatch 时才真正发送 |
| `sampleRate` | `number` | `1` | 采样率 0~1 |
| `captureValues` | `boolean` | `true` | 是否记录输入值（供回放回填） |
| `recordPassword` | `boolean` | `false` | 是否记录密码框明文 |
| `ignore` | `string[]` | `['[data-track-ignore]']` | 命中这些选择器的子树事件丢弃 |
| `endpoint` | `string` | `/track/events` | 上报端点 |
| `scrollThrottle` | `number` | `300` | 滚动采集节流 |
| `dragThreshold` | `number` | `5` | 拖拽位移阈值（px），小于视为点击 |
| `optionColumn` | `string` | `.van-picker-column` | 滚轮选项列选择器（列内拖拽归一成 click） |
| `optionSettleMs` | `number` | `1500` | 滚轮落点稳定判定超时 |
| `uploadOnInteractionOnly` | `boolean` | `true` | 仅出现真实交互才上报（避免大量进入页记录） |

### 4.2 实例方法（`TrackRecorder`）

| 方法 | 行为 |
| --- | --- |
| `enable(override?)` | 开启记录，开始新会话并挂载监听（幂等） |
| `disable()` | 关闭记录，force flush 残差并卸载监听 |
| `toggle()` | 开关切换 |
| `setOptions(override)` | 运行时改配置（仅 enabled 时生效，不重启、不上报） |
| `setRouter(router)` | 补挂路由守卫（已 enable 但未拿到 router 时） |
| `isEnabled()` | 是否开启 |
| `snapshot()` | 当前缓冲区快照 |
| `clear()` | 清空本地缓冲区 |
| `subscribe(cb)` | 订阅缓冲变化（调试/演示实时展示），返回取消函数 |

### 4.3 录制产出类型

- `TrackEvent`：`{ type, ts, t, path, selector?, tag?, text?, value?, isPassword?, checked?, x?, y?, fromX?, fromY?, toX?, toY?, scrollX?, scrollY? }`
- `TrackSession`：`{ sessionId, userId, userName, userAgent, platform, screen, startedAt, endedAt?, eventCount }`
- `TrackBatchPayload`：`{ session, events }`（上报体）
- `TrackEventType`：`page_view | click | input | change | submit | scroll | drag`

---

## 5. 回放器 API 速查

### 5.1 `replayTrackEvents(events, options): ReplayHandle`

| `ReplayOptions` 字段 | 默认 | 说明 |
| --- | --- | --- |
| `speed` | `1` | 速度倍率（实时=1） |
| `minStep` | `250` | 单步最小间隔 ms，避免过密看不清 |
| `root` | `document` | 检索根节点 |
| `onStep` | — | 每步执行前回调（高亮/进度） |
| `onDone` | — | 回放结束回调 |
| `navigate` | — | `page_view` 时真实跳转路由的回调 |
| `onHint` | — | "无法模拟"操作的提示回调 |
| `targetWaitMs` | `3000` | 交互目标未就绪时的最长等待 |

### 5.2 `ReplayHandle`

| 方法/属性 | 说明 |
| --- | --- |
| `play(fromIndex?)` | 从指定索引开始（支持断点续播） |
| `pause()` | 暂停 |
| `stop()` | 停止并复位索引 |
| `playing` / `index` / `total` | 只读状态 |

### 5.3 事件类型 录制 ↔ 回放 对照

| 事件 | 录制 | 回放重演 |
| --- | --- | --- |
| `page_view` | 路由切换/初始页 | 调 `navigate(fullPath)` 真实跳转 |
| `click` | 文本+坐标+选择器 | `resolveClickable` 后 `.click()`；picker 项异步补点 |
| `input` | 值（文本/密码/勾选态） | 回填值 + 派发 input/change |
| `change` | 值/勾选态 | select/checkbox 回填并派发事件 |
| `submit` | — | `form.requestSubmit()` 或派发 submit |
| `scroll` | 位置+可选选择器 | rAF 插值平滑滚动（window 或容器） |
| `drag` | 起止坐标 | 滑块(`.slider-bar`)走 pointer；其余走 touch 异步驱动 |

---

## 6. 回放状态管理（`useTrackReplay`）

模块级单例 composable，跨路由卸载存活。

| 状态/方法 | 说明 |
| --- | --- |
| `sessions` | 会话列表 |
| `replayEvents` / `replayIndex` / `replayTotal` | 当前回放事件序列与进度 |
| `replaying` | 是否回放中 |
| `listVisible` / `popupView` | 列表弹层可见性与视图（sessions/events） |
| `realReplay` | 真实回放开关（默认 false=本地模拟） |
| `loadSessions(silent?)` | 拉取会话列表 |
| `loadReplay(id)` | 载入会话事件 |
| `playReplay()` | 开始回放（自动关记录 + 标记 replayGate） |
| `stopReplay()` | 停止回放 |
| `setRealReplay(v)` | 切换真实回放（同步 `replayGate.setRealReplay`） |
| `openList()` | 打开列表 |

**断点续播**：回放进度写入 `localStorage('vant-track-replay')`，整页刷新后恢复断点；用户点"播放"从断点继续，不自动续播（避免意外重复操作）。

---

## 7. ⭐ 埋点指南（哪些组件需要 `data-track-anchor`）

### 7.1 为什么需要埋点

回放能否稳定命中元素，**取决于录制出的选择器是否稳定**。项目里存在两类"脆选择器"陷阱：

1. **van- 动态 id**：Vant 组件用全局自增计数器生成 `van-field-1-input`、`van-picker-2` 等 id，跨会话不稳定（编号随运行次数漂移、且跳号），录制出来回放时根本不存在 → 整页操作走兜底。
2. **van- 结构类剥落后退化**：选择器退化成 `div > li:nth-child(k)`，而弹层 teleport 到 body，容易误命中页面其它列表。

`data-track-anchor` 是**业务侧打的稳定、可读、唯一锚点**，录制器在 `buildSelector` 里优先级最高：一旦遇到带 `data-track-anchor` 的元素，立即生成 `button[data-track-anchor="xxx"]` 这类确定性选择器并停止向上回溯。

> 结论：**凡是需要被回放"精确点中"的字段、按钮、弹层选项/确认/取消，都应打 `data-track-anchor`**。

### 7.2 两类组件的不同处理方式

| 类别 | 组件 | 是否需要手写 `data-track-anchor` | 说明 |
| --- | --- | --- | --- |
| **字段根锚点** | `VantSelectField` / `VantTreeSelectField` / `VantTimePickerField` / `VantCalendarField` / `VantSearchField` / `VantCheckinField` / `VantUpload` | **需要**（由调用方在组件上写） | 这些组件已 `inheritAttrs=false`，把传入的 `data-track-anchor` 透传到字段根元素（van-field/根 div），用于"点击字段打开弹层"稳定定位 |
| **字段根 + 自动子锚点** | `VantSelectMultipleField` / `VantTreeTagsField` | **需要**（只在组件上写一个基名） | 除字段根透传基名外，还会**自动**为该弹层的 选项/确认/取消/清空 生成子锚点 |
| **纯原生/自定义按钮** | `<van-button>` / `<van-nav-bar>` / 自定义区域 | **需要**（直接写在元素上） | 直接给元素加 `data-track-anchor` |

### 7.3 自动生成的子锚点（关键，无需手写每一项）

调用方只需在组件上写一个**基名**（如 `extraCoverage`、`accidentType`），组件内部自动派生：

- **VantSelectMultipleField**（基名 `extraCoverage`）：
  - `extraCoverage-cancel`（取消）
  - `extraCoverage-confirm`（确定）
  - `extraCoverage-opt-<value>`（每个选项）
- **VantTreeTagsField**（基名 `accidentType`）：
  - `accidentType-clear`（清空）
  - `accidentType-cancel`（取消）
  - `accidentType-confirm`（确定）
  - `accidentType-opt-<value>`（树形每一项）

> 基名取自调用方传入的 `data-track-anchor`，回退到组件 `label`。所以你只写 `<VantTreeTagsField data-track-anchor="accidentType" .../>`，弹层内按钮与选项自动获得稳定锚点——这正是此前"事故类型弹层确定按钮回放选不中"问题的修复手段（见 9.1）。

### 7.4 手写锚点清单（示范页面 `VantInsuranceFormDemo.vue`）

以下是保险报案表单里**已落地的手写锚点**，作为命名范式参考：

| 锚点 | 对应元素 | 类型 |
| --- | --- | --- |
| `navBack` | 导航栏返回 | 按钮 |
| `reporterName` | 报案人姓名 | van-field |
| `phone` | 手机号 | van-field |
| `gender` | 性别 | van-field |
| `idCard` | 证件号码 | van-field |
| `relationship` | 与伤者关系 | van-field |
| `policyNo` | 保单号 | van-field |
| `insurer` | 承保公司 | 字段（下拉） |
| `insuranceType` | 险种 | 字段（多选） |
| `extraCoverage` | 附加险 | 多选（自动子锚点） |
| `effectiveDate` | 生效日期 | 字段（日期） |
| `accidentCause` | 事故原因 | 字段（下拉） |
| `accidentDate` | 事故日期 | 字段 |
| `accidentTime` | 事故时间 | 字段 |
| `region` | 归属机构 | 字段（树选） |
| `hospital` | 医院 | 字段（下拉） |
| `accidentType` | 事故类型 | 树形多选（自动子锚点） |
| `isHospitalized` | 是否住院 | van-field |
| `injuredCount` | 受伤人数 | van-field |
| `severity` | 事故严重程度 | van-field |
| `lossItems` | 损失项目 | 字段 |
| `description` | 事故描述 | 文本域 |
| `checkin` | 定位打卡 | 字段 |
| `idCardFront` / `idCardBack` | 身份证正/反面 | 附件上传 |
| `driverLicense` | 驾驶证 | 附件上传 |
| `medicalRecord` | 病历 | 附件上传 |
| `invoice` | 发票 | 附件上传 |
| `agree` | 同意条款 | 单元格 |

另：`VantTrackDemo.vue` 中城市选择字段打了 `data-track-anchor="city-select"`。

### 7.5 命名规范与最佳实践

1. **驼峰/连字符均可**，但必须**全站唯一且语义化**：`reporterName`、`accidentType-confirm`。
2. **弹层内子元素优先用组件的自动子锚点**，不要手动给每个选项写 `data-track-anchor`（既重复又易错）；只在组件上给基名。
3. **关键业务按钮要显式打锚点**：提交、确认、取消、清空、返回等。若仅依赖文本兜底，一旦页面存在同文本元素就会误命中（如"确定"在多个弹层都有）。
4. **不想被记录的子树加 `data-track-ignore`**（默认忽略选择器即为 `[data-track-ignore]`）。
5. **不要在 `van-button` 根元素上直接加** `data-track-anchor` 指望它透传——Vant4 的 `van-button` 用 `createVNode` 渲染根 `<button>`、不转发 `$attrs`。正确做法：把锚点放在按钮**内层 `<span>`**（覆盖默认 slot），如 `VantTreeTagsField` 的清空/取消/确定按钮做法。
6. **纯展示性元素**（如只读文本）无需锚点，除非它本身需要被点击回放。

---

## 8. ⭐ 后端回放阻止/隔离请求：前端拦截器做了什么、后端要配什么

### 8.1 前端已做：在 axios 请求拦截器接入 `applyReplayGate`

`src/api/core/http.ts` 的请求拦截器末尾调用了 `applyReplayGate(config)`，它实现**三态**：

```ts
function applyReplayGate(config) {
  if (!replayGate.isReplaying()) return                  // ① 普通浏览：原样放行
  if (replayGate.isRealReplay()) {
    const tag = replayGate.teMarker()                    // ② 真实回放：放行 + 打标记
    config.params = { ...config.params, te: tag }        //    query ?te=会话id
    config.headers['X-Track-Replay'] = tag               //    header X-Track-Replay
  } else {
    config.adapter = (() => Promise.resolve(             // ③ 本地模拟：替换最底层 adapter
      replayGate.buildLocalResponse(config))) as any      //    直接返回缓存/兜底，绝不发网络请求
  }
}
```

| 状态 | 触发 | 网络行为 | 标记 |
| --- | --- | --- | --- |
| ① 普通 / 录制中 | `isReplaying()===false` | 正常请求后端 | 无 |
| ② 真实回放 | `isReplaying() && isRealReplay()` | **放行到后端** | `?te=<id>` + `X-Track-Replay: <id>` |
| ③ 本地模拟（默认） | `isReplaying() && !isRealReplay()` | **不发请求**（adapter 替换，从源头消化） | 无 |

> 重点：**默认回放下，回放触发的请求根本到不了后端**（axios 最底层 adapter 被替换，直接返回录制缓存/兜底响应）。因此"前端侧阻止"已经生效，无需后端做任何事。

### 8.2 后端/网关需要配置的（仅"真实回放"场景）

当用户主动开启"真实回放"（`setRealReplay(true)`），回放流量**会真实打到后端**，此时必须由后端/网关识别并隔离，否则会对线上数据产生副作用。需要配置：

1. **识别标记**：在网关或接口拦截器读取 `X-Track-Replay` 请求头（或 `te` 查询参数），判定为"回放会话"。
2. **副作用隔离**：对标记流量
   - 不写业务审计/操作日志（避免污染真实审计）；
   - 不触发短信/推送/邮件等外部通知；
   - 不落真实业务流水，或路由到影子库/只读副本；
   - 写操作做幂等/熔断保护。
3. **幂等保护**：即便前端默认回放已不自发请求，真实回放仍会重演写操作（提交表单等），后端必须对这类流量做安全隔离。
4. **可观测**：将 `te` 值透传到日志，便于追溯"这条数据是回放产生的"。

> 一句话边界：**前端只能决定"发不发"和"带不带标记"；是否真正阻止/隔离，由后端依据 `X-Track-Replay` / `te` 实现。** 本插件已把标记打齐（header + query 双保险），后端照此识别即可。

### 8.3 拦截器配置清单（checklist）

前端（已完成，无需再动）：
- [x] `src/api/core/http.ts` 请求拦截器调用 `applyReplayGate` ✅
- [x] `replayGate` 单例在 `useTrackReplay.playReplay/stopReplay` 里被标记/复位 ✅
- [x] 真实回放带 `X-Track-Replay` + `?te` 双标记 ✅

后端/网关（需按 8.2 实现）：
- [ ] 网关/Interceptor 读取 `X-Track-Replay` 头
- [ ] 标记流量跳过审计/通知/真实流水
- [ ] 标记写操作做幂等/影子库隔离
- [ ] `te` 透传至日志

### 8.4 上报接口（供后端参考）

`src/api/modules/track.ts`：

| 函数 | 方法 | 路径 | 说明 |
| --- | --- | --- | --- |
| `sendTrackEvents(payload)` | POST | `/track/events` | 批量上报会话+事件 |
| `listTrackSessions({userId})` | GET | `/track/sessions` | 查询会话列表 |
| `getTrackSessionEvents(id)` | GET | `/track/sessions/:id/events` | 获取会话完整事件序列（回放用） |

上报体结构：`{ session: TrackSession, events: TrackEvent[] }`。

---

## 9. 典型问题与排查

### 9.1 事故类型弹层"确定"按钮回放选不中（已修复案例）

- **现象**：回放点"确定"时整条走"已执行操作（无法模拟）兜底。
- **根因**：`VantTreeTagsField` 弹层内 `清空/取消/确定` 三个按钮**无 `data-track-anchor`**，且 `van-button` 不转发 `$attrs`；选择器退化成 `van-popup > ... > button:nth-child(3)`，teleport 到 body 后命中失败。
- **修复**：给弹层按钮的**内层 `<span>`** 加 `accidentType-clear/-cancel/-confirm`，给每个选项加 `accidentType-opt-<value>`（见 7.3）。
- **经验**：凡是弹层内的关键按钮，必须用稳定锚点，不能依赖结构链 + 文本兜底。

### 9.2 选择器脆弱（van- 动态类）

录制器 `buildSelector` 已规避：遇到 `van-` 前缀的自动 id 跳过、优先用 `data-track-anchor`、保留稳定的 van- 结构类（如 `van-picker-column__item`）作兜底。若仍命中失败，优先补 `data-track-anchor`，而非改选择器逻辑。

### 9.3 滚轮列"拖拽"回放选不中

录制侧已把列内拖拽**归一成"最终选中项的 click"**（惯性落点不确定，坐标回放无法复现）。回放侧 `ensurePickerOption` 会在点击后异步复核补点，确保选中值落定后再由后续"确认"消费。若你的自定义滚轮封装不用 `.van-picker-column`，需在 `TrackRecorderOptions.optionColumn` 追加对应选择器。

### 9.4 回放请求打到真实后端

默认不会（8.1 ③）。若你确实需要真实后端数据，开启"真实回放"并确认后端已按 8.2 隔离；否则保持默认本地模拟。

---

## 10. 测试覆盖说明（便于改代码时回归）

测试位于 `src/plugins/track/__tests__/`：

| 文件 | 覆盖 |
| --- | --- |
| `recorder.spec.ts` | 会话生命周期、事件采集、隐私/采样、buildSelector 稳定性、滚动节流、拖拽识别与 click 抑制、路由去重、订阅清理 |
| `recorder-buffer.spec.ts` | **maxBatch 自动上报与清空、未达阈值仅离开时 flush、setRouter 补挂守卫** |
| `replay-core.spec.ts` | input/change/submit/scroll/page_view 还原、滑块 pointer 拖拽、定位失败 onHint、play/pause/stop、页面跳转后回放、下拉项就绪确认 |
| `replay-picker.spec.ts` | picker 选项 click 文本兜底精确命中（避开主页面同文本字段） |
| `replay-picker-drag.spec.ts` | 城市下拉 drag 用 touch 回放、不劫持滑块 |
| `replay-picker-multi.spec.ts` | 多步序列：打开弹层→选→确认 |
| `replay-drag.spec.ts` | **drag 坐标缺失提示、命中滑块走 pointer** |
| `plugin.spec.ts` | **createTrackPlugin 装配、useTrack 单例、enabled 自动开启、window 暴露、未安装抛错** |

运行：`pnpm vitest run src/plugins/track`。

---

## 11. API 速查索引（按使用场景）

- **安装插件**：`createTrackPlugin()` → `app.use(...)`（③ 章）
- **开关记录**：`useTrack().enable()/disable()/toggle()/setOptions()`（④ 章）
- **打埋点**：字段/按钮加 `data-track-anchor`；多选/树选组件写基名自动派生子锚点（⑦ 章）
- **忽略记录**：子树加 `data-track-ignore`
- **回放**：`useTrackReplay()` 的 `loadSessions/loadReplay/playReplay/stopReplay/setRealReplay`（⑥ 章）
- **自定义回放**：`replayTrackEvents(events, { navigate, onHint, onStep, targetWaitMs })`（⑤ 章）
- **隔离回放流量**：前端 `applyReplayGate` 已接；后端读 `X-Track-Replay`/`?te` 隔离（⑧ 章）
- **上报接口**：`sendTrackEvents / listTrackSessions / getTrackSessionEvents`（`src/api/modules/track.ts`）

---

> 文档配套源码位置速查：
> - 插件入口：`src/plugins/track/index.ts`
> - 录制器：`src/plugins/track/recorder.ts`
> - 回放器：`src/plugins/track/replay.ts`
> - 类型：`src/plugins/track/types.ts`
> - 回放状态：`src/composables/useTrackReplay.ts`
> - 上报接口：`src/api/modules/track.ts`
> - 请求网关（拦截器接入点）：`src/api/core/http.ts#applyReplayGate`、`src/api/core/replayGate.ts`
