import { ref } from 'vue'

/**
 * PICC Vant4 全局皮肤开关（可独立移植，无需修改 App.vue）
 * ------------------------------------------------------------------
 * 皮肤作用域：`<html class="picc-skin">`（见 vant-picc.css）。
 * 「快速撤销」= 移除该 class，所有 Vant4 组件即时回退到默认主题，无需重新构建。
 * 状态持久化到 localStorage，应用启动时自动恢复上次选择。
 *
 * 本文件自带「开发环境悬浮开关」自动注入（mountDevToggle），
 * 因此接入新项目时无需改动 App.vue 即可看到左下角切换按钮。
 */

const STORAGE_KEY = 'picc-skin-enabled'

// 全局单例 ref，保证所有调用方共享同一状态
const active = ref(false)

function apply() {
  const el = document.documentElement
  if (active.value) el.classList.add('picc-skin')
  else el.classList.remove('picc-skin')
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, active.value ? '1' : '0')
  } catch {
    /* localStorage 不可用时静默降级 */
  }
}

export function usePiccSkin() {
  function enable() {
    active.value = true
    apply()
    persist()
  }

  function disable() {
    active.value = false
    apply()
    persist()
  }

  function toggle() {
    active.value = !active.value
    apply()
    persist()
  }

  /** 应用启动时调用：根据持久化状态恢复皮肤（默认开启），并挂载开发环境悬浮开关 */
  function init(defaultEnabled = true) {
    let stored: string | null = null
    try {
      stored = localStorage.getItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
    active.value = stored === null ? defaultEnabled : stored === '1'
    apply()
    mountDevToggle()
  }

  return { active, enable, disable, toggle, init }
}

/**
 * 便捷命名导出：应用启动时调用一次以应用皮肤并挂载开发环境悬浮开关。
 * 对应 `main.ts` 中的 `import { initSkin } from './composables/usePiccSkin'`。
 */
export function initSkin(defaultEnabled = true) {
  usePiccSkin().init(defaultEnabled)
}

// 开发环境自动注入悬浮开关（无需修改 App.vue）
let toggleMounted = false
function mountDevToggle() {
  if (toggleMounted) return
  toggleMounted = true
  if (typeof document === 'undefined') return
  // 避免与项目中已有的开关重复（兼容本项目自带的 .skin-toggle）
  if (document.querySelector('.picc-skin-toggle, .skin-toggle')) return

  // 非 Vite 环境（无 import.meta.env）按开发态处理，便于本地预览
  const isDev =
    typeof import.meta !== 'undefined' &&
    (import.meta as { env?: { DEV?: boolean } }).env?.DEV !== false
  if (!isDev) return

  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'picc-skin-toggle'

  const paint = () => {
    const on = document.documentElement.classList.contains('picc-skin')
    btn.textContent = `PICC 皮肤 · ${on ? '开' : '关'}`
    btn.style.color = on ? '#d71920' : '#8a8a8a'
    btn.style.background = on ? '#fcebec' : '#ffffff'
    btn.style.borderColor = on ? '#fcebec' : '#eaeaea'
  }
  btn.addEventListener('click', () => {
    usePiccSkin().toggle()
    paint()
  })
  Object.assign(btn.style, {
    position: 'fixed',
    left: '16px',
    bottom: '80px',
    zIndex: '300',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '9999px',
    border: '1px solid #eaeaea',
    font: '500 12px/1 system-ui, sans-serif',
    cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
    transition: 'all .2s',
  } as Partial<CSSStyleDeclaration>)

  document.body.appendChild(btn)
  paint()
}

// 暴露到 window，便于在浏览器控制台即时调试：`__piccSkin.toggle()`
declare global {
  interface Window {
    __piccSkin?: {
      active: boolean
      enable: () => void
      disable: () => void
      toggle: () => void
    }
  }
}

if (typeof window !== 'undefined') {
  window.__piccSkin = {
    get active() {
      return active.value
    },
    enable: () => usePiccSkin().enable(),
    disable: () => usePiccSkin().disable(),
    toggle: () => usePiccSkin().toggle(),
  }
}
