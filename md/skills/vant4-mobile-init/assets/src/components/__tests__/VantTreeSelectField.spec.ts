import { describe, it, expect } from 'vitest'
import { shallowMount } from '@vue/test-utils'

import VantTreeSelectField from '../VantTreeSelectField.vue'

const stubs = {
  'van-field': { template: '<div><slot /></div>' },
  'van-popup': { template: '<div><slot /></div>' },
  'van-cascader': true,
  'van-icon': true,
}

const tree = [
  {
    text: '浙江',
    value: 'zj',
    children: [
      { text: '杭州', value: 'hz' },
      { text: '宁波', value: 'nb' },
    ],
  },
  { text: '江苏', value: 'js', children: [{ text: '南京', value: 'nj' }] },
]

describe('VantTreeSelectField', () => {
  it('displayText 用分隔符连接完整路径', () => {
    const wrapper = shallowMount(VantTreeSelectField, {
      global: { stubs },
      props: { options: tree, modelValue: 'hz' },
    })
    expect((wrapper.vm as any).displayText).toBe('浙江 / 杭州')
  })

  it('fieldNames 透传字段映射', () => {
    const wrapper = shallowMount(VantTreeSelectField, {
      global: { stubs },
      props: { options: tree, labelKey: 'name', valueKey: 'code', childrenKey: 'subs' },
    })
    expect((wrapper.vm as any).fieldNames).toEqual({
      text: 'name',
      value: 'code',
      children: 'subs',
    })
  })

  it('maxDepth 裁剪：超过最大层级的节点变为叶子', () => {
    const deep = [
      {
        text: 'A',
        value: 'a',
        children: [{ text: 'B', value: 'b', children: [{ text: 'C', value: 'c' }] }],
      },
    ]
    const wrapper = shallowMount(VantTreeSelectField, {
      global: { stubs },
      props: { options: deep, maxDepth: 2 },
    })
    const out = (wrapper.vm as any).processedOptions
    // depth1 a 仍含 children；depth2 b 在其 maxDepth(2) 处被裁剪掉 children
    expect(out[0].children[0].children).toBeUndefined()
    expect(out[0].children[0].text).toBe('B')
  })

  it('selectParent 为每级父节点追加「选择本级」虚拟项', () => {
    const wrapper = shallowMount(VantTreeSelectField, {
      global: { stubs },
      props: { options: tree, selectParent: true },
    })
    const out = (wrapper.vm as any).processedOptions
    const virtual = out[0].children[out[0].children.length - 1]
    expect(virtual.value).toBe('zj') // 与父节点同值
    expect(virtual.text).toContain('浙江')
  })

  it('onFinish 按原始树反查路径（不受虚拟项污染）', () => {
    const wrapper = shallowMount(VantTreeSelectField, {
      global: { stubs },
      props: { options: tree, selectParent: true },
    })
    ;(wrapper.vm as any).onFinish({ value: 'hz', selectedOptions: [] })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['hz'])
    const path = wrapper.emitted('change')?.[0]?.[1] as any[]
    expect(path.map((n: any) => n.text)).toEqual(['浙江', '杭州'])
  })

  it('open 定位 cascaderValue', () => {
    const wrapper = shallowMount(VantTreeSelectField, {
      global: { stubs },
      props: { options: tree, modelValue: 'hz' },
    })
    ;(wrapper.vm as any).open()
    expect((wrapper.vm as any).cascaderValue).toBe('hz')
  })

  it('onClear 清空', () => {
    const wrapper = shallowMount(VantTreeSelectField, {
      global: { stubs },
      props: { options: tree, modelValue: 'hz', clearable: true },
    })
    ;(wrapper.vm as any).onClear()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([''])
    expect(wrapper.emitted('change')?.[0]).toEqual(['', []])
  })
})
