import { describe, it, expect } from 'vitest'
import { shallowMount } from '@vue/test-utils'

import VantSelectField from '../VantSelectField.vue'

const stubs = {
  'van-field': { template: '<div><slot /></div>' },
  'van-popup': { template: '<div><slot /></div>' },
  'van-picker': true,
  'van-icon': true,
}

describe('VantSelectField', () => {
  it('normalized 支持字符串数组 / 对象数组 / format', () => {
    const wrapper = shallowMount(VantSelectField, {
      global: { stubs },
      props: {
        options: ['宝马', '奔驰'],
      },
    })
    expect((wrapper.vm as any).normalized).toEqual([
      { text: '宝马', value: '宝马' },
      { text: '奔驰', value: '奔驰' },
    ])

    const w2 = shallowMount(VantSelectField, {
      global: { stubs },
      props: {
        options: [
          { name: '浙江', code: 'zj' },
          { name: '江苏', code: 'js' },
        ],
        labelKey: 'name',
        valueKey: 'code',
      },
    })
    expect((wrapper.vm as any) && (w2.vm as any).normalized).toEqual([
      { text: '浙江', value: 'zj' },
      { text: '江苏', value: 'js' },
    ])

    const w3 = shallowMount(VantSelectField, {
      global: { stubs },
      props: {
        options: [{ label: 'A', id: 1 }],
        format: (o: any) => ({ text: o.label, value: o.id }),
      },
    })
    expect((w3.vm as any).normalized).toEqual([{ text: 'A', value: 1 }])
  })

  it('displayText 根据 modelValue 匹配文本', () => {
    const wrapper = shallowMount(VantSelectField, {
      global: { stubs },
      props: { options: [{ text: '北京', value: 'bj' }], modelValue: 'bj' },
    })
    expect((wrapper.vm as any).displayText).toBe('北京')
  })

  it('open 设置 pickerValue 定位当前值', () => {
    const wrapper = shallowMount(VantSelectField, {
      global: { stubs },
      props: { options: [{ text: '北京', value: 'bj' }], modelValue: 'bj' },
    })
    ;(wrapper.vm as any).open()
    expect((wrapper.vm as any).show).toBe(true)
    expect((wrapper.vm as any).pickerValue).toEqual(['bj'])
  })

  it('open 在清空态时 pickerValue 为空', () => {
    const wrapper = shallowMount(VantSelectField, { global: { stubs }, props: { modelValue: '' } })
    ;(wrapper.vm as any).open()
    expect((wrapper.vm as any).pickerValue).toEqual([])
  })

  it('onConfirm 回传选中值', () => {
    const wrapper = shallowMount(VantSelectField, { global: { stubs } })
    ;(wrapper.vm as any).onConfirm({ selectedOptions: [{ text: '北京', value: 'bj' }] })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['bj'])
    expect(wrapper.emitted('change')?.[0]).toEqual(['bj', { text: '北京', value: 'bj' }])
    expect((wrapper.vm as any).show).toBe(false)
  })

  it('onClear 清空值', () => {
    const wrapper = shallowMount(VantSelectField, {
      global: { stubs },
      props: { modelValue: 'bj', clearable: true },
    })
    ;(wrapper.vm as any).onClear()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([''])
    expect(wrapper.emitted('change')?.[0]).toEqual(['', null])
  })
})
