# vant-picc-skin · PICC 人保财险 Vant4 皮肤技能

PICC 移动端 Vant4 设计系统皮肤。基于官方 APP 截图重构 Vant4 全部组件为 PICC 品牌风格，并以全局 CSS 变量皮肤形式落地，可在任意 Vant4 项目一键套用、快速撤销。

版本：v2.0.0

## 品牌规范
- 品牌红：#D71920
- 画布：浅灰背景 + 白卡片
- 卡片圆角：12px
- 主按钮：PILL 全圆角（9999px）+ 48px 高 + 红色投影 + 按下 scale(0.97)
- NavBar 红色渐变变体（首页风格）
- 选中态：红

## 技能包包含
.codebuddy/skills/vant-picc-skin/

SKILL.md
技能主说明：设计基线、Do/Don't、工作流、§0 初始化工作流、参考索引。

references/tokens.md
Vant4 CSS 变量 → PICC 取值 全量表（v2.0）。

assets/vant-picc.css
皮肤实现权威副本。setup.mjs 会复制到目标项目 src/styles/vant-picc.css。

assets/usePiccSkin.ts
皮肤开关权威副本。在 <html> 上增删 picc-skin class，持久化到 localStorage；自带开发环境悬浮开关自动注入。setup.mjs 会复制到目标项目 src/composables/usePiccSkin.ts。

assets/DESIGN-VANT.md
设计规格文档副本（Token → Vant4 组件映射、可做/不可做）。

assets/setup.mjs
一键初始化脚本（幂等）。复制皮肤文件并自动注入 main.ts，使新 Vant4 项目可一键接入 PICC 皮肤。

## 给其它 Vant4 项目做初始化（只拷贝本技能目录即可）
把整个技能目录 .codebuddy/skills/vant-picc-skin 复制到目标 Vant4 项目后，在目标项目根目录运行：

node <技能目录>/assets/setup.mjs

脚本自动完成（幂等，可重复运行）：
1. 复制 assets/vant-picc.css → src/styles/vant-picc.css
2. 复制 assets/usePiccSkin.ts → src/composables/usePiccSkin.ts
3. 在 src/main.ts 注入皮肤引入（import './styles/vant-picc.css'）与启动调用 initSkin(true)

接入后无需改动 App.vue：usePiccSkin 会在开发环境自动注入左下角「PICC 皮肤」悬浮开关，也可用 window.__piccSkin.toggle() 切换。若目标项目没有 main.ts，脚本会打印手动接入提示。

## 手动接入（无 main.ts 或想自行接线时）
1. 复制 assets/vant-picc.css 到 src/styles/vant-picc.css
2. 复制 assets/usePiccSkin.ts 到 src/composables/usePiccSkin.ts
3. 在入口文件（如 main.ts）引入皮肤并启动：
   import './styles/vant-picc.css'
   import { initSkin } from './composables/usePiccSkin'
   initSkin(true)

## 撤销皮肤
- 调用 window.__piccSkin.set(false) 或在悬浮开关点击关闭，移除 <html> 上的 picc-skin class 即可还原原生 Vant4 样式。
- 彻底移除：删除 src/styles/vant-picc.css、src/composables/usePiccSkin.ts 及 main.ts 中的两行引入/启动代码。

## 页面级辅助类（v2.0）
.picc-page 页面容器（浅灰底、内边距、最大宽）
.picc-card 白卡片（12px 圆角、阴影）
.picc-header-gradient 红→深红渐变头部
.picc-price 价格金额（品牌红、加粗）
.picc-number-display 大号数字展示
.picc-notice-warm 暖色提示条
.picc-section-title 分区标题（左侧红条）

## 适用任务
- 应用 / 撤销 PICC Vant4 皮肤
- 重构 Vant4 页面样式为 PICC 品牌风格
