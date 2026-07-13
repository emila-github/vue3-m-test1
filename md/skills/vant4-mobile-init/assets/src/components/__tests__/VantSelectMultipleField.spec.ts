import { describe, it, expect } from 'vitest'
import { shallowMount } from '@vue/test-utils'

import VantSelectMultipleField from '../VantSelectMultipleField.vue'

const stubs = {
  'van-field': { template: '<div><slot /></div>' },
  'van-popup': { template: '<div><slot /></div>' },
  'van-checkbox-group': true,
  'van-checkbox': true,
  'van-cell': true,
  'van-icon': true,
}

const options = [
  { text: '玻璃', value: 'glass' },
  { text: '自燃', value: 'fire' },
  { text: '涉水', value: 'water' },
]

describe('VantSelectMultipleField', () => {
  it('displayText 用「、」连接已选文本', () => {
    const wrapper = shallowMount(VantSelectMultipleField, {
      global: { stubs },
      props: { options, modelValue: ['glass', 'fire'] },
    })
    expect((wrapper.vm as any).displayText).toBe('玻璃、自燃')
  })

  it('open 将 modelValue 复制到临时勾选', () => {
    const wrapper = shallowMount(VantSelectMultipleField, {
      global: { stubs },
      props: { options, modelValue: ['glass'] },
    })
    ;(wrapper.vm as any).open()
    expect((wrapper.vm as any).temp).toEqual(['glass'])
  })

  it('onConfirm 回传选中值与节点', () => {
    const wrapper = shallowMount(VantSelectMultipleField, {
      global: { stubs },
      props: { options },
    })
    ;(wrapper.vm as any).temp = ['glass', 'fire']
    ;(wrapper.vm as any).onConfirm()
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual(['glass', 'fire'])
    expect((wrapper.vm as any).show).toBe(false)
  })

  it('onClear 清空数组', () => {
    const wrapper = shallowMount(VantSelectMultipleField, {
      global: { stubs },
      props: { options, modelValue: ['glass'], clearable: true },
    })
    ;(wrapper.vm as any).onClear()
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual([])
    const change = wrapper.emitted('change')
    expect(change?.[0]?.[0]).toEqual([])
    expect(change?.[0]?.[1]).toEqual([])
  })

  it('onToggle 受 max 限制：达上限后不可再增', () => {
    const wrapper = shallowMount(VantSelectMultipleField, {
      global: { stubs },
      props: { options, modelValue: [], max: 2 },
    })
    const vm = wrapper.vm as any
    vm.open()
    vm.temp = ['glass', 'fire'] // 已达上限
    expect(vm.reachedMax).toBe(true)
    vm.onToggle('water') // 超限，忽略
    expect(vm.temp).toEqual(['glass', 'fire'])
    vm.onToggle('glass') // 已选则取消
    expect(vm.temp).toEqual(['fire'])
  })
})
