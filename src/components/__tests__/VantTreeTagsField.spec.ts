import { describe, it, expect } from 'vitest'
import { shallowMount } from '@vue/test-utils'

import VantTreeTagsField from '../VantTreeTagsField.vue'

const stubs = {
  'van-field': { template: '<div><slot /></div>' },
  'van-popup': { template: '<div><slot /></div>' },
  'van-tag': true,
  'van-icon': true,
  'van-button': { template: '<button><slot /></button>' },
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

describe('VantTreeTagsField', () => {
  it('selectedTags / displayText 根据 modelValue 回显', () => {
    const wrapper = shallowMount(VantTreeTagsField, {
      global: { stubs },
      props: { options: tree, modelValue: ['hz', 'nj'] },
    })
    expect((wrapper.vm as any).selectedTags.map((t: any) => t.text)).toEqual(['杭州', '南京'])
    expect((wrapper.vm as any).displayText).toBe('已选 2 项')
  })

  it('showPath 显示完整路径', () => {
    const wrapper = shallowMount(VantTreeTagsField, {
      global: { stubs },
      props: { options: tree, modelValue: ['hz'], showPath: true },
    })
    expect((wrapper.vm as any).selectedTags[0].text).toBe('浙江 / 杭州')
  })

  it('open 复制 modelValue 到临时勾选并展开第一层', () => {
    const wrapper = shallowMount(VantTreeTagsField, {
      global: { stubs },
      props: { options: tree, modelValue: ['hz'] },
    })
    ;(wrapper.vm as any).open()
    expect((wrapper.vm as any).tempSelected).toEqual(['hz'])
    expect((wrapper.vm as any).expanded.has('zj')).toBe(true)
  })

  it('toggle 增删临时勾选', () => {
    const wrapper = shallowMount(VantTreeTagsField, {
      global: { stubs },
      props: { options: tree },
    })
    const vm = wrapper.vm as any
    vm.open()
    vm.tempSelected = []
    vm.toggle('hz')
    expect(vm.tempSelected).toContain('hz')
    vm.toggle('hz')
    expect(vm.tempSelected).not.toContain('hz')
  })

  it('confirm 回传选中值与节点', () => {
    const wrapper = shallowMount(VantTreeTagsField, {
      global: { stubs },
      props: { options: tree },
    })
    const vm = wrapper.vm as any
    vm.open()
    vm.tempSelected = ['hz', 'nj']
    vm.confirm()
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual(['hz', 'nj'])
    expect((wrapper.vm as any).show).toBe(false)
  })

  it('remove 删除单个标签', () => {
    const wrapper = shallowMount(VantTreeTagsField, {
      global: { stubs },
      props: { options: tree, modelValue: ['hz', 'nj'] },
    })
    ;(wrapper.vm as any).remove('hz')
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual(['nj'])
  })

  it('onClear 清空', () => {
    const wrapper = shallowMount(VantTreeTagsField, {
      global: { stubs },
      props: { options: tree, modelValue: ['hz'], clearable: true },
    })
    ;(wrapper.vm as any).onClear()
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual([])
  })

  it('isDisabled：关闭父级可选时父节点不可勾选', () => {
    const wrapper = shallowMount(VantTreeTagsField, {
      global: { stubs },
      props: { options: tree, selectParent: false },
    })
    const vm = wrapper.vm as any
    expect(vm.isDisabled('zj', true)).toBe(true) // 父节点，不可勾选
    expect(vm.isDisabled('hz', false)).toBe(false) // 叶子，可勾选
  })

  it('onRowClick 在关闭父级可选时点击父节点仅展开', () => {
    const wrapper = shallowMount(VantTreeTagsField, {
      global: { stubs },
      props: { options: tree, selectParent: false },
    })
    const vm = wrapper.vm as any
    // 从折叠态开始（open() 会先展开第一层，点击会折叠回去），验证“点击父节点仅展开”
    vm.expanded = new Set()
    vm.tempSelected = []
    vm.onRowClick({
      node: { text: '浙江', value: 'zj' },
      depth: 0,
      hasChildren: true,
      expanded: false,
    })
    // 不应勾选父节点，仅展开
    expect(vm.tempSelected).not.toContain('zj')
    expect(vm.expanded.has('zj')).toBe(true)
  })
})
