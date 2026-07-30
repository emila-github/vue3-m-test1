// 页面操作记录插件 - 回放器
//
// 基于后端返回的会话事件序列，在当前 DOM 上「重演」用户操作，用于问题回访 / 演示。
// 采用 best-effort 策略：找不到元素或事件类型不支持时跳过，不抛错。
import type { TrackEvent } from './types'

export interface ReplayOptions {
  /** 回放速度倍率，默认 1（实时） */
  speed?: number
  /** 检索根节点，默认 document */
  root?: ParentNode
  /** 每步执行前的回调（可用于高亮 / 进度展示） */
  onStep?: (ev: TrackEvent, index: number, total: number) => void
  /** 回放结束回调 */
  onDone?: () => void
  /** 单步最小间隔（ms），避免事件过密看不清，默认 250 */
  minStep?: number
}

export interface ReplayHandle {
  play: () => void
  pause: () => void
  stop: () => void
  readonly playing: boolean
  readonly index: number
  readonly total: number
}

function locate(root: ParentNode, selector?: string): Element | null {
  if (!selector) return null
  try {
    return root.querySelector(selector)
  } catch {
    return null
  }
}

/** 把点击目标解析到最近的可交互控件，确保原生/组件 @click 能被触发 */
function resolveClickable(el: Element): Element {
  if (
    el instanceof HTMLButtonElement ||
    el instanceof HTMLInputElement ||
    el instanceof HTMLAnchorElement ||
    el instanceof HTMLSelectElement ||
    el instanceof HTMLTextAreaElement
  ) {
    return el
  }
  return (
    el.closest('button, a, input, select, textarea, [role="button"], .van-button') ?? el
  )
}

// ===== 回放视觉高亮（让用户看清当前在操作的元件） =====
let styleInjected = false
function ensureStyle(): void {
  if (styleInjected || typeof document === 'undefined') return
  const style = document.createElement('style')
  style.textContent =
    '.track-replay-active{outline:2px solid #07c160!important;outline-offset:2px;' +
    'box-shadow:0 0 0 3px rgba(7,193,96,.25)!important;border-radius:4px;transition:none;}'
  document.head.appendChild(style)
  styleInjected = true
}
let lastHighlight: Element | null = null
function highlight(el: Element | null): void {
  ensureStyle()
  if (lastHighlight) lastHighlight.classList.remove('track-replay-active')
  if (el) {
    el.classList.add('track-replay-active')
    lastHighlight = el
  }
}
function clearHighlight(): void {
  if (lastHighlight) lastHighlight.classList.remove('track-replay-active')
  lastHighlight = null
}

function dispatchInput(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: string): void {
  el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

// ===== 回放滚屏：用 rAF 在相邻事件间插值，模拟真实连续滚动 =====
let scrollRAF = 0
function cancelScrollAnim(): void {
  if (scrollRAF) {
    cancelAnimationFrame(scrollRAF)
    scrollRAF = 0
  }
}
function animateScrollTo(scroller: HTMLElement | null, x: number, y: number, duration: number): void {
  cancelScrollAnim()
  const startX = scroller ? scroller.scrollLeft : window.scrollX
  const startY = scroller ? scroller.scrollTop : window.scrollY
  const endX = x
  const endY = y
  const startTime = performance.now()
  const dur = Math.max(duration, 0)
  const scroll = (cx: number, cy: number) => {
    if (scroller) scroller.scrollTo(cx, cy)
    else window.scrollTo(cx, cy)
  }
  const frame = (now: number) => {
    const t = dur === 0 ? 1 : Math.min((now - startTime) / dur, 1)
    // ease-out 缓动，更接近人手滚动的减速手感
    const eased = 1 - Math.pow(1 - t, 2)
    scroll(startX + (endX - startX) * eased, startY + (endY - startY) * eased)
    if (t < 1) {
      scrollRAF = requestAnimationFrame(frame)
    } else {
      scrollRAF = 0
    }
  }
  scrollRAF = requestAnimationFrame(frame)
}

export function replayTrackEvents(events: TrackEvent[], options: ReplayOptions = {}): ReplayHandle {
  const speed = options.speed ?? 1
  const minStep = options.minStep ?? 250
  const root = options.root ?? document
  const total = events.length

  let index = 0
  let playing = false
  let timer: ReturnType<typeof setTimeout> | null = null

  const clear = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    cancelScrollAnim()
    clearHighlight()
  }

  const step = () => {
    if (!playing || index >= total) {
      playing = false
      options.onDone?.()
      return
    }
    const ev = events[index]
    if (!ev) {
      playing = false
      options.onDone?.()
      return
    }
    options.onStep?.(ev, index, total)

    const el = locate(root, ev.selector ?? undefined)
    highlight(el)

    // 该事件到下一事件的间隔，作为滚屏插值动画时长，使滚动显得连续自然
    const nextEv = events[index + 1]
    const gap = nextEv ? Math.max((nextEv.t - ev.t) / speed, minStep) : minStep

    if (ev.type === 'scroll') {
      // 滚屏还原：用 rAF 在 gap 时间内从当前位置平滑插值到记录位置，
      // 模拟真实「连续滚动」手势，而非瞬移或分段跳变。
      // 注意：scroll 事件没有 selector（window 滚动），不能放在下面的 if(el) 内。
      const x = ev.scrollX ?? 0
      const y = ev.scrollY ?? 0
      let scroller: HTMLElement | null = null
      if (ev.selector) {
        const found = document.querySelector(ev.selector)
        if (found instanceof HTMLElement) scroller = found
      }
      animateScrollTo(scroller, x, y, gap)
    } else if (el) {
      switch (ev.type) {
        case 'click': {
          const target = resolveClickable(el)
          ;(target as HTMLElement).click()
          break
        }
        case 'input':
        case 'change':
          if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
            const inputType = el instanceof HTMLInputElement ? (el.getAttribute('type') || el.type) : ''
            if (inputType === 'checkbox' || inputType === 'radio') {
              // 勾选框：回填勾选态并派发 change，驱动组件 v-model
              if (typeof ev.checked === 'boolean') (el as HTMLInputElement).checked = ev.checked
              el.dispatchEvent(new Event('change', { bubbles: true }))
              el.dispatchEvent(new Event('input', { bubbles: true }))
            } else {
              dispatchInput(el, ev.value ?? '')
            }
          }
          break
        case 'submit':
          if (el instanceof HTMLFormElement) el.requestSubmit?.()
          else (el as HTMLElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
          break
        // page_view 等元数据动作在回放中不重演 DOM 行为
      }
    }

    index++
    if (index >= total) {
      playing = false
      options.onDone?.()
      return
    }
    timer = setTimeout(step, gap)
  }

  return {
    get playing() {
      return playing
    },
    get index() {
      return index
    },
    get total() {
      return total
    },
    play() {
      if (playing || index >= total) return
      playing = true
      step()
    },
    pause() {
      playing = false
      clear()
    },
    stop() {
      playing = false
      clear()
      index = 0
    },
  }
}
