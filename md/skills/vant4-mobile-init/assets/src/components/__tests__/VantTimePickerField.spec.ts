import { describe, it, expect } from 'vitest'
import { shallowMount } from '@vue/test-utils'

import VantTimePickerField from '../VantTimePickerField.vue'

const stubs = {
  'van-field': { template: '<div><slot /></div>' },
  'van-popup': { template: '<div><slot /></div>' },
  'van-time-picker': true,
  'van-date-picker': true,
  'van-icon': true,
}

describe('VantTimePickerField', () => {
  it('isTime 随 type 变化', () => {
    const t = shallowMount(VantTimePickerField, { global: { stubs }, props: { type: 'time' } })
    expect((t.vm as any).isTime).toBe(true)
    const d = shallowMount(VantTimePickerField, { global: { stubs }, props: { type: 'date' } })
    expect((d.vm as any).isTime).toBe(false)
  })

  it('displayText 直接回显 modelValue', () => {
    const wrapper = shallowMount(VantTimePickerField, {
      global: { stubs },
      props: { modelValue: '09:30' },
    })
    expect((wrapper.vm as any).displayText).toBe('09:30')
  })

  it('open 按类型定位 pickerValue', () => {
    const time = shallowMount(VantTimePickerField, {
      global: { stubs },
      props: { type: 'time', modelValue: '09:30' },
    })
    time.vm.open?.()
    ;(time.vm as any).open()
    expect((time.vm as any).pickerValue).toEqual(['09', '30'])

    const date = shallowMount(VantTimePickerField, {
      global: { stubs },
      props: { type: 'date', modelValue: '2026-07-10' },
    })
    ;(date.vm as any).open()
    expect((date.vm as any).pickerValue).toEqual(['2026', '07', '10'])
  })

  it('onConfirm time 返回 HH:mm', () => {
    const wrapper = shallowMount(VantTimePickerField, {
      global: { stubs },
      props: { type: 'time' },
    })
    ;(wrapper.vm as any).onConfirm({ selectedValues: ['09', '30'] })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['09:30'])
  })

  it('onConfirm date 返回 YYYY-MM-DD', () => {
    const wrapper = shallowMount(VantTimePickerField, {
      global: { stubs },
      props: { type: 'date' },
    })
    ;(wrapper.vm as any).onConfirm({ selectedValues: ['2026', '07', '10'] })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['2026-07-10'])
  })

  it('onConfirm year-month 返回 YYYY-MM', () => {
    const wrapper = shallowMount(VantTimePickerField, {
      global: { stubs },
      props: { type: 'year-month' },
    })
    ;(wrapper.vm as any).onConfirm({ selectedValues: ['2026', '07'] })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['2026-07'])
  })

  it('onClear 清空值', () => {
    const wrapper = shallowMount(VantTimePickerField, {
      global: { stubs },
      props: { modelValue: '09:30', clearable: true },
    })
    ;(wrapper.vm as any).onClear()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([''])
  })

  it('columnsType：year-month 仅含年月', () => {
    const wrapper = shallowMount(VantTimePickerField, {
      global: { stubs },
      props: { type: 'year-month' },
    })
    expect((wrapper.vm as any).columnsType).toEqual(['year', 'month'])
  })
})
