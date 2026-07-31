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
  /** 页面切换（page_view）回调，传入记录时的路由 fullPath，用于回放时真实跳转 */
  navigate?: (fullPath: string) => void | Promise<void>
  /**
   * 操作提示回调：用于「无法在回放中真实模拟」的操作（如滑块验证、特殊拖拽），
   * 或定位失败的关键交互——回放器会提示「已执行该操作」，避免静默跳过造成遗漏。
   */
  onHint?: (ev: TrackEvent, message: string) => void
  /**
   * 目标就绪等待时长（ms）：交互类事件（点击下拉项 / 提交 / 拖拽选择等）若当下找不到目标，
   * 回放器会先「确认就绪」——轮询等待其真实出现（下拉浮层选项尚未渲染、异步挂载等场景），
   * 出现后再执行；超过此时长仍找不到才兜底提示。默认 3000。
   */
  targetWaitMs?: number
}

export interface ReplayHandle {
  play: (fromIndex?: number) => void
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
  return el.closest('button, a, input, select, textarea, [role="button"], .van-button') ?? el
}

/**
 * 解析某事件的目标元素：先按选择器定位，失败时对 click 事件做「文本兜底」
 * （下拉选项 / 确认按钮等场景，选择器被 Vant 剥离 van- 类后变脆，优先用文本精确命中）。
 * 抽出为独立函数，便于「等待目标就绪后重试」时复用同一套解析逻辑。
 */
function resolveEventTarget(root: ParentNode, ev: TrackEvent): Element | null {
  const el0 = locate(root, ev.selector ?? undefined)
  let el: Element | null = el0
  if (ev.type === 'click' && ev.text) {
    // 下拉选项 / 确认按钮等场景，录制时带有唯一文本。选择器（van- 类被剥离）退化成
    // 通用 div/li/ul 链，常命中「选项列表容器」(ul 的 textContent 拼接了全部选项，
    // 如「北京上海广州…」) 或主页面已显示该值的字段容器——这类元素「包含」该文本却
    // 不是真正的可点项。若用 includes 判断，elHasText 恒为 true 而阻断切换，导致
    // 「点了但没选中记录的项」。
    // 策略：优先用「文本精确命中」(textContent === 录制文本) 的元素；仅当选择器元素本身已
    // 精确命中同一文本时才沿用 el0，避免误点容器。无精确命中（如弹层尚未就绪）时，退回原
    // includes 兜底（保留已验证可行的旧行为，避免回归）。
    // 文本搜索优先限定在最上层浮层（van-popup）内，避开主页面同文本字段的干扰；找不到再回退全文档。
    const needle = ev.text.trim()
    const popups = Array.from(root.querySelectorAll('.van-popup'))
    const scope: ParentNode = popups.length
      ? (popups[popups.length - 1] as unknown as ParentNode)
      : root
    let byText = locateByText(scope, ev.text)
    if (!byText) byText = locateByText(root, ev.text)
    if (byText) {
      const byExact = (byText.textContent ?? '').trim() === needle
      if (byExact) {
        // 文本精确命中（下拉项 / 确认按钮等最具体的元素）：优先用它。
        // 仅当选择器 el0 自身也是「精确命中 + 真正可交互控件」时才沿用；
        // 否则即便 el0 文本也等于 needle（如主页面已显示该值的字段容器 van-field__control），
        // 它也是「含该文本却非可点项」，不能优先，必须切到浮层内的精确项。
        const selResolved = el0 ? resolveClickable(el0) : null
        const selInteractive =
          !!selResolved &&
          (selResolved instanceof HTMLButtonElement ||
            selResolved instanceof HTMLAnchorElement ||
            selResolved instanceof HTMLInputElement ||
            selResolved.getAttribute?.('role') === 'button' ||
            !!(selResolved as Element).closest?.('.van-button'))
        const selExact = !!el0 && (el0.textContent ?? '').trim() === needle
        if (!(selExact && selInteractive)) el = byText
      } else {
        // 无精确命中（如弹层尚未就绪）：退回原 includes 兜底，避免误点无关容器
        const elHasText = !!el0 && (el0.textContent ?? '').includes(ev.text)
        if (!elHasText) el = byText
      }
    }
  }
  return el
}

/** 交互类事件类型：找不到目标时需要「确认就绪」后再执行（而非直接兜底提示） */
const INTERACTIVE_TYPES = ['click', 'input', 'change', 'submit', 'drag']

/**
 * 滚轮下拉选项选值复核（异步）：Vant PickerColumn 的「选中态」由列的 props.value 决定
 * （class="--selected" 仅在 value===选项值时出现），而 value 由选项的 click →
 * emit('change') → 父级 Picker → v-model 逐级传播，需要一拍响应式更新才落定。
 * 首次打开 picker（全新挂载 + 入场过渡）时，这一拍可能尚未完成就被后续「确认」消费，
 * 导致回放选不中、停留在默认第一项；已挂载的第二次打开则单击即生效。
 * 故点击选项后在此轮询补全：只要列内当前选中项与目标文本不符，就持续补点，
 * 直到选值真正落定（或超时）。调用方需 await 本函数，确保「确认」步骤在选值落定后才执行。
 * 非滚轮选项（closest 不到 .van-picker-column__item）会立即返回，不引入额外延迟。
 */
async function ensurePickerOption(clicked: Element, text?: string): Promise<void> {
  if (!text) return
  const item = clicked.closest?.('.van-picker-column__item')
  if (!item) return
  const column = item.closest('.van-picker-column')
  if (!column) return
  const needle = text.trim()
  const selectedText = (): string => {
    const sel = column.querySelector('.van-picker-column__item--selected')
    if (sel) return (sel.textContent ?? '').trim()
    // 回退：滚轮列选中项始终位于可视区正中，取中心命中元素作为当前选中文本
    const ep = document.elementFromPoint
    if (typeof ep === 'function') {
      const r = column.getBoundingClientRect()
      const hit = ep.call(document, r.left + r.width / 2, r.top + r.height / 2)
      if (hit && column.contains(hit)) return (hit.textContent ?? '').trim()
    }
    return ''
  }
  const clickTarget = (): void => {
    const opts = Array.from(column.querySelectorAll('.van-picker-column__item'))
    const match = opts.find((o) => (o.textContent ?? '').trim() === needle)
    if (match) (match as HTMLElement).click()
  }
  // 有界轮询补全：最多约 20 次（≈2.4s），未选中就持续补点；一旦列内选中项与目标匹配立即返回。
  // 采用次数上限而非时间上限，避免单测 fake timers 下 Date.now 不前进导致死循环。
  for (let i = 0; i < 20; i++) {
    if (selectedText() === needle) return
    clickTarget()
    await new Promise((r) => setTimeout(r, 120))
  }
  // 超时仍不匹配：至少确保点过一次，避免完全不选
  clickTarget()
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

function dispatchInput(
  el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  value: string,
): void {
  el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

/**
 * 文本兜底定位：选择器失效（如 Vant 下拉浮层把 van- 类剥离后选择器变脆）时，
 * 按录制时记录的文本命中可点击项（下拉选项、确认按钮等）。
 */
function locateByText(root: ParentNode, text?: string): Element | null {
  if (!text) return null
  const needle = text.trim()
  if (!needle) return null
  const scored: { el: Element; score: number }[] = []
  root.querySelectorAll<Element>('*').forEach((el) => {
    const t = (el.textContent ?? '').trim()
    if (!t) return
    if (t === needle) scored.push({ el, score: 2 })
    else if (t.includes(needle) || needle.includes(t)) scored.push({ el, score: 1 })
  })
  if (scored.length === 0) return null
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    // 同分时取子节点更少的（更具体、更贴近文本叶子）
    return a.el.querySelectorAll('*').length - b.el.querySelectorAll('*').length
  })
  return scored[0]?.el ?? null
}

/**
 * 等待目标页 DOM 就绪：页面跳转（page_view）后，目标路由组件需要异步解析 + 挂载，
 * 回放器若在 DOM 未就绪时就执行后续操作，locate() 必然失败、操作「找不到元素」。
 * 故在导航后轮询下一个事件的目标（selector 优先；无 selector 时按文本）是否出现，
 * 出现即视为该页已挂载、可安全回放；超时（默认 5s）则 best-effort 继续，避免死等。
 */
function waitForTarget(root: ParentNode, ev: TrackEvent, timeout = 5000): Promise<void> {
  if (!ev.selector && !ev.text) return Promise.resolve()
  const start = Date.now()
  return new Promise<void>((resolve) => {
    const check = () => {
      const ok = ev.selector ? !!locate(root, ev.selector) : !!locateByText(root, ev.text)
      if (ok) return resolve()
      if (Date.now() - start >= timeout) return resolve()
      setTimeout(check, 60)
    }
    check()
  })
}

/** 事件中文标签，用于回放提示文案 */
function evLabel(ev: TrackEvent): string {
  const map: Record<string, string> = {
    click: '点击',
    input: '输入',
    change: '变更',
    submit: '提交',
    scroll: '滚动',
    page_view: '页面切换',
    drag: '拖拽/滑块验证',
  }
  const base = map[ev.type] ?? ev.type
  const extra = ev.text ? `「${ev.text}」` : ev.selector ? ev.selector : ''
  return extra ? `${base} ${extra}` : base
}

/**
 * 重放拖拽（滑块验证等）：在记录的起点派发 pointerdown，
 * 再沿路径在 window 上派发若干 pointermove，最后在终点派发 pointerup。
 * 与 VantSliderVerify 的 onDown/onMove/onUp（挂在 .slider-bar + window）完全对应。
 */
function dispatchDrag(el: Element, fromX: number, fromY: number, toX: number, toY: number): void {
  const mk = (type: string, x: number, y: number) =>
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      pointerId: 1,
      pointerType: 'mouse',
      buttons: type === 'pointerup' ? 0 : 1,
    } as PointerEventInit)
  el.dispatchEvent(mk('pointerdown', fromX, fromY))
  const steps = 8
  for (let i = 1; i <= steps; i++) {
    const cx = Math.round(fromX + ((toX - fromX) * i) / steps)
    const cy = Math.round(fromY + ((toY - fromY) * i) / steps)
    window.dispatchEvent(mk('pointermove', cx, cy))
  }
  window.dispatchEvent(mk('pointerup', toX, toY))
}

/**
 * 通用拖拽回放（适配任意「浮层内滚轮/列表选择」类组件，如各类 Vant/custom Picker）：
 * 这类选择控件只监听 touchstart / touchmove / touchend（Vant PickerColumn 在列根监听，
 * 自定义控件多在列表容器内监听），完全不响应 PointerEvent；故必须用带 touches 列表的
 * TouchEvent 驱动，才能真实滚动并选中目标项。
 *
 * 不耦合任何具体组件的 class：直接在录制的目标元素 el 上派发 touch 事件，靠事件冒泡触达
 * 控件的监听器（el 通常是某个 <li/> 选项，向上冒泡到列根/容器），对 Vant 与自定义封装都兼容。
 *
 * 关键点：整个手势跨度控制在 > 惯性阈值 300ms（按 35ms×10 步 ≈ 350ms + 收尾），使控件的
 * 惯性逻辑不触发；最终选中项由「起始偏移 + 总位移」决定，完全由记录坐标确定、可复现、不会 overshoot。
 * 返回 Promise，待过场动画把选中值提交后再 resolve，确保后续「确认」等步骤在其之后执行。
 */
function dispatchTouchDrag(
  el: Element,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): Promise<void> {
  if (typeof Touch === 'undefined' || typeof TouchEvent === 'undefined') {
    // 非浏览器环境（如 jsdom 单测）无 Touch 支持：无法模拟，交由调用方提示，不抛错
    return Promise.resolve()
  }
  // 直接在录制目标上派发，靠冒泡触达控件监听器（通用，不依赖 .van-picker-column 等具体 class）
  const target = el
  const mkTouch = (x: number, y: number) =>
    new Touch({ identifier: 1, target, clientX: x, clientY: y } as TouchInit)
  const mk = (type: string, x: number, y: number, touches: Touch[]) =>
    new TouchEvent(type, {
      bubbles: true,
      cancelable: true,
      touches,
      targetTouches: touches,
      changedTouches: touches,
    } as TouchEventInit)
  target.dispatchEvent(mk('touchstart', fromX, fromY, [mkTouch(fromX, fromY)]))
  const steps = 10
  const stepMs = 35
  return new Promise<void>((resolve) => {
    for (let i = 1; i <= steps; i++) {
      setTimeout(() => {
        const cx = Math.round(fromX + ((toX - fromX) * i) / steps)
        const cy = Math.round(fromY + ((toY - fromY) * i) / steps)
        target.dispatchEvent(mk('touchmove', cx, cy, [mkTouch(cx, cy)]))
        if (i === steps) {
          setTimeout(() => {
            target.dispatchEvent(mk('touchend', toX, toY, []))
            // 等过场动画 / transitionEnd 把选中值提交后再继续后续步骤
            setTimeout(resolve, 260)
          }, stepMs)
        }
      }, i * stepMs)
    }
  })
}

// ===== 回放滚屏：用 rAF 在相邻事件间插值，模拟真实连续滚动 =====
let scrollRAF = 0
function cancelScrollAnim(): void {
  if (scrollRAF) {
    cancelAnimationFrame(scrollRAF)
    scrollRAF = 0
  }
}
function animateScrollTo(
  scroller: HTMLElement | null,
  x: number,
  y: number,
  duration: number,
): void {
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
  const targetWaitMs = options.targetWaitMs ?? 3000
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

  const step = async () => {
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

    // 解析目标元素（选择器 + click 文本兜底）；详见 resolveEventTarget。
    let el = resolveEventTarget(root, ev)
    // 目标未就绪：交互类事件（点击下拉项 / 提交 / 拖拽选择等）先「确认就绪」再执行——
    // 轮询等待其真实出现（下拉弹层选项尚未渲染、异步挂载等场景），出现后再执行；
    // 仅当超时仍找不到才落到下方兜底提示，避免「一找不到就直接提示、其实等一下就好」的误报。
    if (!el && INTERACTIVE_TYPES.includes(ev.type)) {
      await waitForTarget(root, ev, targetWaitMs)
      if (!playing) return
      el = resolveEventTarget(root, ev)
    }
    // 拖拽事件定位（通用，不耦合具体组件 class）：
    // - 滑块验证（.slider-bar）走 pointer 回放；选择器已落在滑块内则沿用，否则（选择器失效）回退到 .slider-bar。
    // - 其余拖拽（各类浮层内 Picker/列表滚动选择等）一律保留原目标，走「通用 touch 回放」，
    //   绝不劫持到滑块（此前「无条件重定向到 .slider-bar」会把城市等下拉拖拽误导向滑块，导致选不中）。
    if (ev.type === 'drag') {
      const inSlider = !!el && !!(el as Element).closest?.('.slider-bar')
      if (!el && !inSlider) {
        const slider = root.querySelector('.slider-bar')
        if (slider) el = slider
      }
    }
    highlight(el)

    // 该事件到下一事件的间隔，作为滚屏插值动画时长，使滚动显得连续自然
    const nextEv = events[index + 1]
    const gap = nextEv ? Math.max((nextEv.t - ev.t) / speed, minStep) : minStep

    // 页面切换：回放时真实跳转路由，还原用户的导航轨迹。
    // 关键点：导航必须 await（路由解析 + 组件挂载是异步的）。跳转后目标页 DOM 的就绪，
    // 由其「后续交互事件自身」在 step 开头按需等待（见上方目标就绪确认），此处无需重复等待。
    if (ev.type === 'page_view') {
      if (ev.path && options.navigate) {
        try {
          const nav = options.navigate(ev.path)
          if (nav && typeof (nav as PromiseLike<void>).then === 'function') await nav
        } catch {
          /* 导航被中断/重复：忽略，继续后续事件 */
        }
        if (!playing) return
      }
    } else if (ev.type === 'scroll') {
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
          // 滚轮下拉选项：首次打开（全新挂载 + 入场过渡）可能未及时响应单击，
          // 异步复核并补点（详见 ensurePickerOption）。采用 fire-and-forget：不阻塞 step，
          // 因为「确认」步骤在 gap（≥minStep 250ms）之后才执行，补点早已完成；
          // 且保持 step 同步调度，避免破坏单测的步进假设。
          void ensurePickerOption(target as Element, ev.text)
          break
        }
        case 'input':
        case 'change':
          if (
            el instanceof HTMLInputElement ||
            el instanceof HTMLSelectElement ||
            el instanceof HTMLTextAreaElement
          ) {
            const inputType =
              el instanceof HTMLInputElement ? el.getAttribute('type') || el.type : ''
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
          else
            (el as HTMLElement).dispatchEvent(
              new Event('submit', { bubbles: true, cancelable: true }),
            )
          break
        case 'drag':
          if (
            typeof ev.fromX === 'number' &&
            typeof ev.fromY === 'number' &&
            typeof ev.toX === 'number' &&
            typeof ev.toY === 'number'
          ) {
            const inSlider = !!(el as Element).closest?.('.slider-bar')
            if (inSlider) {
              // 滑块验证：沿用 pointer 拖拽
              dispatchDrag(el, ev.fromX, ev.fromY, ev.toX, ev.toY)
            } else {
              // 浮层内 Picker / 列表滚动选择等：用 touch 事件异步回放（通用，兼容 Vant 与自定义封装），
              // 等选中值提交后再走下一步（确认等）
              await dispatchTouchDrag(el as Element, ev.fromX, ev.fromY, ev.toX, ev.toY)
              if (!playing) return
            }
            // 拖拽已真实模拟驱动（验证 / 选择），不弹「已执行」提示（否则会误导用户以为只是提示而非真的执行了）；
            // 仅当无法复现（坐标缺失 / 元素找不到，落到下方 else-if）才提示。
          } else {
            options.onHint?.(ev, '滑块验证：缺少坐标，无法模拟（已记录该操作）')
          }
          break
        // page_view 等元数据动作在回放中不重演 DOM 行为
      }
    } else if (['click', 'input', 'change', 'submit', 'drag'].includes(ev.type)) {
      // 已知交互但未能定位目标（选择器 / 文本兜底都失效）：提示「已执行该操作」，避免静默跳过
      options.onHint?.(ev, `已执行操作（无法模拟）：${evLabel(ev)}`)
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
    play(fromIndex = 0) {
      if (playing) return
      // 支持断点续播：从指定索引开始（刷新 / 跨页跳转恢复后继续）
      index = Math.max(0, Math.min(fromIndex, total - 1))
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
