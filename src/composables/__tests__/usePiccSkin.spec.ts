import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { usePiccSkin } from '../usePiccSkin'

function resetSkin() {
  const { disable } = usePiccSkin()
  disable()
  localStorage.clear()
  document.documentElement.classList.remove('picc-skin')
}

beforeEach(() => {
  resetSkin()
})

afterEach(() => {
  resetSkin()
})

describe('状态切换与持久化', () => {
  it('enable()：active=true、html 加 picc-skin、localStorage=1', () => {
    const { active, enable } = usePiccSkin()
    enable()
    expect(active.value).toBe(true)
    expect(document.documentElement.classList.contains('picc-skin')).toBe(true)
    expect(localStorage.getItem('picc-skin-enabled')).toBe('1')
  })

  it('disable()：active=false、移除 picc-skin、localStorage=0', () => {
    const { active, enable, disable } = usePiccSkin()
    enable()
    disable()
    expect(active.value).toBe(false)
    expect(document.documentElement.classList.contains('picc-skin')).toBe(false)
    expect(localStorage.getItem('picc-skin-enabled')).toBe('0')
  })

  it('toggle()：在开 / 关之间切换', () => {
    const { active, toggle } = usePiccSkin()
    expect(active.value).toBe(false)
    toggle()
    expect(active.value).toBe(true)
    toggle()
    expect(active.value).toBe(false)
  })
})

describe('init 启动时恢复', () => {
  it('无存储时按默认（defaultEnabled=true → 开）', () => {
    const { active, init } = usePiccSkin()
    init(true)
    expect(active.value).toBe(true)
    expect(document.documentElement.classList.contains('picc-skin')).toBe(true)
  })

  it('无存储时 defaultEnabled=false → 关', () => {
    const { active, init } = usePiccSkin()
    init(false)
    expect(active.value).toBe(false)
    expect(document.documentElement.classList.contains('picc-skin')).toBe(false)
  })

  it('有存储时优先读取：1 → 开', () => {
    localStorage.setItem('picc-skin-enabled', '1')
    const { active, init } = usePiccSkin()
    init(false) // 即便默认关，也应被存储覆盖
    expect(active.value).toBe(true)
  })

  it('有存储时优先读取：0 → 关', () => {
    localStorage.setItem('picc-skin-enabled', '0')
    const { active, init } = usePiccSkin()
    init(true) // 即便默认开，也应被存储覆盖
    expect(active.value).toBe(false)
  })
})

describe('window.__piccSkin 调试入口', () => {
  it('暴露 enable / disable / toggle 且 active 反映真实状态', () => {
    expect(window.__piccSkin).toBeDefined()
    expect(typeof window.__piccSkin!.enable).toBe('function')
    expect(typeof window.__piccSkin!.disable).toBe('function')
    expect(typeof window.__piccSkin!.toggle).toBe('function')
    expect(window.__piccSkin!.active).toBe(false)
    window.__piccSkin!.enable()
    expect(window.__piccSkin!.active).toBe(true)
  })
})
