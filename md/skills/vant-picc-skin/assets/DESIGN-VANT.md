---
version: 2.0.0
name: picc-vant4-design-system
description: 中国人民财产保险（PICC 人保财险）移动端 Vant4 组件设计系统 v2.0。基于官方 APP 界面截图重新设计，主 CTA 采用 PILL 全圆角药丸按钮，品牌红 #D71920，支持首页红色导航栏变体。以全局 CSS 变量皮肤形式落地，可一键撤销。
---

# PICC 人保财险 · Vant4 设计系统 v2.0（DESIGN-VANT）

> 本文档是 **Vant4 组件层** 的 PICC 设计规格 v2.0。
> **v2.0 核心变更**：基于 `md/picc/app-ui/` 下 7 张官方 APP 截图重新校准设计：
> - 主 CTA 按钮从 8px 圆角改为 **PILL 全圆角**（参考截图：立即报价/确定/签到/邀请好友均为药丸形）
> - 新增 **NavBar 红色渐变变体**（首页风格：红底白字）
> - 按钮高度从 44px 提升至 **48px**
> - 主按钮增加 **红色投影**增强触控反馈
>
> 通用设计语言（颜色/字体/间距 Token）与《DESIGN.md》一致，本文件聚焦「Vant4 组件 → PICC 取值」与「皮肤落地 / 快速撤销」机制。

## 1. 概述（Overview）

PICC 移动端的可信赖金融质感来自克制的红色点缀与稳定的中性灰层级：浅灰画布
（`#F5F6F8`）托起白色卡片（`#FFFFFF`），唯一品牌强调色 **PICC 品牌红**（`#D71920`）
严格收束于主 CTA、选中态、保障语义与角标。

**v2.0 关键特征（基于官方 APP 截图校准）：**
- 浅色画布 + 白色卡片的金融级清爽底色
- 品牌红仅用于主 CTA、选中态、保障语义、角标与错误提示
- **主 CTA 按钮采用 PILL 全圆角药丸形**（非 8px 圆角），这是 v2.0 最显著变化
- 中文无衬线（PingFang SC / HarmonyOS Sans）承载全部界面；大号保费/保额用 DIN 系数字体
- 卡片 `12px` 圆角；**小尺寸/次级按钮保持适度圆角**
- 金色 `#C9A063` 用于会员/尊享等次级强调，不与品牌红冲突
- 支持 **NavBar 红色渐变变体**（首页场景：红底白字 + logo）
- 主按钮高度 `48px`（比标准 44px 更易触控），带红色投影增强立体感

## 2. 颜色（Colors）

### 品牌与强调
| Token | 值 | 用途 |
|---|---|---|
| 品牌红 `primary` | `#D71920` | 主 CTA、选中态、角标、保障语义 |
| 品牌红深 `primary-deep` | `#A91218` | 按下 / 强调态 |
| 品牌红浅 `primary-soft` | `#FCEBEC` | 选中背景、浅红标签底 |
| 信息蓝 `info` | `#1A6FE8` | 链接、辅助操作、NavBar 右侧操作 |
| 尊享金 `gold` | `#C9A063` | 会员、尊享、积分 |

### 中性灰
墨黑 `#1A1A1A` · 墨黑染 `#333` · 炭灰 `#4A4A4A` · 板岩 `#666` · 钢灰 `#8A8A8A` · 石灰 `#A8A8A8` · 静音 `#BFBFBF`

### 表面
画布 `#F5F6F8` · 白面 `#FFF` · 白面替 `#FAFAFA` · 白面柔 `#F7F8FA`

### 细线
细线 `#EAEAEA` · 细线柔 `#F2F2F2` · 细线强 `#D9D9D9`

### 语义
成功 `#18A058` · 警告 `#F59E0B` · 错误=品牌红 `#D71920` · 遮罩 `rgba(0,0,0,0.45)` · 链接 `#1A6FE8`

## 3. 字体（Typography）

- **中文无衬线**：`PingFang SC` / `HarmonyOS Sans` / `Microsoft YaHei` / `system-ui`（全局默认字族）
- **数字展示体**：`DIN Alternate` / `Bebas Neue` / `PingFang SC`（保费/保额大数字）
- 正文 `15px` / `1.55` 行高；标题 `600/700`；字重克制

## 4. 形状（Shapes）

| Token | 值 | 用途 |
|---|---|---|
| `xs` | 4px | 计数器按钮、复选框、微控件 |
| `sm` | 6px | 浅红标签、紧凑 UI |
| `md` | 8px | 输入框、分段控件 |
| `lg` | 12px | **卡片、弹层、面板**（主导卡片圆角） |
| `xl` | 16px | sheet 顶部圆角 |
| `xxl` | 20px | 强调特性卡 |
| `full` | 9999px | **主 CTA 按钮、搜索框、角标、开关、Tag round** |

**v2.0 圆角规则（基于官方 APP 截图修正）：**
- **主 CTA 按钮 = PILL 全圆角 (`full/9999px`)** — 这是与 v1.0 最大的区别
- 小尺寸/次要按钮可使用 `sm/md` 圆角（如卡片内操作按钮组）
- 卡片统一 `12px`
- 搜索框和角标仍为 `full`

## 5. Vant4 组件映射（Component Mapping）

### 按钮 Button（v2.0 核心变更）
- **`type="primary"`**：**PILL 全圆角**、红底 `#D71920` 白字、高 `48px`、带**红色投影** `box-shadow: 0 4px 14px rgba(215,25,32,0.35)`
- 按下态：缩放至 `scale(0.97)` + 投影减弱 + 背景加深至 `#A91218`
- `type="default"`：白底、文字 `#1A1A1A`、边框 `#D9D9D9`、边框加粗至 `1.5px`
- `type="danger"`：红底白字（同品牌红 PILL）；`type="success/warning"` 对应语义色
- **禁用主按钮**：浅红底 `#FCEBEC` + 红字（`opacity:1`，保证可见）
- **小尺寸按钮** (`small`/`mini`)：不强制 pill，保持适度圆角

### 导航 NavBar / TabBar / Tabs
- **NavBar（默认）**：白底、标题墨黑 `17px`、底部 `1px #F2F2F2` 细线；右侧操作信息蓝
- **NavBar 红色变体** `.van-nav-bar--picc-primary`：**红底渐变** (`#D71920 → #E84A49`)、**白字白图标**、无边框底线。用于首页等需要品牌氛围的场景
- TabBar：选中态品牌红 `#D71920`、未选中钢灰 `#8A8A8A`、高 `50px`、图标 `22px`
- Tabs：选中下划线品牌红 `3px` 宽 `24px`、选中文字红

### 卡片与列表 Card / Cell / CellGroup
- Cell/Card：白底、圆角 `12px`、边框 `#F2F2F2`、标题灰 `#8A8A8A`、必填红 `#D71920`
- 商品卡价格：品牌红 `#D71920`

### 表单 Field / Switch / Checkbox / Radio / Stepper
- Field：标签炭灰、输入墨黑、占位静音灰、错误/必填红
- Switch：开启红 `#D71920`，关闭灰 `#D9D9D9`，`44×26`
- Checkbox/Radio：选中红 `#D71920`，未选中边框 `#D9D9D9`，`20px`
- Stepper：减号白底圆角 `6px`、加号**红底白字圆角 `6px`**（`32×32`）

### 选择 Tag / Badge / Slider / Rate / Progress
- Tag `primary`：红字；`plain` 浅红底 `#FCEBEC`；圆角 `6px`；round 为 `9999px`
- Badge：红底白字
- Slider：激活红 `#D71920`、轨道浅灰、高 `4px`
- Rate：满星红 `#D71920`、空星 `#EEE`
- Progress：填充红、轨道 `#EAEAEA`、pivot 红底白字

### 弹出与反馈 Popup / ActionSheet / Picker / Dialog / Notify / NoticeBar
- Popup/Sheet：白底、顶部 `16px` 圆角
- Picker：确认红、取消灰
- Dialog：`12px` 圆角、确认红
- Notify：primary 红底白字
- NoticeBar：软红底 `#FCEBEC` + 红字（默认语义）

### 其它
- Search：浅底 `#F7F8FA` + 全圆角（pill 搜索框）、操作文字信息蓝
- Uploader：添加框浅底、图标红
- Calendar：选中日红底白字、区间浅红
- Sidebar / TreeSelect / DropdownMenu：选中红
- Loading / Spinner：红色
- Steps 步骤条：完成/进行中态红色

## 6. 皮肤落地与快速撤销（Skin & Revert）

皮肤以 **全局 CSS 变量** 形式实现，作用域为 `<html class="picc-skin">`：

- 实现：`src/styles/vant-picc.css`（覆盖 Vant4 全部组件变量 + 关键 class + PICC 特色增强）
- 挂载：`main.ts` 在 `vant/lib/index.css` 之后引入该文件
- 开关：`src/composables/usePiccSkin.ts` 在 `<html>` 增删 `picc-skin` class，并持久化到 localStorage
- 初始化：`App.vue` 启动 `initSkin(true)`（默认开启）

**快速撤销 = 移除 `picc-skin` class**，所有 Vant4 组件即时回退默认主题，无需重新构建：
1. 开发环境左下角悬浮开关点击切换；
2. 控制台 `window.__piccSkin.toggle()`；
3. 代码 `usePiccSkin().disable()`。

## 7. 页面级辅助类（Utility Classes）

皮肤额外提供以下 BEM 辅助类，可在任意页面模板中直接使用（均在 `html.picc-skin` 作用域内）：

| 类名 | 用途 | 参考 |
|---|---|---|
| `.picc-page` | 页面通用容器（min-height:100vh + 画布背景） | — |
| `.picc-card` | 白色卡片容器（12px圆角 + 轻阴影 + 内边距） | 保单卡片/表单卡片 |
| `.picc-header-gradient` | 红色渐变头部装饰区 | 首页头部/签到页头部 |
| `.picc-price` | 价格文字（红色 + DIN 数字字体） | 保费/金额展示 |
| `.picc-number-display` | 大号数字展示体（DIN字体 + 粗体） | 保额大数字 |
| `.picc-notice-warm` | 暖橙色提示条 | 重要提示信息 |
| `.picc-section-title` | 区块分组标题（17px 粗体） | 页面分区标题 |

## 8. 可做 / 不可做（Do & Don't）

### 可做
- 品牌红收束于主 CTA、选中态、保障语义、角标、错误提示
- **主 CTA 按钮使用 PILL 全圆角**（这是 v2.0 的核心特征，匹配官方 APP）
- 小尺寸/次要操作按钮可使用 `8px` 或 `12px` 圆角（不需要全部 pill）
- 选中态（TabBar/标签/单选/复选/开关）一律品牌红
- 浅红底标签/角标用品牌红文字，禁止白字
- 首页 NavBar 使用 `.van-nav-bar--picc-primary` 红色变体
- 使用 `.picc-*` 辅助类构建页面布局
- 用 `usePiccSkin` 管理皮肤，状态持久化

### 不可做
- 不在页面用 `:deep()` 逐组件覆写 Vant4（应进全局皮肤）
- 不硬编码 `#1989fa` / `#ee0a24` 等 Vant 默认色
- 不把品牌红铺成大面纯色背景（整屏红削弱金融可信感，但渐变装饰区可以）
- 不改 `:root` 或非作用域全局样式来「临时改色」，否则破坏快速撤销
- **不要给主 CTA 按钮设置 `round=false` 来取消 pill 形状**

## 9. 迭代指南（Iteration Guide）
1. 一次聚焦一个组件，直接引用 Vant4 变量名与 PICC Token
2. 所有新增覆盖必须包在 `html.picc-skin` 作用域
3. 对 inline 注入变量的组件（slider/rate 等），用 `.van-xxx { --van-xxx: <值> !important }` 覆盖
4. 改完运行 `read_lints` + `pnpm dev` 目测，并用悬浮开关验证「一键撤销」
5. 品牌红仅用于主 CTA、选中态、保障语义、角标与错误提示
6. 新增页面级样式优先考虑封装为 `.picc-*` 辅助类而非散落 scoped style

## 附录：v1.0 → v2.0 变更清单

| 项目 | v1.0 (旧) | v2.0 (新) | 依据 |
|------|-----------|-----------|------|
| 主按钮圆角 | `8px` | **`9999px` (PILL)** | 官方 APP 所有主CTA均为药丸形 |
| 按钮高度 | `44px` | **`48px`** | 增强移动端触控体验 |
| 按钮投影 | 无 | **`0 4px 14px rgba(215,25,32,0.35)`** | 匹配截图立体感 |
| 按下态 | 仅变色 | **缩放 + 投影减弱 + 变色** | 增强触控反馈 |
| NavBar | 仅白色 | **支持红色渐变变体** | 首页截图红底导航栏 |
| 默认按钮边框 | `1px` | **`1.5px`** | 增强描边可见度 |
| Stepper 圆角 | `4px` | **`6px`** | 更柔和的视觉 |
| 辅助类 | 无 | **`.picc-*` 7 个** | 提升开发效率 |
| 小尺寸按钮 | 同主按钮 | **独立控制（不强制 pill）** | 保持紧凑布局可用性 |
