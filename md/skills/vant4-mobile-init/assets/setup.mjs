#!/usr/bin/env node
/**
 * Vant4 移动端脚手架初始化脚本
 * ============================================================================
 * 用法（在项目根目录执行）：
 *   node <skill目录>/assets/setup.mjs [目标目录] [--force] [--skip-skin]
 *
 * 行为：
 *   1. 复制 src 脚手架（api / mock / composables / components / views/vant /
 *      assets / styles）到 <project>/src（合并，脚手架文件始终覆盖）。
 *   2. 复制根配置（package.json / vite.config.ts / tsconfig* / env* /
 *      env.d.ts / components.d.ts / index.html / eslint.config.ts 等）：
 *      不存在才写入；已存在且非 --force 时跳过并提示手动合并。
 *   3. 入口文件（src/main.ts / src/App.vue / src/router/index.ts）：
 *      已存在且非 --force 时跳过（避免覆盖你的入口）；否则写入。
 *   4. 若检测到 vant-picc-skin 技能存在（项目内或同级技能目录），
 *      自动运行它的 setup.mjs 完成 PICC Vant 皮肤初始化（除非 --skip-skin）。
 *
 * 幂等：可重复运行。建议首次用默认（保护已有配置），全新项目可加 --force。
 * ============================================================================
 */
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  copyFileSync,
  statSync,
} from 'node:fs'
import { dirname, resolve, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const skillRoot = dirname(dirname(fileURLToPath(import.meta.url))) // .../vant4-mobile-init（setup.mjs 位于 assets/ 下）
const assets = join(skillRoot, 'assets')

const args = process.argv.slice(2)
const force = args.includes('--force')
const skipSkin = args.includes('--skip-skin')
const argRoot = args.find((a) => !a.startsWith('--'))
const projectRoot = resolve(argRoot || process.cwd())

function log(msg) {
  console.log(`[vant-init] ${msg}`)
}
function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true })
}
/** 递归拷贝目录；skipExisting=true 时目标已存在则跳过 */
function copyTree(srcDir, destDir, { skipExisting = false, overwrite = true } = {}) {
  if (!existsSync(srcDir)) return
  ensureDir(destDir)
  for (const name of readdirSync(srcDir)) {
    const s = join(srcDir, name)
    const d = join(destDir, name)
    const st = statSync(s)
    if (st.isDirectory()) {
      copyTree(s, d, { skipExisting, overwrite })
    } else {
      if (existsSync(d) && skipExisting) {
        log(`跳过已存在：${relative(projectRoot, d)}`)
        continue
      }
      if (existsSync(d) && !overwrite) continue
      copyFileSync(s, d)
    }
  }
}

log(`目标项目：${projectRoot}`)
ensureDir(projectRoot)

// ---- 1) src 脚手架（始终覆盖脚手架自带文件） ----
copyTree(join(assets, 'src'), join(projectRoot, 'src'), { overwrite: true })
log('已写入 src 脚手架（api / mock / composables / components / views/vant / assets / styles）')

// ---- 2) 根配置（不存在才写） ----
const configSrc = join(assets, 'config')
let pkgWritten = false
for (const name of readdirSync(configSrc)) {
  const s = join(configSrc, name)
  const d = join(projectRoot, name)
  if (!statSync(s).isFile()) continue
  if (existsSync(d) && !force) {
    log(`跳过已存在配置：${name}（如需覆盖加 --force）`)
    continue
  }
  copyFileSync(s, d)
  if (name === 'package.json') pkgWritten = true
  log(`已写入配置：${name}`)
}

// ---- 2.5) 移除已废弃的 unplugin-vue-router ----
// vue-router 5 已内置自由路由（vue-router/vite + vue-router/auto-routes），
// 若原项目装过已废弃的 unplugin-vue-router，留着会与 vue-router 5 冲突报错，故自动移除。
{
  const targetPkg = join(projectRoot, 'package.json')
  if (existsSync(targetPkg)) {
    try {
      const pkg = JSON.parse(readFileSync(targetPkg, 'utf8'))
      let changed = false
      for (const key of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
        if (pkg[key] && typeof pkg[key] === 'object' && 'unplugin-vue-router' in pkg[key]) {
          delete pkg[key]['unplugin-vue-router']
          changed = true
        }
      }
      if (changed) {
        writeFileSync(targetPkg, JSON.stringify(pkg, null, 2) + '\n')
        log('已移除已废弃依赖 unplugin-vue-router（vue-router 5 已内置自由路由）')
      }
    } catch (e) {
      log(`警告：读取 package.json 失败，未自动移除 unplugin-vue-router：${e?.message || e}`)
    }
  }
}

// ---- 3) 入口文件（main.ts / App.vue / router/index.ts） ----
const entryMap = [
  [join(assets, 'entry', 'main.ts'), join(projectRoot, 'src', 'main.ts')],
  [join(assets, 'entry', 'App.vue'), join(projectRoot, 'src', 'App.vue')],
  [join(assets, 'entry', 'router', 'index.ts'), join(projectRoot, 'src', 'router', 'index.ts')],
]
for (const [s, d] of entryMap) {
  ensureDir(dirname(d))
  if (existsSync(d) && !force) {
    log(`跳过已存在入口：${relative(projectRoot, d)}（如需覆盖加 --force）`)
    continue
  }
  copyFileSync(s, d)
  log(`已写入入口：${relative(projectRoot, d)}`)
}

// ---- 3.5) 确保已存在的 main.ts 也注册权限指令（改造模式关键补丁） ----
// 改造模式下 src/main.ts 已存在会被跳过（保护你的入口），但脚手架的权限指令
// src/directives/permission.ts 仍会被覆盖拷入。此时若 main.ts 未注册指令，
// v-permission 会报 "Failed to resolve directive: permission"。故这里幂等注入。
{
  const mainPath = join(projectRoot, 'src', 'main.ts')
  if (existsSync(mainPath)) {
    try {
      let code = readFileSync(mainPath, 'utf8')
      const hasImport = /from ['"]\.\/directives\/permission['"]/.test(code)
      const hasRegAll = /app\.directive\(\s*['"]permission-all['"]/.test(code)
      if (hasImport && hasRegAll) {
        log('main.ts 已注册权限指令家族，跳过注入')
      } else {
        let changed = false
        // 1) 注入 import（放在 './router' import 之后，找不到则放在首个 import 前）
        if (!hasImport) {
          const importStmt =
            "import {\n" +
            "  permissionDirective,\n" +
            "  permissionAllDirective,\n" +
            "  permissionNoneDirective,\n" +
            "} from './directives/permission'\n"
          const routerImport = /import\s+router\s+from\s+['"]\.\/router['"]\s*\n/
          if (routerImport.test(code)) {
            code = code.replace(routerImport, (m) => m + importStmt)
          } else {
            code = importStmt + code
          }
          changed = true
        }
        // 2) 注入注册（放在 createApp 之后）；若已有旧的单个 permission 注册则一并补全
        if (!hasRegAll) {
          const regStmt =
            "// 全局权限指令家族（配合 usePermission 单例）\n" +
            "app.directive('permission', permissionDirective) // 拥有任意一个即可见 (hasAny)\n" +
            "app.directive('permission-all', permissionAllDirective) // 必须拥有全部才可见 (hasAll)\n" +
            "app.directive('permission-none', permissionNoneDirective) // 拥有任意一个就隐藏 (hasNone)\n"
          const createApp = /const\s+app\s*=\s*createApp\([^\n]*\)\s*\n/
          if (createApp.test(code)) {
            code = code.replace(createApp, (m) => m + '\n' + regStmt)
          } else {
            // 兜底：追加到文件末尾前（mount 之前较难定位时直接补一行提示）
            code += '\n' + regStmt
          }
          changed = true
        }
        if (changed) {
          writeFileSync(mainPath, code)
          log('已向 main.ts 注入权限指令注册（v-permission / -all / -none）')
        }
      }
    } catch (e) {
      log(`警告：处理 main.ts 权限指令注入失败，请手动检查：${e?.message || e}`)
    }
  }
}

// ---- 4) 自动应用 PICC Vant 皮肤（若 vant-picc-skin 技能存在） ----
if (!skipSkin) {
  const skinCandidates = [
    join(projectRoot, '.codebuddy', 'skills', 'vant-picc-skin', 'assets', 'setup.mjs'),
    join(skillRoot, '..', 'vant-picc-skin', 'assets', 'setup.mjs'),
  ]
  const skinSetup = skinCandidates.find((p) => existsSync(p))
  if (skinSetup) {
    log('检测到 vant-picc-skin 技能，正在自动初始化 PICC 皮肤...')
    const r = spawnSync('node', [skinSetup], { cwd: projectRoot, stdio: 'inherit' })
    if (r.status !== 0) log('PICC 皮肤初始化返回非零退出码，请检查上方输出。')
  } else {
    log('未检测到 vant-picc-skin 技能，跳过皮肤初始化（可用该技能单独接入）。')
  }
}

// ---- 收尾提示 ----
log('初始化完成 ✅')
if (pkgWritten) {
  log('新项目已生成 package.json，请先安装依赖：')
  log('  pnpm install   # 或 npm install / yarn')
}
log('本地 Mock 模式启动（无需后端）：')
log('  pnpm dev:mock   # 对应 vite --mode mock，启用 src/mock 插件')
log('连接真实后端：')
log('  pnpm dev        # 使用 .env.development 的 VITE_API_BASE_URL 走 Vite 代理')
log('路由说明：约定式路由扫描 src/views/test（见 vite.config.ts routesFolder），手写路由见 src/router/index.ts')
log('权限说明：全局指令 v-permission / v-permission-all / v-permission-none 已注册（src/directives/permission.ts）；')
log('          角色/权限由 src/composables/usePermission.ts + src/mock/permission.ts 提供')
