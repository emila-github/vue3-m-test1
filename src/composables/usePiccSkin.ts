import { computed } from 'vue'
import { useSkin, SKINS } from './useSkin'

/**
 * 兼容适配器：原二值皮肤 API（PICC 开/关）现已统一到多皮肤注册表 useSkin。
 * 本文件保留旧接口（enable/disable/toggle/active/init），使既有调用与单元测试无需改动：
 *   - 选 PICC = useSkin 的 'picc' 皮肤（html.picc-skin）
 *   - 选「关」 = useSkin 的 'vant' 皮肤（html.theme-vant）
 * 悬浮开发开关已移除（切换入口统一在「我的」页皮肤选择面板）。
 */

const LEGACY_KEY = 'picc-skin-enabled'

export function usePiccSkin() {
  const skin = useSkin()
  const active = computed(() => skin.active.value === 'picc')

  return {
    active,
    enable: () => skin.setSkin('picc'),
    disable: () => skin.setSkin('vant'),
    toggle: () =>
      skin.setSkin(skin.active.value === 'picc' ? 'vant' : 'picc'),
    /** 启动时恢复：优先读旧 key（picc-skin-enabled），保证既有用户选择不被覆盖 */
    init: (defaultEnabled = true) => {
      let stored: string | null = null
      try {
        stored = localStorage.getItem(LEGACY_KEY)
      } catch {
        /* ignore */
      }
      const id =
        stored === '1'
          ? 'picc'
          : stored === '0'
            ? 'vant'
            : defaultEnabled
              ? 'picc'
              : 'vant'
      skin.setSkin(id)
    },
  }
}

export function initSkin(defaultSkin: string | boolean = 'picc') {
  if (typeof defaultSkin === 'boolean') {
    useSkin().init(defaultSkin ? 'picc' : 'vant')
  } else {
    useSkin().init(defaultSkin)
  }
}

export { SKINS }

// 暴露到 window，便于浏览器控制台即时调试：__piccSkin.enable() / .active
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
      return useSkin().active.value === 'picc'
    },
    enable: () => usePiccSkin().enable(),
    disable: () => usePiccSkin().disable(),
    toggle: () => usePiccSkin().toggle(),
  }
}
