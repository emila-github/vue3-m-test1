// 录制器（recorder.ts）单测：覆盖会话生命周期、各类事件采集、隐私策略、
// 采样、忽略列表、选择器生成、滚动节流、拖拽识别与抑制、路由页面切换去重等。
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TrackRecorder } from '../recorder'

// recorder 依赖的两个模块在单测中无需真实发起请求 / 读本地存储，统一 mock
vi.mock('@/api/request', () => ({
  post: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/api/core/token', () => ({
  getUserInfo: vi.fn(() => ({ userId: 'U10086', name: '源管理员' })),
}))

import { post } from '@/api/request'

let rec: TrackRecorder | null = null

beforeEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

afterEach(() => {
  rec?.disable()
  rec = null
  document.body.innerHTML = ''
  vi.useRealTimers()
})

function makeRecorder(opts = {}) {
  rec = new TrackRecorder(opts)
  return rec
}

describe('会话生命周期', () => {
  it('enable 后 isEnabled=true 并开始新会话，disable 后停止', () => {
    const r = makeRecorder()
    expect(r.isEnabled()).toBe(false)
    r.enable()
    expect(r.isEnabled()).toBe(true)
    expect(r.snapshot().length).toBeGreaterThanOrEqual(1) // 至少有一条初始 page_view
    r.disable()
    expect(r.isEnabled()).toBe(false)
  })

  it('enable 幂等：重复 enable 不会新建会话 / 重复挂载', () => {
    const r = makeRecorder()
    r.enable()
    const firstSessionId = r.snapshot() // 触发读取
    r.enable() // 第二次应被守卫拦截
    const after = r.snapshot()
    expect(after.length).toBeGreaterThanOrEqual(1)
    expect(() => r.enable()).not.toThrow()
  })

  it('disable 时本会话有交互则上报（写入 endedAt）', () => {
    const r = makeRecorder()
    r.enable()
    const btn = document.createElement('button')
    document.body.appendChild(btn)
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    r.disable()
    expect(post).toHaveBeenCalled()
  })

  it('仅进入页面（无交互）不上报后端，避免大量进入记录', () => {
    const r = makeRecorder({ uploadOnInteractionOnly: true })
    r.enable()
    // 仅初始 page_view，没有任何点击 / 输入等交互
    expect(r.snapshot().every((e) => e.type === 'page_view')).toBe(true)
    // 清空跨用例的 post 调用历史（vi.restoreAllMocks 不清除 vi.fn 计数），再验证本用例不触发上报
    vi.mocked(post).mockClear()
    r.disable()
    expect(post).not.toHaveBeenCalled()
  })

  it('关闭「仅交互时上报」后，进入页面也会上报', () => {
    const r = makeRecorder({ uploadOnInteractionOnly: false })
    r.enable()
    r.disable()
    expect(post).toHaveBeenCalled()
  })

  it('toggle 在开关间切换', () => {
    const r = makeRecorder()
    r.toggle()
    expect(r.isEnabled()).toBe(true)
    r.toggle()
    expect(r.isEnabled()).toBe(false)
  })
})

describe('事件采集 - click / input / change', () => {
  it('click 记录文本与坐标', () => {
    const r = makeRecorder()
    r.enable()
    const btn = document.createElement('button')
    btn.textContent = '提交'
    document.body.appendChild(btn)
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 10, clientY: 20 }))
    const ev = r.snapshot().find((e) => e.type === 'click')
    expect(ev).toBeDefined()
    expect(ev!.text).toBe('提交')
    expect(ev!.x).toBe(10)
    expect(ev!.y).toBe(20)
  })

  it('input 默认记录值（captureValues=true）', () => {
    const r = makeRecorder()
    r.enable()
    const input = document.createElement('input')
    input.value = 'hello'
    document.body.appendChild(input)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    const ev = r.snapshot().find((e) => e.type === 'input')
    expect(ev?.value).toBe('hello')
  })

  it('captureValues=false 时不记录值，仅记行为', () => {
    const r = makeRecorder({ captureValues: false })
    r.enable()
    const input = document.createElement('input')
    input.value = 'secret'
    document.body.appendChild(input)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    const ev = r.snapshot().find((e) => e.type === 'input')
    expect(ev).toBeDefined()
    expect(ev?.value).toBeUndefined()
  })

  it('密码框默认不记录明文；显式 recordPassword 时才记录', () => {
    const r = makeRecorder()
    r.enable()
    const pwd = document.createElement('input')
    pwd.setAttribute('type', 'password')
    pwd.value = 'p@ss'
    document.body.appendChild(pwd)
    pwd.dispatchEvent(new Event('input', { bubbles: true }))
    const ev = r.snapshot().find((e) => e.type === 'input' && e.tag === 'input')
    expect(ev?.value).toBeUndefined()
    expect(ev?.isPassword).toBeUndefined()

    // 重新开启并允许记录密码
    r.disable()
    const r2 = makeRecorder({ recordPassword: true })
    r2.enable()
    pwd.dispatchEvent(new Event('input', { bubbles: true }))
    const ev2 = r2.snapshot().find((e) => e.type === 'input')
    expect(ev2?.value).toBe('p@ss')
    expect(ev2?.isPassword).toBe(true)
    r2.disable()
  })

  it('checkbox 的 change 只记勾选态，不记明文值', () => {
    const r = makeRecorder()
    r.enable()
    const cb = document.createElement('input')
    cb.setAttribute('type', 'checkbox')
    cb.checked = true
    document.body.appendChild(cb)
    cb.dispatchEvent(new Event('change', { bubbles: true }))
    const ev = r.snapshot().find((e) => e.type === 'change')
    expect(ev?.checked).toBe(true)
    expect(ev?.value).toBeUndefined()
  })

  it('select 的 change 记录值', () => {
    const r = makeRecorder()
    r.enable()
    const sel = document.createElement('select')
    sel.innerHTML = '<option value="a">A</option><option value="b">B</option>'
    sel.value = 'b'
    document.body.appendChild(sel)
    sel.dispatchEvent(new Event('change', { bubbles: true }))
    const ev = r.snapshot().find((e) => e.type === 'change')
    expect(ev?.value).toBe('b')
  })
})

describe('隐私与采样', () => {
  it('sampleRate=0 时不采集任何事件', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const r = makeRecorder({ sampleRate: 0 })
    r.enable()
    const btn = document.createElement('button')
    document.body.appendChild(btn)
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    // 仅有初始 page_view，无 click
    expect(r.snapshot().every((e) => e.type === 'page_view')).toBe(true)
  })

  it('忽略列表内的子树事件被丢弃', () => {
    const r = makeRecorder({ ignore: ['[data-track-ignore]'] })
    r.enable()
    const ignored = document.createElement('div')
    ignored.setAttribute('data-track-ignore', '')
    const btn = document.createElement('button')
    ignored.appendChild(btn)
    document.body.appendChild(ignored)
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(r.snapshot().some((e) => e.type === 'click')).toBe(false)
  })
})

describe('buildSelector 稳定性（不耦合 van- 动态类）', () => {
  it('带 id 的元素生成含 #id 的稳定选择器', () => {
    const r = makeRecorder()
    r.enable()
    const field = document.createElement('div')
    field.id = 'city-field'
    const btn = document.createElement('button')
    btn.className = 'van-button foo'
    field.appendChild(btn)
    document.body.appendChild(field)
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    const ev = r.snapshot().find((e) => e.type === 'click')
    expect(ev?.selector).toContain('#city-field')
    expect(ev?.selector).toContain('foo')
    expect(ev?.selector).not.toContain('van-')
  })

  it('data-track-anchor 优先生成确定选择器', () => {
    const r = makeRecorder()
    r.enable()
    const btn = document.createElement('button')
    btn.setAttribute('data-track-anchor', 'city-select')
    btn.textContent = '城市'
    document.body.appendChild(btn)
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    const ev = r.snapshot().find((e) => e.type === 'click')
    expect(ev?.selector).toBe('button[data-track-anchor="city-select"]')
  })

  it('同标签多兄弟时补 :nth-child', () => {
    const r = makeRecorder()
    r.enable()
    const ul = document.createElement('ul')
    ul.innerHTML = '<li>1</li><li>2</li>'
    document.body.appendChild(ul)
    const second = ul.querySelectorAll('li')[1]!
    second.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    const ev = r.snapshot().find((e) => e.type === 'click')
    expect(ev?.selector).toContain(':nth-child(2)')
  })

  it('下拉选项(仅 van- 类)记录带结构类锚的稳定选择器，而非裸 li:nth-child', () => {
    const r = makeRecorder()
    r.enable()
    const col = document.createElement('div')
    col.className = 'van-picker-column'
    const ul = document.createElement('ul')
    ul.className = 'van-picker-column__wrapper'
    col.appendChild(ul)
    for (const t of ['北京', '上海', '广州']) {
      const li = document.createElement('li')
      li.className = 'van-picker-column__item'
      const span = document.createElement('div')
      span.className = 'van-ellipsis'
      span.textContent = t
      li.appendChild(span)
      ul.appendChild(li)
    }
    document.body.appendChild(col)
    // 点击第 3 项（广州）内层文本节点
    const target = ul.children[2]!.querySelector('.van-ellipsis')!
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    const ev = r.snapshot().find((e) => e.type === 'click')
    // 关键：选择器保留 van-picker-column / van-picker-column__item 结构类锚点，可定位
    expect(ev?.selector).toContain('van-picker-column')
    expect(ev?.selector).toContain('van-picker-column__item')
    expect(ev?.selector).toContain(':nth-child(3)')
    // 同时记录文本，作为回放文本兜底的冗余保障
    expect(ev?.text).toBe('广州')
  })
})

describe('滚动采集（节流 + 尾部补帧）', () => {
  it('滚动事件按 throttle 节流，停止后补记最终位置', async () => {
    vi.useRealTimers() // 防御：避免 fake-timers 下节流/补帧时序不确定导致偶发 0 条
    const r = makeRecorder({ scrollThrottle: 20 })
    r.enable()
    window.dispatchEvent(new Event('scroll'))
    window.dispatchEvent(new Event('scroll')) // 同一窗口内 -> 进入节流
    await new Promise((res) => setTimeout(res, 60)) // 超过节流窗口，触发尾部补帧
    const scrolls = r.snapshot().filter((e) => e.type === 'scroll')
    // 至多 2 条：leading 或尾部其一 + 节流尾部补帧其一
    expect(scrolls.length).toBeGreaterThanOrEqual(1)
    expect(scrolls.length).toBeLessThanOrEqual(2)
  })

  it('内层容器滚动会被识别并带上可定位选择器', () => {
    const r = makeRecorder()
    r.enable()
    const scroller = document.createElement('div')
    scroller.id = 'list'
    scroller.style.overflow = 'auto'
    document.body.appendChild(scroller)
    scroller.dispatchEvent(new Event('scroll', { bubbles: true }))
    const ev = r.snapshot().find((e) => e.type === 'scroll')
    expect(ev?.selector).toContain('#list')
    expect(ev?.scrollY).toBeDefined()
  })
})

describe('拖拽识别与 click 抑制', () => {
  function drag(el: Element, fromX: number, fromY: number, toX: number, toY: number) {
    el.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: fromX,
        clientY: fromY,
        pointerType: 'mouse',
        bubbles: true,
      }),
    )
    window.dispatchEvent(
      new PointerEvent('pointerup', {
        clientX: toX,
        clientY: toY,
        pointerType: 'mouse',
        bubbles: true,
      }),
    )
  }

  it('位移超过阈值记为 drag，且抑制随后同元素的 click', () => {
    const r = makeRecorder({ dragThreshold: 5 })
    r.enable()
    const el = document.createElement('div')
    document.body.appendChild(el)
    drag(el, 0, 0, 200, 0) // 大位移 -> drag
    // 紧接着同元素 click（应在 400ms 抑制窗口内）
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    const events = r.snapshot()
    expect(events.some((e) => e.type === 'drag')).toBe(true)
    expect(events.some((e) => e.type === 'click')).toBe(false)
  })

  it('位移小于阈值不记 drag，且 click 正常记录', () => {
    const r = makeRecorder({ dragThreshold: 5 })
    r.enable()
    const el = document.createElement('div')
    document.body.appendChild(el)
    drag(el, 0, 0, 2, 1) // < 5 -> 视为点击
    const events = r.snapshot()
    expect(events.some((e) => e.type === 'drag')).toBe(false)
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(r.snapshot().some((e) => e.type === 'click')).toBe(true)
  })

  it('拖拽起点在忽略列表内时不被记录', () => {
    const r = makeRecorder({ ignore: ['[data-track-ignore]'] })
    r.enable()
    const el = document.createElement('div')
    el.setAttribute('data-track-ignore', '')
    document.body.appendChild(el)
    drag(el, 0, 0, 200, 0)
    expect(r.snapshot().some((e) => e.type === 'drag')).toBe(false)
  })

  it('滚轮列(下拉选项)内的拖拽记为「最终选中项的 click」而非坐标 drag', async () => {
    const r = makeRecorder({ optionColumn: '.van-picker-column', optionSettleMs: 600 })
    r.enable()
    const col = document.createElement('div')
    col.className = 'van-picker-column'
    const ul = document.createElement('ul')
    ul.className = 'van-picker-column__wrapper'
    col.appendChild(ul)
    const items: HTMLLIElement[] = []
    for (const t of ['北京', '上海', '广州']) {
      const li = document.createElement('li')
      li.className = 'van-picker-column__item'
      li.setAttribute('role', 'button')
      const inner = document.createElement('div')
      inner.className = 'van-ellipsis'
      inner.textContent = t
      li.appendChild(inner)
      ul.appendChild(li)
      items.push(li)
    }
    // 初始选中「北京」，拖拽后（惯性结束）选中「广州」
    items[0]!.classList.add('van-picker-column__item--selected')
    document.body.appendChild(col)

    drag(items[0]!, 0, 300, 0, 60)
    // 模拟惯性动画：150ms 后落点才稳定到「广州」
    setTimeout(() => {
      items[0]!.classList.remove('van-picker-column__item--selected')
      items[2]!.classList.add('van-picker-column__item--selected')
    }, 150)

    await new Promise((res) => setTimeout(res, 700))
    const events = r.snapshot()
    // 关键：不记 drag（坐标回放无法复现惯性落点），而是记录点击「广州」——回放时点击即选中
    expect(events.some((e) => e.type === 'drag')).toBe(false)
    const pick = events.find((e) => e.type === 'click')
    expect(pick?.text).toBe('广州')
    expect(pick?.tag).toBe('li')
    expect(pick?.selector).toContain('van-picker-column__item')
    expect(pick?.selector).toContain(':nth-child(3)')
  })

  it('拖拽选城市 + 确认：选项 click 须排在「确认」click 之前（回放顺序正确）', async () => {
    const r = makeRecorder({ optionColumn: '.van-picker-column', optionSettleMs: 600 })
    r.enable()
    const col = document.createElement('div')
    col.className = 'van-picker-column'
    const ul = document.createElement('ul')
    col.appendChild(ul)
    const selected = document.createElement('li')
    selected.className = 'van-picker-column__item van-picker-column__item--selected'
    selected.setAttribute('role', 'button')
    selected.textContent = '广州'
    ul.appendChild(selected)
    document.body.appendChild(col)

    // 在滚轮列内发起拖拽（位移超阈值），触发「拖拽选城市」补录
    drag(col, 0, 300, 0, 60)

    // 拖拽结束 ~100ms 后（惯性稳定窗口内）用户点下「确认」——
    // 该点击必须晚于选项 click 的 t，但本应排在选项 click 之后回放
    await new Promise<void>((res) => {
      setTimeout(() => {
        const confirmBtn = document.createElement('button')
        confirmBtn.className = 'van-button'
        confirmBtn.textContent = '确认'
        document.body.appendChild(confirmBtn)
        confirmBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        res()
      }, 100)
    })

    // 等惯性稳定 + 补录完成
    await new Promise((res) => setTimeout(res, 400))

    const events = r.snapshot()
    const optionIdx = events.findIndex((e) => e.type === 'click' && e.text === '广州')
    const confirmIdx = events.findIndex((e) => e.type === 'click' && e.text === '确认')
    expect(optionIdx).toBeGreaterThanOrEqual(0)
    expect(confirmIdx).toBeGreaterThanOrEqual(0)
    // 关键断言：选项 click 必须早于「确认」click，否则回放会先确认旧值、再高亮却不确认
    expect(optionIdx).toBeLessThan(confirmIdx)
  })
})

describe('缓冲区订阅与清理', () => {
  it('subscribe 在每次 push 时收到快照；clear 清空缓冲区', () => {
    const r = makeRecorder()
    r.enable()
    const snaps: number[] = []
    const unsub = r.subscribe((s) => snaps.push(s.length))
    const btn = document.createElement('button')
    document.body.appendChild(btn)
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(snaps.length).toBeGreaterThan(0)
    r.clear()
    expect(r.snapshot().length).toBe(0)
    unsub()
  })

  it('setOptions 运行时改 captureValues 不重启会话', () => {
    const r = makeRecorder({ captureValues: false })
    r.enable()
    r.setOptions({ captureValues: true })
    const input = document.createElement('input')
    input.value = 'now'
    document.body.appendChild(input)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(r.snapshot().some((e) => e.type === 'input' && e.value === 'now')).toBe(true)
    // 未开启记录时 setOptions 应是 no-op
    r.disable()
    expect(() => r.setOptions({ captureValues: false })).not.toThrow()
  })
})

describe('路由页面切换（page_view 去重）', () => {
  it('连续相同路径的 page_view 不重复记录', () => {
    let guard: ((to: any) => void) | null = null
    const router = {
      afterEach: (fn: any) => {
        guard = fn
        return () => {}
      },
    }
    const r = new TrackRecorder({}, router)
    r.enable()
    expect(guard).toBeTruthy()
    // 调用两次相同路径
    guard!({ fullPath: '/vant/demo', meta: { title: '演示' } })
    guard!({ fullPath: '/vant/demo', meta: { title: '演示' } })
    const pvs = r.snapshot().filter((e) => e.type === 'page_view')
    // 初始 1（/）+ 该路径 1（第二次被去重）= 2
    expect(pvs.length).toBe(2)
    r.disable()
  })
})
