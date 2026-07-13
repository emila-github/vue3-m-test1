# vant4-mobile-init · Vant4 移动端工程化脚手架技能

一键把「API 分层 + 本地 Mock + 角色权限 + 自由路由 + Vite 优化」的完整工程化能力，以及本项目 `src/views/vant` 下 11 个 Vant 示例页（VantIndex + 10 个 VantXXXXXDemo），落地到任意 Vue3 移动端项目（新建或改造）。

版本：v1.1.0

## 能力清单
- **API 分层**：`src/api`（axios 拦截 + 模块化 `modules/*` + `PageResult` 分页类型）
- **本地 Mock**：`src/mock`（vite 插件拦截 `/api/*`、静态服务 `/demo-upload/*`、写盘上传、约定路由合并）
- **角色权限**：`usePermission` 单例 + 全局 `v-permission` 指令
- **自由路由**：vue-router 5 原生约定式（`src/views/test`，`vue-router/vite`）+ 手写路由（`src/router/index.ts`）并存
- **Vite 优化**：代理自解析（按 `VITE_API_BASE_URL`）、Mock 插件、组件按需、包分析、devtools
- **示例全家桶**：`src/views/vant` 11 个 Vant 示例页（VantIndex + 10 个 `VantXXXXXDemo.vue`）+ 对应 `components` / `composables`
- **单元测试**：`vitest.config.ts` + `src/test/setup.ts` 全局 mock vant + 组件 / composables / directives 全覆盖（13 个 spec、101 用例），`pnpm test:unit` 开箱即跑

## 快速开始
把整个技能目录复制到目标 Vue3 项目（或放进 `.codebuddy/skills/`），在目标项目根目录执行：

```bash
# 全新项目（覆盖配置）
node <技能目录>/assets/setup.mjs --force
# 改造现有项目（保护已有配置）
node <技能目录>/assets/setup.mjs
```

完成后：
```bash
pnpm install
pnpm dev:mock      # 本地 Mock 模式，无需后端即可跑通全部示例
```

## 自动联动 PICC 皮肤
若目标项目同时存在 **`vant-picc-skin`** 技能（项目内或同级技能目录），初始化脚本会**自动运行它的 `setup.mjs`**，完成 PICC Vant 皮肤接入。可用 `--skip-skin` 关闭。

## 技能包结构
```
.codebuddy/skills/vant4-mobile-init/
  SKILL.md            # 技能主说明：能力总览 / 初始化 / 工作流 / Do-Don't
  README.md           # 本文件
  references/
    architecture.md   # 各子系统实现细节 + 关键代码
  assets/
    setup.mjs         # 初始化脚本（幂等，支持 --force / --skip-skin / 指定目录）
    src/              # 真实源码：api / mock / composables / components / views/vant / assets / styles
    config/           # 根配置：package.json / vite.config.ts / tsconfig* / .env* / env.d.ts / components.d.ts / index.html / eslint.config.ts
    entry/            # 入口模板：main.ts / App.vue / router/index.ts（已存在时跳过，除非 --force）
```

## 适用任务
- 从零搭建 Vant4 移动端 Vue3 项目
- 给现有 Vue3 项目接入 Vant4 移动端工程化（api / mock / 权限 / 自由路由 / vite 优化）
- 复用本项目 Vant 示例页与通用组件（VantList / VantUpload 等）
