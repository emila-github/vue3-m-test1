// 页面操作记录插件 - 录制器
//
// 设计目标：
// 1. 无感知：所有 DOM 监听使用 passive，上报与落盘走空闲调度 / 信标，绝不阻塞主线程。
// 2. 默认关闭：必须显式 enable() 才开始记录。
// 3. 隐私安全：输入值默认不记录（只记录「发生了输入」），密码字段永远不记录。
import { post } from '@/api/request'
import { getUserInfo } from '@/api/core/token'
import type { TrackEvent, TrackEventType, TrackSession } from './types'

export interface TrackRecorderOptions {
  /** 需要记录的动作类型，默认全部 */
  events?: TrackEventType[]
  /** 缓冲区达到该数量即上报，默认 20 */
  maxBatch?: number
  /** 周期性检查间隔（ms），默认 5000；仅在缓冲区已达 maxBatch 时才真正发送，避免零散批次多发请求 */
  flushInterval?: number
  /** 采样率 0~1，默认 1（全量） */
  sampleRate?: number
  /** 是否记录输入值，默认 true（记录表单填写内容，供回放回填） */
  captureValues?: boolean
  /** 是否记录密码框明文值，默认 false（密码默认只记行为，需显式开启） */
  recordPassword?: boolean
  /** 匹配这些选择器的子树事件将被忽略（默认忽略 [data-track-ignore]） */
  ignore?: string[]
  /** 上报端点，默认 /track/events */
  endpoint?: string
  /** 滚动采集节流间隔（ms），默认 300 */
  scrollThrottle?: number
  /** 拖拽位移阈值（px），小于此值视为点击而非拖拽，默认 5 */
  dragThreshold?: number
  /**
   * 「滚轮选项列」选择器，默认 `.van-picker-column`。
   * 这类元素内的拖拽属于「滚动选择」而非自由拖拽：其落点由组件的惯性 + 对齐算法决定，
   * 按坐标回放 touch 无法复现同一结果（选不中）。故录制时归一成「最终选中项的 click」——
   * 与早期可用实现（点击选项即选中）形态一致，回放稳定可靠。自定义滚轮封装可追加选择器。
   */
  optionColumn?: string
  /** 滚动选择落点的稳定判定超时（ms），默认 1500（需覆盖惯性动画 swipeDuration） */
  optionSettleMs?: number
  /**
   * 仅交互时上报后端（默认开启）。
   * 开启后，只有出现真实交互（点击 / 输入 / 变更 / 提交 / 滑块拖拽）才把会话上报后端，
   * 单纯「进入页面」（page_view）或「滚动」（scroll）不会产生上报，避免大量无意义的进入记录。
   * 交互前的 scroll 不进缓冲（避免无意义堆积），page_view 仍保留以便与交互一起回放。
   */
  uploadOnInteractionOnly?: boolean
}

/** 触发「交互上报」的事件类型：点击 / 输入 / 变更 / 提交 / 滑块拖拽 */
const INTERACTION_TYPES: TrackEventType[] = ['click', 'input', 'change', 'submit', 'drag']

const DEFAULTS = {
  events: ['page_view', 'click', 'input', 'change', 'submit', 'scroll', 'drag'] as TrackEventType[],
  maxBatch: 20,
  flushInterval: 5000,
  sampleRate: 1,
  captureValues: true,
  recordPassword: false,
  ignore: ['[data-track-ignore]'],
  endpoint: '/track/events',
  scrollThrottle: 300,
  /** 拖拽位移阈值（px），小于此值视为点击而非拖拽 */
  dragThreshold: 5,
  /** 滚轮选项列：其内拖拽记录为「最终选中项的 click」，而非坐标 drag */
  optionColumn: '.van-picker-column',
  optionSettleMs: 1500,
  /** 仅交互时上报后端：避免大量无意义的「进入页面」记录 */
  uploadOnInteractionOnly: true,
}

type EventListener = (events: TrackEvent[]) => void

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/** 生成可回放的稳定 CSS 选择器（忽略 van- 动态类，避免类名变动导致定位失败） */
function buildSelector(el: Element): string {
  const parts: string[] = []
  let node: Element | null = el
  let depth = 0
  while (node && node.nodeType === 1 && depth < 8) {
    let sel = node.tagName.toLowerCase()
    // 稳定的业务锚点：显式打 data-track-anchor 的元素（如下拉触发器）优先生成确定选择器
    const anchor = (node as HTMLElement).getAttribute?.('data-track-anchor')
    if (anchor) {
      sel += `[data-track-anchor="${anchor}"]`
      parts.unshift(sel)
      break
    }
    // Vant 的 Field / Picker 等组件用模块级「全局自增计数器」生成 id
    // （van-field-N-input、van-picker-N…，见 vant/es/composables/use-id.mjs：
    //   let current = 0; return `${name}-${++current}`），这类 id 跨会话不稳定——
    //   计数器随应用运行只增不减，且受「此前已挂载多少 Vant 组件」影响（录制里
    //   van-field 编号出现 1,2,4,5,9 的跳号即源于此）。若在此直接锚定，会录出
    //   van-field-1-input 这种「回放时根本不存在」的选择器，导致整页 click/input
    //   全部走兜底。故遇到 van- 前缀的自动 id 时跳过，继续向上寻找 data-track-anchor，
    //   录出确定性、可回放的选择器。
    if (node.id && !/^van-/i.test(node.id)) {
      sel += '#' + node.id
      parts.unshift(sel)
      break
    }
    // 收集可用类名作锚点：
    // - 优先用非 van- 业务类（规避动态哈希类）；
    // - 若该层「只剩 van- 类」（如 Vant picker 选项 van-picker-column__item），仍保留首个类作锚点——
    //   Vant 结构类名是稳定的（非哈希），保留它可让回放定位选择器真正命中；否则被全剥后只剩
    //   li:nth-child(k)，而 picker 弹层 teleport 到 body，无锚点会误命中页面其它列表，导致「选不中」。
    //   该兜底对各类 popup 封装通用：选项带有任意稳定（非哈希）类名时都会被保留。
    const allClasses = Array.from(node.classList)
    const nonVan = allClasses.filter((c) => !c.startsWith('van-'))
    const used = nonVan.length ? nonVan.slice(0, 2) : allClasses.slice(0, 1)
    const classes = used.join('.')
    if (classes) sel += '.' + classes
    const parent: HTMLElement | null = node.parentElement
    if (parent) {
      const siblings = Array.from(parent.children).filter((c) => c.tagName === node!.tagName)
      if (siblings.length > 1) {
        const idx = Array.from(parent.children).indexOf(node!) + 1
        sel += `:nth-child(${idx})`
      }
    }
    parts.unshift(sel)
    node = parent
    depth++
  }
  return parts.join(' > ') || 'body'
}

function shouldIgnore(target: EventTarget | null, selectors: string[]): boolean {
  if (!target || !(target instanceof Element)) return false
  return selectors.some((s) => target.closest(s))
}

export class TrackRecorder {
  private opts: Required<TrackRecorderOptions>
  private router: any = null
  private enabled = false
  private session: TrackSession | null = null
  private buffer: TrackEvent[] = []
  private startTs = 0
  private flushTimer: ReturnType<typeof setInterval> | null = null
  private routeGuard: (() => void) | null = null
  private listeners: EventListener[] = []
  // 本会话是否出现过真实交互（点击 / 输入 / 变更 / 提交 / 拖拽）；用于「仅交互时上报」判定
  private hasInteraction = false

  // 滚动采集节流状态
  private lastScrollTs = 0
  private scrollTimer: ReturnType<typeof setTimeout> | null = null

  // 拖拽检测临时状态（pointerdown→move→up 序列）
  private dragStart: { el: Element; x: number; y: number } | null = null
  private dragMoveHandler: ((e: Event) => void) | null = null
  private dragUpHandler: ((e: Event) => void) | null = null
  // 拖拽结束后一段时间内抑制同元素的 click 误记录
  private suppressClickUntil = 0
  private suppressClickTarget: Element | null = null
  // 列内拖拽时，抑制整列内的原生 click（Vant 会 preventDefault 吞掉，兜底去重）
  private suppressClickColumn: Element | null = null
  // 各滚轮列上次记录的选中项文本，用于「拖来拖去回到同一项」时去重
  private lastColumnPick = new WeakMap<Element, string>()

  // 预绑定处理器，便于在 enable/disable 时精确解绑
  private readonly onDom = (e: Event) => this.handleDom(e)
  private readonly onScroll = (e: Event) => this.handleScroll(e)
  // 拖拽检测：按下时记录起点，松开时若位移超阈值则记一条 drag 事件
  private readonly onPointerDown = (e: Event) => this.handlePointerDown(e)
  private readonly onHide = () => this.flush(true)
  private readonly onVisibility = () => {
    if (document.visibilityState === 'hidden') this.flush(true)
  }
  // 路由切换（SPA 内导航）：先发送上一页累积的 events（不满 20 也发，等同「离开页面」），
  // 再记录新页面的 page_view，使每个批次各自归属一个页面；空缓冲区不会请求后端。
  private readonly onRouteChange = (to: any) => {
    this.flush(true)
    this.recordPageView(to.fullPath, { title: to.meta?.title, name: to.name })
  }

  constructor(options: TrackRecorderOptions = {}, router?: any) {
    this.opts = { ...DEFAULTS, ...options }
    if (router) this.router = router
  }

  setRouter(router: any): void {
    this.router = router
    // 若已开启记录但此前未挂上路由守卫（安装时 router 尚未就绪），补挂 afterEach，
    // 确保「页面切换（page_view）」在后续导航中被记录。
    if (this.enabled && !this.routeGuard && router?.afterEach) {
      this.routeGuard = router.afterEach(this.onRouteChange)
    }
  }

  isEnabled(): boolean {
    return this.enabled
  }

  /** 订阅缓冲区变化（供调试 / 演示页实时展示），返回取消订阅函数 */
  subscribe(cb: EventListener): () => void {
    this.listeners.push(cb)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb)
    }
  }

  private emit(): void {
    const snapshot = this.buffer.slice()
    this.listeners.forEach((l) => l(snapshot))
  }

  /** 开启记录：开始新会话并挂载监听。可传入覆盖项（如 captureValues） */
  enable(override: TrackRecorderOptions = {}): void {
    if (this.enabled) return
    this.opts = { ...this.opts, ...override }
    this.enabled = true
    this.startSession()
    this.attach()
  }

  /** 关闭记录：强制上报残差并卸载监听 */
  disable(): void {
    if (!this.enabled) return
    this.enabled = false
    this.flush(true)
    this.detach()
    if (this.session) this.session.endedAt = Date.now()
  }

  toggle(): void {
    this.enabled ? this.disable() : this.enable()
  }

  /**
   * 运行时更新配置（如 captureValues / recordPassword / events），
   * 不重启会话、不卸载监听、不触发上报 —— 用于「配置区」开关，避免改动配置就向后端发请求。
   */
  setOptions(override: TrackRecorderOptions = {}): void {
    if (!this.enabled) return
    this.opts = { ...this.opts, ...override }
  }

  /** 立即清空本地缓冲区（不影响已上报数据） */
  clear(): void {
    this.buffer = []
    this.emit()
  }

  /** 当前缓冲区快照 */
  snapshot(): TrackEvent[] {
    return this.buffer.slice()
  }

  private startSession(): void {
    const user = getUserInfo()
    this.hasInteraction = false
    this.startTs = Date.now()
    this.session = {
      sessionId: uuid(),
      userId: user?.userId ?? '',
      userName: user?.name ?? '匿名用户',
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      screen: `${window.screen.width}x${window.screen.height}`,
      startedAt: this.startTs,
      eventCount: 0,
    }
    this.recordPageView(location.pathname + location.search, {
      title: document.title,
      initial: true,
    })
  }

  private attach(): void {
    const domTypes = this.opts.events.filter((t) =>
      ['click', 'input', 'change', 'submit'].includes(t),
    )
    domTypes.forEach((t) => {
      document.addEventListener(t, this.onDom, { passive: true, capture: false })
    })
    // 监听路由切换（切换时先 flush 上一页 events，再记新页 page_view）
    if (this.router?.afterEach) {
      this.routeGuard = this.router.afterEach(this.onRouteChange)
    }
    window.addEventListener('pagehide', this.onHide)
    document.addEventListener('visibilitychange', this.onVisibility)
    if (this.opts.events.includes('scroll')) {
      // 捕获阶段：可识别 window 与任意内层滚动容器（e.target 即真正滚动的元素）
      window.addEventListener('scroll', this.onScroll, true)
    }
    // 拖拽起点（pointer 统一鼠标 / 触摸）；move/up 在按下后动态挂载到 window
    document.addEventListener('pointerdown', this.onPointerDown, true)
    // 周期性 flush：仅在缓冲区已达 maxBatch(20) 时才发送，避免零散批次被周期触发而多发请求。
    // 未满 20 的零散 events 只会在「离开页面」(pagehide / visibilitychange) 时一次性发送。
    this.flushTimer = setInterval(() => {
      if (this.buffer.length >= this.opts.maxBatch) this.flush()
    }, this.opts.flushInterval)
  }

  private detach(): void {
    const domTypes = ['click', 'input', 'change', 'submit']
    domTypes.forEach((t) => document.removeEventListener(t, this.onDom))
    if (this.opts.events.includes('scroll')) {
      window.removeEventListener('scroll', this.onScroll, true)
    }
    if (this.routeGuard) {
      this.routeGuard()
      this.routeGuard = null
    }
    window.removeEventListener('pagehide', this.onHide)
    document.removeEventListener('visibilitychange', this.onVisibility)
    document.removeEventListener('pointerdown', this.onPointerDown, true)
    this.endDragTracking()
    if (this.scrollTimer) {
      clearTimeout(this.scrollTimer)
      this.scrollTimer = null
    }
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
  }

  private handleDom(e: Event): void {
    if (!this.enabled || !this.session) return
    // 采样
    if (this.opts.sampleRate < 1 && Math.random() > this.opts.sampleRate) return
    // 忽略白名单
    if (shouldIgnore(e.target, this.opts.ignore)) return

    const type = e.type as TrackEventType
    if (!this.opts.events.includes(type)) return

    // 拖拽刚结束的同一根手指 / 鼠标，避免在其落点再记一条 click（滑块拖动后常见）。
    // 列内拖拽时进一步抑制整列内的 click（Vant 原生的 onClick 也会触发，但落点不准，
    // 统一由 captureColumnSelection 补录「最终选中项」的 click，避免重复/错位）。
    if (type === 'click' && Date.now() < this.suppressClickUntil) {
      const tgt = e.target as Element | null
      if (this.suppressClickTarget && tgt === this.suppressClickTarget) return
      if (this.suppressClickColumn && tgt instanceof Element && tgt.closest?.(this.opts.optionColumn) === this.suppressClickColumn) return
    }

    const el = (e.target as Element) ?? null
    const ev: TrackEvent = {
      type,
      ts: Date.now(),
      t: Date.now() - this.startTs,
      path: location.pathname + location.search,
    }

    if (el) {
      ev.selector = buildSelector(el)
      ev.tag = el.tagName.toLowerCase()
      if (type === 'click') {
        ev.text = (el.textContent ?? '').trim().slice(0, 50)
      }
      if (type === 'input' || type === 'change') {
        if (el instanceof HTMLInputElement) {
          const inputType = el.getAttribute('type') || el.type
          const isPassword = inputType === 'password'
          if (inputType === 'checkbox' || inputType === 'radio') {
            // 勾选框：记录勾选态（不记录明文值）
            if (this.opts.captureValues) ev.checked = el.checked
          } else if (this.opts.captureValues) {
            // 文本/下拉类输入：记录输入值，供回放回填。
            if (isPassword) {
              // 密码框：还需 recordPassword 显式开启才记录明文（默认只记行为）。
              if (this.opts.recordPassword) {
                ev.value = (el.value ?? '').slice(0, 200)
                ev.isPassword = true
              }
            } else {
              ev.value = (el.value ?? '').slice(0, 200)
            }
          }
        } else if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
          if (this.opts.captureValues) ev.value = (el.value ?? '').slice(0, 200)
        }
      }
    }

    if (type === 'click') {
      const me = e as MouseEvent
      ev.x = Math.round(me.clientX)
      ev.y = Math.round(me.clientY)
    }

    this.push(ev)
  }

  private recordPageView(
    path: string,
    extra: { title?: string; name?: string; initial?: boolean },
  ): void {
    if (!this.enabled || !this.session) return
    // 避免连续重复记录同一路径
    const last = this.buffer[this.buffer.length - 1]
    if (!extra.initial && last?.type === 'page_view' && last.path === path) return
    this.push({
      type: 'page_view',
      ts: Date.now(),
      t: Date.now() - this.startTs,
      path,
      text: extra.title ?? extra.name ?? undefined,
    })
  }

  /** 滚屏采集：节流 + 尾部补帧（滚动停止后补记一次最终位置），降低事件量 */
  private handleScroll(e: Event): void {
    if (!this.enabled || !this.session) return
    if (this.opts.sampleRate < 1 && Math.random() > this.opts.sampleRate) return
    const now = Date.now()
    if (now - this.lastScrollTs >= this.opts.scrollThrottle) {
      this.lastScrollTs = now
      this.recordScroll(e)
    } else if (!this.scrollTimer) {
      this.scrollTimer = setTimeout(() => {
        this.scrollTimer = null
        this.lastScrollTs = Date.now()
        this.recordScroll(e)
      }, this.opts.scrollThrottle)
    }
  }

  /** 识别真正发生滚动的元素（window 或内层容器），记录其位置与可定位选择器 */
  private recordScroll(e: Event): void {
    if (!this.enabled || !this.session) return
    if (!this.opts.events.includes('scroll')) return
    const target = e.target as EventTarget | null
    let scroller: HTMLElement | null = null
    let isWindow = false
    if (
      target === document ||
      target === window ||
      target === document.body ||
      target === document.documentElement
    ) {
      scroller = (document.scrollingElement ?? document.documentElement) as HTMLElement
      isWindow = true
    } else if (target instanceof HTMLElement) {
      scroller = target
    }
    if (!scroller) return
    this.push({
      type: 'scroll',
      ts: Date.now(),
      t: Date.now() - this.startTs,
      path: location.pathname + location.search,
      // window 滚动不记录选择器，回放时直接 window.scrollTo；内层容器记录选择器
      selector: isWindow ? undefined : buildSelector(scroller),
      scrollX: Math.round(scroller.scrollLeft),
      scrollY: Math.round(scroller.scrollTop),
    })
  }

  /** 拖拽起点：仅在开启 drag 记录时跟踪；move / up 在按下后动态挂载到 window */
  private handlePointerDown(e: Event): void {
    if (!this.enabled || !this.session) return
    if (!this.opts.events.includes('drag')) return
    if (shouldIgnore(e.target, this.opts.ignore)) return
    const pe = e as PointerEvent
    if (pe.pointerType && !['mouse', 'touch', 'pen'].includes(pe.pointerType)) return
    const target = e.target as Element | null
    if (!target || !(target instanceof Element)) return
    this.dragStart = { el: target, x: Math.round(pe.clientX), y: Math.round(pe.clientY) }
    this.dragMoveHandler = () => {
      /* 仅占位：拖拽过程位置在 pointerup 时统一计算，move 阶段不写事件 */
    }
    this.dragUpHandler = (ue: Event) => this.handleDragUp(ue)
    window.addEventListener('pointermove', this.dragMoveHandler, true)
    window.addEventListener('pointerup', this.dragUpHandler, true)
    window.addEventListener('pointercancel', this.dragUpHandler, true)
  }

  private handleDragUp(e: Event): void {
    const start = this.dragStart
    this.endDragTracking()
    if (!start || !this.enabled || !this.session) return
    const ue = e as PointerEvent
    const toX = Math.round(ue.clientX)
    const toY = Math.round(ue.clientY)
    const dist = Math.hypot(toX - start.x, toY - start.y)
    const dragEndT = Date.now() - this.startTs
    // 滚轮列（下拉选项）内的手势：不记坐标 drag，改记「最终选中项的 click」。
    // 原因：这类组件的落点由惯性 + 对齐算法决定（Vant Picker 的 momentum / swipeDuration），
    // 坐标回放 touch 无法复现同一结果，导致「回放时选不中」；而其选项 li 自带 role="button"
    // 与 onClick（点击即选中），正是早期版本选项能正常回显的机制。
    // 关键点：列内手势【不依赖 net 位移阈值】——Vant Picker 触摸滑动时会调用
    // setPointerCapture，使 pointerup 的 clientX/Y 被重定向到按下点（net dist≈0），
    // 若先判阈值会把「滑动」误判为普通点击，导致最终落点从未被记录。故列内手势始终走此分支。
    const column = start.el.closest?.(this.opts.optionColumn) ?? null
    if (column) {
      // 抑制拖拽落点可能触发的原生 click，避免与下方补录的精确 click 重复
      this.suppressClickUntil = Date.now() + 400
      this.suppressClickTarget = start.el
      this.suppressClickColumn = column
      // 记录「按下时列内已选中项」与「按下落点的选项文本」，用于区分三种情形
      // （真实滚动 / 轻点被误判为拖动后列回弹到原值 / 轻点恰好命中该项）。
      // 详见 captureColumnSelection → recordColumnPick 内的 finalText 判定。
      const pre = this.readSelectedOption(column)
      const preSelectedText = pre ? (pre.textContent ?? '').trim() : ''
      const tappedLi = start.el.closest?.('li') ?? start.el
      const tappedText = (tappedLi.textContent ?? '').trim()
      // 传入拖拽结束时刻 t：补录的 click 应按此 t 排序插入（早于随后的「确认」点击），
      // 否则回放顺序错乱会确认到错误值。
      this.captureColumnSelection(column, dragEndT, tappedText, preSelectedText)
      return
    }
    // 非列：位移过小视为点击，不记 drag，也不抑制 click（让 click 正常记录）
    if (dist < this.opts.dragThreshold) return
    // 抑制拖拽落点可能触发的原生 click（滑块拖动后常见），避免重复记录。
    this.suppressClickUntil = Date.now() + 400
    this.suppressClickTarget = start.el
    this.push({
      type: 'drag',
      ts: Date.now(),
      t: Date.now() - this.startTs,
      path: location.pathname + location.search,
      selector: buildSelector(start.el),
      tag: start.el.tagName.toLowerCase(),
      fromX: start.x,
      fromY: start.y,
      toX,
      toY,
    })
  }

  /**
   * 滚动选择落点采集：等待选中项稳定后，补录一条「点击该选项」的 click 事件。
   * 惯性 / 过渡动画期间选中项仍在变化，故连续两次读到同一项才视为稳定；
   * 超过 optionSettleMs 仍在变化则取最后一次读数，避免无限等待。
   *  key 信号：
   *   - settledText：列稳定后实际选中项（Vant 的落点，可能是惯性结果或回弹后的原值）；
   *   - tappedText：手势按下落点的选项文本（用户手指实际点中的项）；
   *   - preSelectedText：手势开始前列已选中项（按下瞬间尚未因惯性改变）。
   */
  private captureColumnSelection(column: Element, t: number, tappedText: string, preSelectedText: string): void {
    const deadline = Date.now() + this.opts.optionSettleMs
    let lastText: string | null = null
    const tick = () => {
      if (!this.enabled || !this.session) return
      const el = this.readSelectedOption(column)
      const text = el ? (el.textContent ?? '').trim() : null
      if (el && text && text === lastText) {
        this.recordColumnPick(column, el, text, t, tappedText, preSelectedText)
        return
      }
      lastText = text
      if (Date.now() >= deadline) {
        if (el && text) this.recordColumnPick(column, el, text, t, tappedText, preSelectedText)
        return
      }
      setTimeout(tick, 80)
    }
    setTimeout(tick, 80)
  }

  /** 读取某滚轮列当前选中项：优先取组件标注的选中态，其次用 Vant 自身选中算法反推，最后回退几何中心命中 */
  private readSelectedOption(column: Element): Element | null {
    // 1) 组件显式标注的选中态（惯性/对齐结束后 Vant 会更新，最可靠）
    const marked = column.querySelector('[class*="--selected"]')
    if (marked) return marked
    // 2) 兜底：用 Vant PickerColumn 自身的「选中索引 = round(-offset / itemHeight)」反推
    //    当前选中 li。这与组件的选中算法完全一致，不依赖 --selected 时机，
    //    也不依赖 elementFromPoint 命中（后者易命中遮罩/刻度层导致选错项）。
    const wrapper = column.querySelector('.van-picker-column__wrapper') as HTMLElement | null
    const items = Array.from(
      column.querySelectorAll('.van-picker-column__item'),
    ) as HTMLElement[]
    if (wrapper && items.length) {
      const first = items[0]!
      const itemH = first.offsetHeight || first.getBoundingClientRect().height
      if (itemH > 0) {
        const offset = this.readWrapperOffsetY(wrapper)
        const idx = Math.max(0, Math.min(items.length - 1, Math.round(-offset / itemH)))
        const li = items[idx]
        if (li) return li
      }
    }
    // 3) 再兜底：列几何中心命中（收敛到 li，避免记成遮罩）
    const rect = column.getBoundingClientRect()
    if (rect.width && rect.height) {
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
      if (hit && column.contains(hit)) {
        const li = hit.closest?.('li')
        return li ?? hit
      }
    }
    return null
  }

  /** 解析 PickerColumn 内容容器（.van-picker-column__wrapper）的 translateY 偏移（px），用于反推选中索引 */
  private readWrapperOffsetY(wrapper: HTMLElement): number {
    const raw = wrapper.style.transform || getComputedStyle(wrapper).transform
    if (!raw || raw === 'none') return 0
    // translate3d(0, -88px, 0)
    const t3 = raw.match(/translate3d\([^,]+,\s*([-\d.]+)px/)
    if (t3) return parseFloat(t3[1]!)
    // matrix(1, 0, 0, 1, 0, -88) → ty 为第 6 个参数（索引 5）
    const mat = raw.match(/matrix\(([^)]+)\)/)
    if (mat) {
      const p = mat[1]!.split(',').map((s) => parseFloat(s.trim()))
      if (p.length >= 6) return p[5]!
    }
    // matrix3d(...) → ty 为第 14 个参数（索引 13）
    const mat3 = raw.match(/matrix3d\(([^)]+)\)/)
    if (mat3) {
      const p = mat3[1]!.split(',').map((s) => parseFloat(s.trim()))
      if (p.length >= 14) return p[13]!
    }
    return 0
  }

  /** 在列内按文本查找选项 li（用于把「意图项文本」映射回真实 DOM 元素以便录制选择器） */
  private findColumnItemByText(column: Element, text: string): Element | null {
    const items = Array.from(column.querySelectorAll('li'))
    return items.find((o) => (o.textContent ?? '').trim() === text) ?? null
  }

  /**
   * 写入「选中某选项」的 click 事件；同一列重复选中同一项时跳过，避免冗余事件。
   *  t 为拖拽结束时刻（非惯性稳定后的时刻），按时间顺序插入缓冲，确保排在随后「确认」点击之前。
   *
   *  最终应记录的选项（finalText）按「列是否真正改变选中项」判定：
   *   - moved（settledText !== preSelectedText，即惯性/对齐后的落点 ≠ 手势前的值）：
   *     记为实际落点项 settledText。这是用户最终看到的选项，回放点击即可选中，
   *     修复「记录项和滑动到的项不一致」（之前在回弹场景会错误用按下项覆盖落点项）。
   *   - !moved（手势被 Vant 当作抖动回弹到原值，典型为轻点某选项带 5~12px 抖动）：
   *     若用户实际点中的 tappedText 是列内真实选项，则记为意图项 tappedText，
   *     避免记成回弹后的默认首项（修复「点广州却记成北京」）。
   *     仅当 tappedText 确为列内选项时才采用，避免「按下在列容器上」等无效文本污染。
   */
  private recordColumnPick(
    column: Element,
    settledEl: Element,
    settledText: string,
    t: number,
    tappedText: string,
    preSelectedText: string,
  ): void {
    const moved = settledText !== preSelectedText
    let finalText = settledText
    if (!moved && tappedText && tappedText !== settledText && this.findColumnItemByText(column, tappedText)) {
      finalText = tappedText
    }
    if (this.lastColumnPick.get(column) === finalText) return
    this.lastColumnPick.set(column, finalText)
    // 轻点回弹场景：把列真正选到 finalText，使「实时记录」与落盘事件一致，
    // 并保障后续点「确认」时列内值已是该选项（回放点击同样能命中）。
    // 抑制该补点自身的 click，避免与本次补录的精确 click 重复。
    if (finalText !== settledText) {
      const li = this.findColumnItemByText(column, finalText)
      if (li) {
        this.suppressClickUntil = Date.now() + 400
        this.suppressClickColumn = column
        ;(li as HTMLElement).click()
      }
    }
    // 最终记录的选项可能不同于「落点项」（回弹情形记用户点中的项），
    // 需按文本回找对应 li 以录制正确的选择器。
    const targetLi = this.findColumnItemByText(column, finalText) ?? settledEl
    const item = targetLi.closest('li') ?? targetLi
    this.pushSortedByT({
      type: 'click',
      ts: Date.now(),
      t,
      path: location.pathname + location.search,
      selector: buildSelector(item),
      tag: item.tagName.toLowerCase(),
      text: finalText.slice(0, 50),
    })
  }

  private endDragTracking(): void {
    if (this.dragMoveHandler) {
      window.removeEventListener('pointermove', this.dragMoveHandler, true)
      this.dragMoveHandler = null
    }
    if (this.dragUpHandler) {
      window.removeEventListener('pointerup', this.dragUpHandler, true)
      window.removeEventListener('pointercancel', this.dragUpHandler, true)
      this.dragUpHandler = null
    }
    this.dragStart = null
  }

  private push(ev: TrackEvent): void {
    this.buffer.push(ev)
    // 标记本会话是否出现过真实交互（点击 / 输入 / 变更 / 提交 / 拖拽），用于「仅交互时上报」判定
    if (INTERACTION_TYPES.includes(ev.type)) this.hasInteraction = true
    if (this.session) this.session.eventCount++
    this.emit()
    if (this.buffer.length >= this.opts.maxBatch) this.flush()
  }

  /**
   * 按时间顺序插入事件（非追加）：用于「滚动选择补录的 click」。
   * 该 click 要在惯性稳定（最长 optionSettleMs）后才确定文本，但其在时间上
   * 发生于「拖拽结束」那一刻——应排在该时刻之前、亦即早于用户随后很快点下的
   * 「确认」点击。若按普通追加，会被排在「确认」之后，回放时先确认旧值、再高亮
   * 选项却不再确认，最终选错。故按 t 插入到正确位置，保持回放顺序正确。
   */
  private pushSortedByT(ev: TrackEvent): void {
    let i = this.buffer.length
    while (i > 0 && this.buffer[i - 1].t > ev.t) i--
    this.buffer.splice(i, 0, ev)
    if (this.session) this.session.eventCount++
    this.emit()
    if (this.buffer.length >= this.opts.maxBatch) this.flush()
  }

  /** 上报缓冲区。force=true 用于离开页面 / 关闭时立即发送（但 events 为空数组仍不请求后端） */
  flush(force = false): void {
    if (!this.session) return
    // events 为空数组时不请求后端（无论周期性还是离开页面触发）。
    if (this.buffer.length === 0) return
    // 仅交互时上报：本会话尚无任何真实交互（只有进入 / 滚动）则不向后端发起上报
    if (this.opts.uploadOnInteractionOnly && !this.hasInteraction) return
    const payload = {
      session: { ...this.session },
      events: this.buffer.slice(),
    }
    this.buffer = []
    this.emit()
    // 仅本地落盘 / mock；真实后端缺失时静默失败，不影响用户操作
    post(this.opts.endpoint, payload).catch(() => {
      /* 上报失败不阻断业务 */
    })
  }
}
