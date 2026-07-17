# Vant4 CSS 变量 → PICC 取值映射（v2.0）

> 权威实现见 `src/styles/vant-picc.css`（v2.0）。下表为常用变量与 PICC 取值对照，
> 供重构页面 / 扩展皮肤时查阅。所有覆盖均在 `html.picc-skin` 作用域内。
>
> **v2.0 核心变更**：主 CTA 按钮改为 **PILL 全圆角**（`9999px`）+ **48px 高** + 红色投影；
> 新增 NavBar 红色渐变变体；新增 7 个页面级辅助类。基于 PICC 官方 APP 截图校准。

## 全局基础
| Vant4 变量 | PICC 取值 | 说明 |
|---|---|---|
| `--van-primary-color` | `#D71920` | 品牌红（按钮/标签/选中态主色） |
| `--van-primary-color-light` | `#FCEBEC` | 品牌红浅（按下/浅底） |
| `--van-primary-color-light-2` | `#F9D7D9` | 品牌红更浅（轨道/占比条） |
| `--van-success-color` | `#18A058` | 成功绿 |
| `--van-danger-color` | `#D71920` | 危险红=品牌红 |
| `--van-warning-color` | `#F59E0B` | 警告橙 |
| `--van-red` / `--van-blue` / `--van-green` / `--van-orange` | `#D71920` / `#1A6FE8` / `#18A058` / `#F59E0B` | 衍生语义色 |
| `--van-text-color` / `-2` / `-3` | `#1A1A1A` / `#666` / `#8A8A8A` | 文本三级 |
| `--van-active-color` | `#F2F2F2` | 按压背景 |
| `--van-background` / `-2` / `-3` | `#F5F6F8` / `#FFF` / `#F7F8FA` | 画布 / 白面 / 白面柔 |
| `--van-border-color` | `#EAEAEA` | 细线 |
| `--van-radius-sm/md/lg/max` | `4/8/12/9999px` | 圆角尺度 |
| `--van-font-size-xs/sm/md/lg` | `13/14/15/16px` | 字号 |
| `--van-font-bold` | `600` | 字重 |

## 组件级
| 组件 | 关键变量 | PICC 取值 |
|---|---|---|
| Button | `--van-button-primary-background` / `-color` | `#D71920` / `#FFF` |
| Button | `--van-button-default-border-color` | `#D9D9D9`（描边 1.5px） |
| Button | `--van-button-radius` / `--van-button-round-radius` | `9999px` / `9999px`（**v2.0: PILL 全圆角**） |
| Button | `--van-button-height` / `-line-height` | `48px` / `46px`（**v2.0: 提升至 48px**） |
| Button | `--van-button-mini-height` / `-small-height` | `28px` / `32px`（小尺寸保持适度非 pill） |
| Button | `--van-button-danger-*` / `-success-*` / `-warning-*` | 对应语义色 |
| Button（增强） | 主按钮红色投影 `0 4px 14px rgba(215,25,32,.35)`；按下 `scale(.97)` | 见 CSS `§4` |
| NavBar | `--van-nav-bar-background` / `-title-text-color` | `#FFF` / `#1A1A1A`（默认白底） |
| NavBar | `--van-nav-bar-text-color`（右侧操作） | `#1A6FE8` |
| NavBar（变体） | `.van-nav-bar--picc-primary` | 红色渐变 `linear-gradient(135deg,#D71920,#E84A49)` + 白字 |
| TabBar | `--van-tabbar-height` / `-item-active-color` | `50px` / `#D71920` |
| Tabs | `--van-tabs-bottom-bar-color` / `--van-tab-active-text-color` | `#D71920` |
| Cell | `--van-cell-background` / `-border-color` / `-text-color` | `#FFF` / `#F2F2F2` / `#1A1A1A` |
| Cell | `--van-cell-required-color` | `#D71920` |
| Field | `--van-field-label-color` / `-input-text-color` / `-placeholder-text-color` | `#4A4A4A` / `#1A1A1A` / `#BFBFBF` |
| Switch | `--van-switch-on-background` / `-background`(off) | `#D71920` / `#D9D9D9` |
| Checkbox | `--van-checkbox-checked-icon-color` / `-size` | `#D71920` / `20px` |
| Radio | `--van-radio-checked-icon-color` / `-size` | `#D71920` / `20px` |
| Stepper | `--van-stepper-button-icon-color` / plus(类覆盖) | `#1A1A1A` / 加号红底白字 |
| Tag | `--van-tag-primary-color` / `-plain-background` / `-radius` | `#D71920` / `#FCEBEC` / `6px` |
| Badge | `--van-badge-background` / `-color` | `#D71920` / `#FFF` |
| Slider | `--van-slider-active-background`(类覆盖 !important) | `#D71920` |
| Rate | `--van-rate-icon-full-color`(类覆盖 !important) | `#D71920` |
| Progress | `--van-progress-color` / `-pivot-background` | `#D71920` / `#D71920` |
| Popup | `--van-popup-background` / `-round-radius` | `#FFF` / `16px` |
| ActionSheet | `--van-action-sheet-item-text-color` | `#1A1A1A` |
| Picker | `--van-picker-confirm-action-color` | `#D71920` |
| Calendar | `--van-calendar-selected-day-background` | `#D71920` |
| Dialog | `--van-dialog-radius` / `-confirm-button-text-color` | `12px` / `#D71920` |
| Search | `--van-search-content-background` / 类覆盖圆角 | `#F7F8FA` / `9999px` |
| Notify | `--van-notify-primary-background` | `#D71920` |
| NoticeBar | `--van-notice-bar-background` / `-text-color` | `#FCEBEC` / `#D71920` |
| Loading | `--van-loading-spinner-color` | `#D71920` |
| Uploader | `--van-uploader-upload-background` / `-icon-color` | `#F7F8FA` / `#D71920` |
| Card | `--van-card-price-color` / `-thumb-radius` | `#D71920` / `12px` |
| SubmitBar | `.van-submit-bar__price`(类覆盖) | `#D71920` |
| Sidebar | `--van-sidebar-selected-border-color` | `#D71920` |
| TreeSelect | `--van-tree-select-item-active-color` | `#D71920` |
| DropdownMenu | `--van-dropdown-menu-option-active-color` | `#D71920` |

## 页面可引用 Token（定义在 `html.picc-skin`）
`--picc-primary` `#d71920` · `--picc-primary-deep` `#a91218` · `--picc-primary-soft` `#fcebec` · `--picc-primary-tint` `#f9d7d9`
`--picc-info` `#1a6fe8` · `--picc-info-deep` `#1455b8` · `--picc-gold` `#c9a063` · `--picc-gold-soft` `#f7efe0`
`--picc-ink` `#1a1a1a` · `--picc-charcoal` `#4a4a4a` · `--picc-slate` `#666` · `--picc-steel` `#8a8a8a` · `--picc-muted` `#bfbfbf`
`--picc-canvas` `#f5f6f8` · `--picc-surface` `#fff` · `--picc-surface-soft` `#f7f8fa`
`--picc-radius-md` `8px` · `--picc-radius-lg` `12px` · `--picc-radius-xl` `16px` · `--picc-radius-full` `9999px`
`--picc-success` `#18a058` · `--picc-warning` `#f59e0b` · `--picc-error` `#d71920`

## 页面级辅助类（v2.0 新增，作用域 `html.picc-skin`）
| 类 | 取值要点 |
|---|---|
| `.picc-page` | `min-height:100vh; background:#f5f6f8` |
| `.picc-card` | 白底、`border-radius:12px`、`margin:10px 12px`、`padding:16px`、轻投影 |
| `.picc-header-gradient` | 红色渐变 `135deg #D71920 → #E84A49 → #F08A5B`、下缘 `20px` 圆角、`min-height:120px` |
| `.picc-price` | `#d71920` + DIN 系数字体、700 |
| `.picc-number-display` | DIN 系数字体、700、字距 `-0.02em` |
| `.picc-notice-warm` | 浅橙底 `#fff7ed`、深橙字 `#c2410c`、`border-radius:4px` |
| `.picc-section-title` | `17px` / `600` / `#1a1a1a` |
