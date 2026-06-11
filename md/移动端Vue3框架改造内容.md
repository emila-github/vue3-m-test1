# 移动端 Vue3 框架改造内容文档

## 概述

将原有的桌面端 Vue3 + Vite + TypeScript 项目改造为适配移动端开发的框架，包含移动端布局、px→vw 自动转换、底部 TabBar 导航、安全区域适配等能力。

---

## 一、项目信息

| 项目 | 说明 |
|------|------|
| 技术栈 | Vue 3.5 + Vite 8 + TypeScript 6 + Pinia 3 + Vue Router 5 |
| 包管理 | pnpm |
| 设计稿宽度 | 375px |
| 适配方案 | postcss-px-to-viewport-8-plugin（px 自动转 vw） |

---

## 二、新增依赖

```json
{
  "postcss-px-to-viewport-8-plugin": "^1.2.5"
}
```

---

## 三、文件改造详情

### 3.1 `index.html` — 移动端 Meta 配置

| 改动项 | 说明 |
|--------|------|
| `lang="zh-CN"` | 中文语言标识 |
| `viewport` | 添加 `maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover` |
| `apple-mobile-web-app-capable` | iOS WebApp 全屏支持 |
| `apple-mobile-web-app-status-bar-style` | iOS 状态栏样式 |
| `format-detection=telephone=no` | 禁止自动检测电话号码 |
| `<title>` | 改为「移动端应用」 |

### 3.2 `vite.config.ts` — PostCSS 配置

新增 `postcss-px-to-viewport-8-plugin` 插件配置：

```ts
pxToViewport({
  viewportWidth: 375,    // 设计稿宽度
  unitPrecision: 5,      // 转换精度
  viewportUnit: 'vw',    // 转换单位
  selectorBlackList: ['.ignore-vw'],  // 忽略转换的选择器
  minPixelValue: 1,      // 最小转换值
  mediaQuery: false,     // 不转换媒体查询
  exclude: [/node_modules/],  // 排除 node_modules
})
```

### 3.3 `src/assets/base.css` — 全局 CSS 变量与 Reset

**CSS 变量体系：**

| 类别 | 变量示例 | 用途 |
|------|----------|------|
| 主题色 | `--color-primary: #1989fa` | 主色调 |
| 功能色 | `--color-success/warning/danger/info` | 成功/警告/危险/信息 |
| 背景色 | `--color-bg: #f7f8fa` | 页面背景 |
| 文字色 | `--color-text-primary/regular/secondary/placeholder` | 四级文字层级 |
| 边框色 | `--color-border: #ebedf0` | 边框颜色 |
| 间距 | `--spacing-xs/sm/md/lg/xl` | 4/8/12/16/24px |
| 圆角 | `--radius-sm/md/lg` | 4/8/12px |
| 字体 | `--font-size-xs/sm/md/lg/xl` | 10/12/14/16/18px |
| 安全区 | `--safe-area-bottom` | 底部安全区域 |

**全局 Reset：**
- 清除所有元素默认内外边距
- `html, body` 宽高 100%，禁止滚动穿透
- 移除移动端点击高亮：`-webkit-tap-highlight-color: transparent`
- 清除列表、链接、按钮、输入框默认样式
- 文本溢出省略工具类：`.text-ellipsis` / `.text-ellipsis-2`

### 3.4 `src/assets/main.css` — 全局布局样式

| 类名 | 用途 |
|------|------|
| `.page-container` | Flex 纵向布局全屏容器 |
| `.page-content` | 有 TabBar 页面内容区，底部留出 TabBar + 安全区高度 |
| `.page-content--full` | 无 TabBar 页面内容区（如详情页） |
| `.card` | 通用卡片样式 |
| `.safe-area-bottom` | 底部安全区适配 |
| `.hairline-border` | Retina 屏 0.5px 边框方案 |

### 3.5 `src/App.vue` — 根组件

改为移动端典型布局：**顶部 RouterView + 底部 TabBar**

```vue
<template>
  <div class="app-container">
    <RouterView />
    <TabBar />
  </div>
</template>
```

### 3.6 `src/components/TabBar.vue` — 底部导航栏（新增）

| Tab | 路由 | 图标 | 标题 |
|-----|------|------|------|
| 首页 | `/` | 🏠 | 首页 |
| 分类 | `/category` | 📂 | 分类 |
| 购物车 | `/cart` | 🛒 | 购物车 |
| 我的 | `/mine` | 👤 | 我的 |

**特性：**
- 当前路由高亮激活态（`--color-primary`）
- 底部安全区域适配
- 点击已激活 Tab 不重复跳转

### 3.7 `src/router/index.ts` — 路由配置

| 路径 | 名称 | 组件 | 加载方式 |
|------|------|------|----------|
| `/` | home | HomeView | 懒加载 |
| `/category` | category | CategoryView | 懒加载 |
| `/cart` | cart | CartView | 懒加载 |
| `/mine` | mine | MineView | 懒加载 |
| `/detail/:id` | detail | DetailView | 懒加载 |

### 3.8 页面视图（5 个）

#### `src/views/HomeView.vue` — 首页
- 搜索栏
- 轮播图（可切换）
- 功能入口宫格（热销/精品/新品/礼包）
- 热门推荐商品网格

#### `src/views/CategoryView.vue` — 分类页
- 搜索栏
- 左侧一级分类导航 + 右侧分类内容
- 分类 Banner
- 子分类宫格

#### `src/views/CartView.vue` — 购物车
- 顶部导航栏（标题 + 编辑按钮）
- 空状态展示
- 购物车列表（勾选/图片/信息/数量加减）
- 底部结算栏（全选/合计/结算按钮）

#### `src/views/MineView.vue` — 个人中心
- 用户信息卡片（头像/用户名）
- 订单状态面板（待付款/待发货/待收货/待评价）
- 功能菜单列表（订单/收藏/地址/优惠券/客服/设置）

#### `src/views/DetailView.vue` — 商品详情
- 顶部导航栏（返回/标题/分享）
- 商品大图
- 商品信息（名称/价格/原价/描述）
- 规格选择标签
- 底部操作栏（收藏/加入购物车/立即购买）

### 3.9 删除的文件

| 文件 | 原因 |
|------|------|
| `src/components/HelloWorld.vue` | 桌面端示例组件 |
| `src/components/TheWelcome.vue` | 桌面端示例组件 |
| `src/components/WelcomeItem.vue` | 桌面端示例组件 |
| `src/components/icons/IconCommunity.vue` | 桌面端图标组件 |
| `src/components/icons/IconDocumentation.vue` | 桌面端图标组件 |
| `src/components/icons/IconEcosystem.vue` | 桌面端图标组件 |
| `src/components/icons/IconSupport.vue` | 桌面端图标组件 |
| `src/components/icons/IconTooling.vue` | 桌面端图标组件 |
| `src/views/AboutView.vue` | 旧的 About 页面 |
| `src/assets/logo.svg` | 旧的 Vue logo |
| `src/components/__tests__/HelloWorld.spec.ts` | 旧的测试文件 |

---

## 四、最终项目结构

```
src/
├── main.ts                    # 入口文件
├── App.vue                    # 根组件（RouterView + TabBar）
├── assets/
│   ├── base.css               # CSS 变量 + 全局 Reset
│   └── main.css               # 全局布局样式
├── components/
│   └── TabBar.vue             # 底部导航栏组件
├── router/
│   └── index.ts               # 路由配置（5 个路由）
├── stores/
│   └── counter.ts             # Pinia Store 示例
└── views/
    ├── HomeView.vue           # 首页
    ├── CategoryView.vue       # 分类页
    ├── CartView.vue           # 购物车
    ├── MineView.vue           # 个人中心
    └── DetailView.vue         # 商品详情
```

---

## 五、关键特性总结

| 特性 | 实现方式 |
|------|----------|
| px → vw 自动转换 | `postcss-px-to-viewport-8-plugin`，设计稿 375px |
| 底部安全区域 | `env(safe-area-inset-bottom)` + CSS 变量 `--safe-area-bottom` |
| Retina 1px 边框 | `.hairline-border` + `transform: scaleY(0.5)` |
| 移动端禁止缩放 | `user-scalable=no` |
| iOS 适配 | `apple-mobile-web-app-capable`、`-webkit-tap-highlight-color` |
| 文本溢出省略 | `.text-ellipsis`（单行）/ `.text-ellipsis-2`（两行） |
| 路由懒加载 | 全部页面使用动态 import |
| 深色模式支持 | CSS 变量体系可扩展 |
