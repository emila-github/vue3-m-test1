import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { replayTrackEvents } from '../replay'

const origClick = HTMLElement.prototype.click
function spyClicks(collect: (tag: string, text: string, role: string | null) => void) {
  HTMLElement.prototype.click = function (this: HTMLElement, ...args: any[]) {
    collect(this.tagName, (this.textContent ?? '').trim(), this.getAttribute('role'))
    return origClick.apply(this, args as any)
  }
}

const popupHtml = `
  <div class="van-popup van-popup--bottom">
    <div class="van-picker__toolbar">
      <button class="van-picker__cancel">取消</button>
      <button class="van-picker__confirm">确认</button>
    </div>
    <div class="van-picker__columns">
      <div class="van-picker-column">
        <ul class="van-picker-column__wrapper">
          <li role="button" class="van-picker-column__item"><div class="van-ellipsis">北京</div></li>
          <li role="button" class="van-picker-column__item"><div class="van-ellipsis">上海</div></li>
          <li role="button" class="van-picker-column__item"><div class="van-ellipsis">广州</div></li>
        </ul>
      </div>
    </div>
  </div>
`

describe('replay picker multi-step', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })
  afterEach(() => {
    HTMLElement.prototype.click = origClick
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('多步序列：点击字段打开弹层→选上海→确认，回放应精确点中上海项与确认按钮', () => {
    // 字段初始为空（未选），点击后打开弹层（模拟 open()）
    document.body.insertAdjacentHTML(
      'afterbegin',
      `
      <div id="track-city" data-track-anchor="city-select">
        <div class="van-cell van-field" id="field">
          <span class="van-field__label">城市</span>
          <div class="van-field__control" id="ctrl"></div>
        </div>
      </div>
    `,
    )
    const field = document.getElementById('field')!
    let selectedOption = ''
    let confirmed = false
    field.addEventListener('click', () => {
      if (!document.querySelector('.van-popup')) {
        document.body.insertAdjacentHTML('beforeend', popupHtml)
        // 弹层插入后再注册监听，模拟 Vant 选项/确认的点击处理
        document.querySelectorAll('li').forEach((li) => {
          li.addEventListener('click', () => {
            selectedOption = (li.textContent ?? '').trim()
          })
        })
        document.querySelector('.van-picker__confirm')?.addEventListener('click', () => {
          confirmed = true
        })
      }
    })

    const clicked: { tag: string; text: string; role: string | null }[] = []
    spyClicks((tag, text, role) => clicked.push({ tag, text, role }))

    // 退化 selector 模拟 van- 类被剥离；字段点击文本为「城市」
    const events = [
      { type: 'click', text: '城市', selector: '#field', t: 0 },
      { type: 'click', text: '上海', selector: 'div > li:nth-child(2) > div', t: 100 },
      { type: 'click', text: '确认', selector: 'button.van-picker__confirm', t: 200 },
    ]
    const handle = replayTrackEvents(events as any, { root: document, minStep: 10 })
    handle.play()
    // 推进时间让 step1/2/3 全部执行（每个 step 间隔 >= minStep=10）
    vi.advanceTimersByTime(200)

    console.log('CLICKED:', JSON.stringify(clicked))
    expect(selectedOption).toBe('上海')
    expect(confirmed).toBe(true)
    expect(clicked.some((c) => c.text === '上海' && c.role === 'button')).toBe(true)
    expect(clicked.some((c) => c.text === '确认')).toBe(true)
  })
})
