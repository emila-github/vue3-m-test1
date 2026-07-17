#!/usr/bin/env node
/**
 * PICC Vant4 皮肤初始化脚本
 * ============================================================================
 * 用法（在目标 Vant4 项目根目录执行）：
 *   node <skill目录>/assets/setup.mjs
 *
 * 作用：
 *   1. 复制 vant-picc.css        -> <project>/src/styles/vant-picc.css
 *   2. 复制 usePiccSkin.ts       -> <project>/src/composables/usePiccSkin.ts
 *   3. 在 <project>/src/main.ts  注入「皮肤 CSS 引入」与「initSkin(true)」调用
 *
 * 幂等：重复执行不会重复插入；若没有 main.ts 会给出手动接入提示。
 * ============================================================================
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const skillAssets = dirname(fileURLToPath(import.meta.url))
const projectRoot = process.cwd()

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true })
}
function log(msg) {
  console.log(`[picc-skin] ${msg}`)
}

// 1) 皮肤 CSS
ensureDir(resolve(projectRoot, 'src/styles'))
copyFileSync(
  join(skillAssets, 'vant-picc.css'),
  resolve(projectRoot, 'src/styles/vant-picc.css'),
)
log('已写入 src/styles/vant-picc.css')

// 2) 皮肤开关 composable
ensureDir(resolve(projectRoot, 'src/composables'))
copyFileSync(
  join(skillAssets, 'usePiccSkin.ts'),
  resolve(projectRoot, 'src/composables/usePiccSkin.ts'),
)
log('已写入 src/composables/usePiccSkin.ts')

// 3) 注入 main.ts
const mainPath = resolve(projectRoot, 'src/main.ts')
if (!existsSync(mainPath)) {
  log('未找到 src/main.ts，请手动在入口文件加入以下两行：')
  log("  import './styles/vant-picc.css'")
  log("  import { initSkin } from './composables/usePiccSkin'; initSkin(true)")
} else {
  let main = readFileSync(mainPath, 'utf8')
  let changed = false

  // 3a) 皮肤 CSS 引入
  if (!main.includes('styles/vant-picc.css')) {
    const anchor = main.match(/import\s+['"]vant\/lib\/index\.css['"]/)
    const line = "import './styles/vant-picc.css'\n"
    if (anchor) {
      const idx = anchor.index + anchor[0].length
      main = main.slice(0, idx) + '\n' + line + main.slice(idx)
    } else {
      const first = main.match(/^import .*$/m)
      if (first) {
        const idx = first.index + first[0].length
        main = main.slice(0, idx) + '\n' + line + main.slice(idx)
      } else {
        main = line + main
      }
    }
    changed = true
  }

  // 3b) initSkin 引入
  if (!main.includes('usePiccSkin')) {
    const first = main.match(/^import .*$/m)
    const imp = "import { initSkin } from './composables/usePiccSkin'\n"
    if (first) {
      const idx = first.index + first[0].length
      main = main.slice(0, idx) + '\n' + imp + main.slice(idx)
    } else {
      main = imp + main
    }
    changed = true
  }

  // 3c) 启动初始化（在 app.mount 之前）
  if (!main.includes('initSkin(')) {
    const mount = main.match(/app\.mount\(/)
    const call = 'initSkin(true)\n'
    if (mount) {
      const idx = mount.index
      main = main.slice(0, idx) + call + main.slice(idx)
    } else {
      main = main + '\ninitSkin(true)\n'
    }
    changed = true
  }

  if (changed) {
    writeFileSync(mainPath, main, 'utf8')
    log('已更新 src/main.ts（注入皮肤引入与 initSkin）')
  } else {
    log('src/main.ts 已包含皮肤配置，无需修改')
  }
}

log('PICC Vant4 皮肤初始化完成 ✅')
log('开发环境左下角会出现「PICC 皮肤」悬浮开关；也可用 window.__piccSkin.toggle() 切换。')
