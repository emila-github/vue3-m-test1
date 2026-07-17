---
name: vant-picc-skin
description: >
  PICC 人保财险（中国人民财产保险）移动端 Vant4 设计系统皮肤。
  将 Vant4 的全部组件重构为 PICC 品牌风格（品牌红 #D71920、浅灰画布 + 白卡、
  PILL 全圆角主按钮 / 12px 卡片、选中态红、NavBar 红色渐变变体、页面级辅助类），
  并以全局 CSS 变量皮肤形式落地，可在任意用到 Vant4 的页面一键套用、快速撤销。
  涉及「应用 / 撤销 PICC Vant4 皮肤」「重构 Vant4 页面样式」的任务都必须加载此技能。
version: 2.0.0
license: MIT
metadata:
  author: 'PICC Design System'
  category: 'Design System / Vant4'
  tags: ['Vant4', 'PICC', '人保财险', '设计系统', '皮肤', '主题']
---

# PICC 人保财险 · Vant4 全局皮肤技能

本技能提供一套 **PICC 人保财险品牌风格的 Vant4 组件皮肤**，以全局 CSS 变量形式实现，
可在项目中一键套用、快速撤销，并把散落在各页面的 Vant4 覆写收敛为单一皮肤。

> **v2.0 关键变更（基于 PICC 官方 APP 截图 `md/picc/app-ui/` 重新校准）：**
> - 主 CTA 按钮改为 **PILL 全圆角**（`9999px` 药丸形，参考截图「立即报价 / 确定 / 签到 / 邀请好友」等均为药丸形）
> - 主按钮 **height 提升至 48px**，并带 **红色投影** 增强立体感与触控反馈
> - 新增 **NavBar 红色渐变变体** `.van-nav-bar--picc-primary`（首页风格红底白字）
> - 新增 **7 个页面级辅助类**（`.picc-page` / `.picc-card` / `.picc-header-gradient` / `.picc-price` / `.picc-number-display` / `.picc-notice-warm` / `.picc-section-title`）
> - 描边次级按钮边框加粗至 `1.5px`

---

## 0. 初始化其它 Vant4 项目（首次接入，本技能已自包含）

把整个技能目录 `.codebuddy/skills/vant-picc-skin` 复制到目标 Vant4 项目后，
**在目标项目根目录**运行：

```bash
node <技能目录>/assets/setup.mjs
```

脚本会自动完成「接入 PICC 皮肤」的全部工作（幂等，可重复运行）：
1. 复制 `assets/vant-picc.css` → `src/styles/vant-picc.css`
2. 复制 `assets/usePiccSkin.ts` → `src/composables/usePiccSkin.ts`
3. 在 `src/main.ts` 注入皮肤引入（`import './styles/vant-picc.css'`）与启动调用 `initSkin(true)`

接入后，**无需改动 `App.vue`**：`usePiccSkin` 会在开发环境自动注入左下角「PICC 皮肤」悬浮开关，
也可用 `window.__piccSkin.toggle()` 切换。若目标项目没有 `main.ts`，脚本会打印手动接入提示。

---

## 核心文件

> **本技能已自包含**：皮肤实现、开关 composable、设计文档与初始化脚本都打包在 `assets/` 内。
> 把整个技能目录复制到任意 Vant4 项目后，运行 `assets/setup.mjs` 即可一键接入（见 §0）。

### 项目落地文件（由 `setup.mjs` 自动生成）
| 文件 | 作用 |
|------|------|
| `src/styles/vant-picc.css` | 全局皮肤（v2.0）：Vant4 全部组件 CSS 变量 + 关键 class + 页面级辅助类，作用域 `.picc-skin` |
| `src/composables/usePiccSkin.ts` | 皮肤开关：在 `<html>` 上增删 `picc-skin` class，持久化到 localStorage；自带开发环境悬浮开关自动注入 |
| `src/main.ts` | 由 `setup.mjs` 自动注入 `import './styles/vant-picc.css'` 与 `initSkin(true)` |
| `src/App.vue` | 本项目自带悬浮开关；新项目由 `usePiccSkin` 自动注入开关，**无需改动 App.vue** |
| `md/picc/DESIGN-VANT.md` | 本皮肤的完整设计规格（Token → Vant4 组件映射、可做/不可做） |

### 技能自带资产（`assets/`，随技能分发）
| 文件 | 作用 |
|------|------|
| `assets/vant-picc.css` | 皮肤实现权威副本，`setup.mjs` 会复制到 `src/styles/` |
| `assets/usePiccSkin.ts` | 皮肤开关权威副本，`setup.mjs` 会复制到 `src/composables/` |
| `assets/DESIGN-VANT.md` | 设计规格文档副本 |
| `assets/setup.mjs` | 一键初始化脚本：复制上述文件并注入 `main.ts`（幂等） |

---

## 设计基线（Token）

- **品牌红** `#D71920`（仅主 CTA / 选中态 / 保障语义 / 角标）
- **品牌红深** `#A91218`（按下态）
- **品牌红浅** `#FCEBEC`（选中底 / 浅红标签）
- **信息蓝** `#1A6FE8`（链接、辅助操作）
- **画布** `#F5F6F8` / **白面** `#FFFFFF` / **白面柔** `#F7F8FA`
- **中性灰**：墨黑 `#1A1A1A`、炭灰 `#4A4A4A`、板岩 `#666666`、钢灰 `#8A8A8A`、静音 `#BFBFBF`
- **细线**：`#EAEAEA` / 柔 `#F2F2F2` / 强 `#D9D9D9`
- **圆角**：主按钮 **PILL `9999px`** / 卡片 `12px` / 输入框 `8px` / 小尺寸按钮适度圆角 / 搜索框与角标 `9999px`
- **语义**：成功 `#18A058`、警告 `#F59E0B`、错误同品牌红、遮罩 `rgba(0,0,0,0.45)`

完整映射见 `md/picc/DESIGN-VANT.md` 与 `references/tokens.md`。

---

## 工作流（Workflow）

### 1. 套用皮肤（全局，默认开启）
- `main.ts` 已引入皮肤 CSS；`App.vue` 启动时 `initSkin(true)` 自动为 `<html>` 加 `picc-skin` class。
- **无需**在每个页面重复 `:deep()` 覆写 Vant4——皮肤已全局生效。

### 2. 快速撤销 / 恢复（核心诉求）
皮肤作用域是 `<html class="picc-skin">`，撤销 = 移除该 class，所有 Vant4 组件即时回退默认主题，**无需重新构建**。
三种方式：
1. 开发环境：左下角悬浮开关「PICC 皮肤 · 开/关」点击切换。
2. 浏览器控制台：`window.__piccSkin.toggle()` / `.enable()` / `.disable()`。
3. 代码内：`const { disable } = usePiccSkin(); disable()`。
选择会持久化（`localStorage: picc-skin-enabled`），下次启动自动恢复。

### 3. 重构一个用到 Vant4 的页面（重置样式 → 统一皮肤）
把页面里**针对 Vant4 组件**的硬核样式收敛掉，交给全局皮肤：
1. 删除页面 `<style>` 中的 `:deep(.van-xxx)` 覆写块（若有）。
2. 移除硬编码品牌色 `#1989fa`（Vant 蓝）、`#ee0a24`（Vant 红），改为引用皮肤：
   - 直接删除这些内联值，让组件回落到 `--van-*` 变量（已为 PICC 红）。
   - 或统一替换为 `#D71920`（页面自有装饰色，如价格、选中芯片）。
3. 对会**以 inline style 注入变量**的组件，按以下处理（皮肤已用 `!important` 兜底）：
   - `van-slider` 的 `active-color`：直接删掉 prop，由 `.van-slider__bar` 覆盖变红。
   - `van-rate` 的 `color`：删掉 prop，由 `.van-rate` 覆盖变红。
   - `van-dialog` 的 `confirm-button-color`：删掉 prop，回落 `--van-dialog-confirm-button-text-color`。
   - `van-notice-bar` 的 `color` / `background`：删掉 prop，回落皮肤软红。
4. 保留页面**布局级**样式（卡片间距、栅格、自定义区块），只清掉「组件主题」层。
5. 需要品牌氛围时，直接在模板使用页面级辅助类（见 §5）。

### 4. 扩展皮肤（新增组件 / 调色）
- 统一在 `src/styles/vant-picc.css` 内、对应组件的注释段下追加变量；**必须**包在 `html.picc-skin` 作用域，保证可撤销。
- 需要覆盖 inline 注入的变量时，用 `html.picc-skin .van-xxx { --van-xxx: <值> !important; }`。
- 改完跑 `read_lints` 与 `pnpm dev` 目测。

### 5. 页面级辅助类（直接用于模板）
v2.0 新增，便于快速构建 PICC 品牌页面，全部作用域在 `html.picc-skin` 内：

| 类 | 用途 |
|----|------|
| `.picc-page` | 通用页面容器（浅灰画布、min-height 100vh） |
| `.picc-card` | 白卡容器（白底、12px 圆角、轻投影、内边距 16px） |
| `.picc-header-gradient` | 红色渐变头部区域（首页 / 签到页风格，下缘 20px 圆角） |
| `.picc-price` | 价格文字（品牌红 + DIN 系数字体） |
| `.picc-number-display` | 大数字展示体（保费 / 保额，DIN 系字体） |
| `.picc-notice-warm` | 暖色提示条（浅橙底、深橙字，用于实名/合规提示） |
| `.picc-section-title` | 分组标题（17px、600、墨黑） |

### 6. NavBar 红色渐变变体
首页等需要品牌氛围时，给 `van-nav-bar` 加 class `van-nav-bar--picc-primary` 即可获得红底白字渐变导航栏（默认 NavBar 仍为白底黑字）。

---

## 可做 / 不可做（Do & Don't）

### 可做
- 品牌红严格收束于主 CTA、选中态、保障语义、角标与错误提示。
- **主 CTA 按钮使用 PILL 全圆角 (`9999px`)**，高度 48px，带红色投影（v2.0 核心特征）。
- 卡片 12px；输入框 8px；小尺寸（small/mini）按钮保持适度圆角，不用 full pill。
- 选中态（TabBar、标签、单选/复选、开关）一律品牌红。
- 浅红底标签/角标用品牌红文字，禁止白字。
- 首页 NavBar 使用 `.van-nav-bar--picc-primary` 红色渐变变体。
- 用 `usePiccSkin` 开关管理皮肤，状态持久化。

### 不可做
- 不要在页面里再用 `:deep()` 逐组件覆写 Vant4（应进全局皮肤）。
- 不要把 `#1989fa` / `#ee0a24` 等 Vant 默认色硬编码进新代码。
- 不要把品牌红铺成大面纯色背景（渐变装饰区除外，如 `.picc-header-gradient`）。
- 不要给主按钮使用 **非** pill 圆角（官方 APP 所有主操作按钮均为药丸形）。
- 不要为了「临时改色」直接改 `:root` 或全局非作用域样式，这会破坏「快速撤销」。

---

## 参考
- `md/picc/DESIGN-VANT.md`（或 `assets/DESIGN-VANT.md`）：完整设计规格
- `references/tokens.md`：Vant4 CSS 变量 → PICC 取值 全量表
- `src/styles/vant-picc.css`（权威副本见 `assets/vant-picc.css`）：皮肤实现
