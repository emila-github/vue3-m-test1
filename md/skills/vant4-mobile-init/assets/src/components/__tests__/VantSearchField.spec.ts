import { describe, it, expect, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'

import VantSearchField from '../VantSearchField.vue'

const stubs = {
  'van-field': { template: '<div><slot /></div>' },
  'van-popup': { template: '<div><slot /></div>' },
  'van-search': { template: '<div><slot /></div>' },
  'van-icon': true,
}

const options = [
  { text: '北京', value: 'bj' },
  { text: '上海', value: 'sh' },
]

describe('VantSearchField', () => {
  it('displayText 根据 modelValue 在选项中匹配文本', () => {
    const wrapper = shallowMount(VantSearchField, {
      global: { stubs },
      props: { options, modelValue: 'bj' },
    })
    expect((wrapper.vm as any).displayText).toBe('北京')
  })

  it('open 以本地选项填充结果（无 fetch 时）', () => {
    const wrapper = shallowMount(VantSearchField, {
      global: { stubs },
      props: { options, modelValue: 'bj' },
    })
    ;(wrapper.vm as any).open()
    expect((wrapper.vm as any).show).toBe(true)
    expect((wrapper.vm as any).results).toEqual(options)
  })

  it('onSelect 回传 value/option 并关闭弹层', () => {
    const wrapper = shallowMount(VantSearchField, { global: { stubs }, props: { options } })
    ;(wrapper.vm as any).open()
    ;(wrapper.vm as any).onSelect({ text: '上海', value: 'sh' })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['sh'])
    expect(wrapper.emitted('change')?.[0]).toEqual(['sh', { text: '上海', value: 'sh' }])
    expect(wrapper.emitted('select')?.[0]).toEqual(['sh', { text: '上海', value: 'sh' }])
    expect((wrapper.vm as any).show).toBe(false)
  })

  it('onClear 清空值', () => {
    const wrapper = shallowMount(VantSearchField, {
      global: { stubs },
      props: { options, modelValue: 'bj', clearable: true },
    })
    ;(wrapper.vm as any).onClear()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([''])
    expect(wrapper.emitted('change')?.[0]).toEqual(['', null])
  })

  it('showClear：有值且 clearable 时显示', async () => {
    const wrapper = shallowMount(VantSearchField, {
      global: { stubs },
      props: { options, modelValue: 'bj', clearable: true },
    })
    expect((wrapper.vm as any).showClear).toBe(true)
    await wrapper.setProps({ modelValue: '' })
    expect((wrapper.vm as any).showClear).toBe(false)
  })
})
