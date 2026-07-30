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
  /** 周期性上报间隔（ms），默认 5000 */
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
}

const DEFAULTS = {
  events: ['page_view', 'click', 'input', 'change', 'submit', 'scroll'] as TrackEventType[],
  maxBatch: 20,
  flushInterval: 5000,
  sampleRate: 1,
  captureValues: true,
  recordPassword: false,
  ignore: ['[data-track-ignore]'],
  endpoint: '/track/events',
  scrollThrottle: 300,
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
    if (node.id) {
      sel += '#' + node.id
      parts.unshift(sel)
      break
    }
    const classes = Array.from(node.classList)
      .filter((c) => !c.startsWith('van-'))
      .slice(0, 2)
      .join('.')
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

  // 滚动采集节流状态
  private lastScrollTs = 0
  private scrollTimer: ReturnType<typeof setTimeout> | null = null

  // 预绑定处理器，便于在 enable/disable 时精确解绑
  private readonly onDom = (e: Event) => this.handleDom(e)
  private readonly onScroll = (e: Event) => this.handleScroll(e)
  private readonly onHide = () => this.flush(true)
  private readonly onVisibility = () => {
    if (document.visibilityState === 'hidden') this.flush(true)
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
      this.routeGuard = router.afterEach((to: any) => {
        this.recordPageView(to.fullPath, { title: to.meta?.title, name: to.name })
      })
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
    // 监听路由切换
    if (this.router?.afterEach) {
      this.routeGuard = this.router.afterEach((to: any) => {
        this.recordPageView(to.fullPath, { title: to.meta?.title, name: to.name })
      })
    }
    window.addEventListener('pagehide', this.onHide)
    document.addEventListener('visibilitychange', this.onVisibility)
    if (this.opts.events.includes('scroll')) {
      // 捕获阶段：可识别 window 与任意内层滚动容器（e.target 即真正滚动的元素）
      window.addEventListener('scroll', this.onScroll, true)
    }
    this.flushTimer = setInterval(() => this.flush(), this.opts.flushInterval)
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

  private push(ev: TrackEvent): void {
    this.buffer.push(ev)
    if (this.session) this.session.eventCount++
    this.emit()
    if (this.buffer.length >= this.opts.maxBatch) this.flush()
  }

  /** 上报缓冲区。force=true 时即使为空也尝试（用于关闭 / 隐藏页面时落盘） */
  flush(force = false): void {
    if (!this.session) return
    if (this.buffer.length === 0 && !force) return
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
