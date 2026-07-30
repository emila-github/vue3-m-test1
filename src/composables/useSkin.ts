import { ref, computed } from 'vue'

/**
 * 多皮肤注册表（替代原二值 usePiccSkin）
 * ------------------------------------------------------------------
 * 每套皮肤是一组 CSS 变量集合，通过 <html> 上的 class 生效：
 *   - PICC 品牌皮肤 → <html class="picc-skin">（沿用 vant-picc.css 的详细组件主题）
 *   - 其它皮肤     → <html class="theme-<id>">（仅覆写主色 / 表面 / 渐变等 token，
 *                    组件形态回落 Vant 默认，由 skins.css 提供配套色）
 * 同一时刻仅一个皮肤 class 生效；切换时清理其它皮肤 class，保证无残留、无冲突。
 * 选择持久化到 localStorage（app-skin），启动时自动恢复。
 */

export interface SkinMeta {
  id: string
  name: string
  desc: string
  /** 主色，用于选择面板的色卡与当前指示点 */
  color: string
  /** 深端色，用于色卡渐变预览 */
  deep: string
  /** 是否为深色主题（影响画布 / 表面等配套） */
  dark?: boolean
}

/** 全套皮肤。顺序即选择面板展示顺序。 */
export const SKINS: SkinMeta[] = [
  { id: 'picc', name: 'PICC 品牌红', desc: '人保财险官方品牌', color: '#d71920', deep: '#a91218' },
  { id: 'vant', name: 'Vant 默认蓝', desc: '清爽蓝调', color: '#1989fa', deep: '#1565c0' },
  { id: 'emerald', name: '翡翠绿', desc: '清新自然', color: '#059669', deep: '#047857' },
  { id: 'amber', name: '琥珀橙', desc: '温暖活力', color: '#f59e0b', deep: '#d97706' },
  { id: 'teal', name: '青碧', desc: '宁静治愈', color: '#0d9488', deep: '#0f766e' },
  { id: 'rose', name: '玫瑰粉', desc: '柔和浪漫', color: '#e11d48', deep: '#be123c' },
  { id: 'indigo', name: '靛蓝', desc: '科技靛蓝', color: '#6366F1', deep: '#4f46e5' },
  { id: 'sky', name: '天蓝', desc: '清亮天蓝', color: '#0EA5E9', deep: '#0284c7' },
  { id: 'cyan', name: '湖青', desc: '医疗湖青', color: '#0891B2', deep: '#0e7490' },
  { id: 'insurance', name: '保险蓝', desc: '守护保险蓝', color: '#0369A1', deep: '#075985' },
  { id: 'lavender', name: '薰衣草', desc: '柔紫疗愈', color: '#8B5CF6', deep: '#7c3aed' },
  { id: 'pink', name: '樱粉', desc: '活泼樱粉', color: '#EC4899', deep: '#db2777' },
  { id: 'forest', name: '森林绿', desc: '稳重森林绿', color: '#15803D', deep: '#166534' },
  { id: 'coffee', name: '暖咖', desc: '温馨暖咖', color: '#78350F', deep: '#92400e' },
  { id: 'graphite', name: '石墨灰', desc: '工业极简', color: '#64748B', deep: '#475569' },
  { id: 'dark', name: '暗夜', desc: '护眼深色', color: '#60a5fa', deep: '#0f172a', dark: true },
  { id: 'luxury', name: '奢华黑金', desc: '高端黑金', color: '#eab308', deep: '#0a0a0a', dark: true },
  { id: 'navy', name: '商务深蓝', desc: '深海军蓝', color: '#93c5fd', deep: '#0a1628', dark: true },
]

const STORAGE_KEY = 'app-skin'
const LEGACY_KEY = 'picc-skin-enabled' // 与旧二值皮肤兼容
const THEME_PREFIX = 'theme-'

// 全局单例 ref，保证所有调用方共享同一状态
const active = ref<string>('picc')

function skinClasses(): string[] {
  return Array.from(document.documentElement.classList)
}

function applyClasses(id: string) {
  const cl = document.documentElement.classList
  // 先清除所有旧皮肤 class，避免多套叠加导致样式冲突
  skinClasses()
    .filter((c) => c.startsWith(THEME_PREFIX) || c === 'picc-skin')
    .forEach((c) => cl.remove(c))
  if (id === 'picc') cl.add('picc-skin')
  else cl.add(THEME_PREFIX + id)
}

function persist(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id)
    // 同步旧 key，便于仍依赖 picc-skin-enabled 的代码 / 测试感知状态
    localStorage.setItem(LEGACY_KEY, id === 'picc' ? '1' : '0')
  } catch {
    /* localStorage 不可用时静默降级 */
  }
}

export function useSkin() {
  /** 切换皮肤（非法 id 回落 PICC） */
  function setSkin(id: string) {
    if (!SKINS.some((s) => s.id === id)) id = 'picc'
    active.value = id
    applyClasses(id)
    persist(id)
  }

  /** 应用启动恢复：优先读取持久化选择，否则用默认皮肤 */
  function init(defaultSkin: string = 'picc') {
    let stored: string | null = null
    try {
      stored = localStorage.getItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
    const id = stored && SKINS.some((s) => s.id === stored) ? stored : defaultSkin
    active.value = id
    applyClasses(id)
  }

  const current = computed<SkinMeta>(
    () => SKINS.find((s) => s.id === active.value) || (SKINS[0] as SkinMeta),
  )

  return { active, setSkin, init, current, SKINS }
}

export function initSkin(defaultSkin: string = 'picc') {
  useSkin().init(defaultSkin)
}

// 暴露到 window，便于浏览器控制台即时调试：__skin.set('emerald') / __skin.active
declare global {
  interface Window {
    __skin?: {
      active: string
      set: (id: string) => void
      list: () => SkinMeta[]
    }
  }
}

if (typeof window !== 'undefined') {
  window.__skin = {
    get active() {
      return active.value
    },
    set: (id: string) => useSkin().setSkin(id),
    list: () => SKINS,
  }
}
