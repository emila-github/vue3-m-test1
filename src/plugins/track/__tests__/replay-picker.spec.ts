import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { replayTrackEvents } from '../replay'

const origClick = HTMLElement.prototype.click
function spyClicks(collect: (tag: string, text: string) => void) {
  HTMLElement.prototype.click = function (this: HTMLElement, ...args: any[]) {
    collect(this.tagName, (this.textContent ?? '').trim())
    return origClick.apply(this, args as any)
  }
}

describe('replay picker option click', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })
  afterEach(() => {
    HTMLElement.prototype.click = origClick
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('在已打开的 picker 弹层内，click(text=上海) 应点中上海项而非容器/主页面字段', () => {
    // 主页面有一个已显示「上海」的城市字段（模拟回放前已选过）
    document.body.insertAdjacentHTML(
      'afterbegin',
      `
      <div id="track-city" data-track-anchor="city-select">
        <div class="van-cell van-field"><span class="van-field__label">城市</span><div class="van-field__control">上海</div></div>
      </div>
    `,
    )
    // 已打开的 picker 弹层
    document.body.insertAdjacentHTML(
      'beforeend',
      `
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
    `,
    )

    const clicked: { tag: string; text: string }[] = []
    spyClicks((tag, text) => clicked.push({ tag, text }))

    const shanghaiLi = document.querySelectorAll('li')[1]!
    let optionSelected = ''
    shanghaiLi.addEventListener('click', () => {
      optionSelected = '上海'
    })

    // selector 故意退化成裸标签链（模拟 van- 类被剥离后命中主页面字段容器）
    const events = [{ type: 'click', text: '上海', selector: 'div > div > div', t: 0 }]
    const handle = replayTrackEvents(events as any, { root: document, minStep: 10 })
    handle.play()

    console.log('CLICKED:', JSON.stringify(clicked))
    expect(optionSelected).toBe('上海')
    expect(clicked.some((c) => c.text === '上海' && c.tag === 'LI')).toBe(true)
  })
})
