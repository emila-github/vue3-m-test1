import { describe, it, expect } from 'vitest'
import { shallowMount } from '@vue/test-utils'

import VantCalendarField from '../VantCalendarField.vue'

const stubs = {
  'van-field': { template: '<div><slot /></div>' },
  'van-calendar': true,
  'van-icon': true,
}

describe('VantCalendarField', () => {
  it('hasValue / displayText 随类型与值变化', () => {
    const single = shallowMount(VantCalendarField, {
      global: { stubs },
      props: { type: 'single', modelValue: '2026-07-10' },
    })
    expect((single.vm as any).hasValue).toBe(true)
    expect((single.vm as any).displayText).toBe('2026-07-10')

    const range = shallowMount(VantCalendarField, {
      global: { stubs },
      props: { type: 'range', modelValue: ['2026-07-01', '2026-07-10'] },
    })
    expect((range.vm as any).displayText).toBe('2026-07-01 至 2026-07-10')

    const multiple = shallowMount(VantCalendarField, {
      global: { stubs },
      props: { type: 'multiple', modelValue: ['2026-07-01', '2026-07-02'] },
    })
    expect((multiple.vm as any).displayText).toBe('已选 2 个日期')
  })

  it('open 单选态将 modelValue 转为 Date', () => {
    const wrapper = shallowMount(VantCalendarField, {
      global: { stubs },
      props: { type: 'single', modelValue: '2026-07-15' },
    })
    ;(wrapper.vm as any).open()
    const v = (wrapper.vm as any).innerValue
    expect(v instanceof Date).toBe(true)
    expect(v.getFullYear()).toBe(2026)
  })

  it('onConfirm 单选回传格式化字符串', () => {
    const wrapper = shallowMount(VantCalendarField, {
      global: { stubs },
      props: { type: 'single' },
    })
    ;(wrapper.vm as any).onConfirm(new Date(2026, 6, 15))
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toBe('2026-07-15')
    expect((wrapper.vm as any).show).toBe(false)
  })

  it('onConfirm 区间回传数组', () => {
    const wrapper = shallowMount(VantCalendarField, {
      global: { stubs },
      props: { type: 'range' },
    })
    ;(wrapper.vm as any).onConfirm([new Date(2026, 6, 1), new Date(2026, 6, 10)])
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual(['2026-07-01', '2026-07-10'])
  })

  it('onConfirm 多选回传数组', () => {
    const wrapper = shallowMount(VantCalendarField, {
      global: { stubs },
      props: { type: 'multiple' },
    })
    ;(wrapper.vm as any).onConfirm([new Date(2026, 6, 1), new Date(2026, 6, 2)])
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual(['2026-07-01', '2026-07-02'])
  })

  it('onClear 按类型清空', () => {
    const single = shallowMount(VantCalendarField, {
      global: { stubs },
      props: { type: 'single', modelValue: '2026-07-15', clearable: true },
    })
    ;(single.vm as any).onClear()
    expect(single.emitted('update:modelValue')?.[0]?.[0]).toBe('')

    const multi = shallowMount(VantCalendarField, {
      global: { stubs },
      props: { type: 'multiple', modelValue: ['2026-07-15'], clearable: true },
    })
    ;(multi.vm as any).onClear()
    expect(multi.emitted('update:modelValue')?.[0]?.[0]).toEqual([])
  })
})
