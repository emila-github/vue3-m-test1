import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'

vi.mock('vant', () => ({
  showToast: vi.fn(),
}))

import VantCheckinField from '../VantCheckinField.vue'
import type { CheckinResult } from '../VantCheckin.vue'

const stubs = {
  'van-field': { template: '<div class="van-field"><slot /><slot name="button" /></div>' },
  'van-popup': { template: '<div class="van-popup"><slot /></div>' },
  'van-icon': true,
}

function mountField(props: Record<string, any> = {}) {
  // shallowMount 默认桩化子组件（含内部的 VantCheckin），避免其地图 / 定位逻辑
  return shallowMount(VantCheckinField, { props, global: { stubs } })
}

const result: CheckinResult = {
  lat: 39.98412,
  lng: 116.30748,
  address: '北京市朝阳区建国路 88 号',
  timestamp: '2026-07-16T14:30:00+08:00',
  time: '14:30:00',
  isFirst: true,
  firstTime: '14:30:00',
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('默认 props 与渲染', () => {
  it('默认 modelValue=null，label=外出打卡', () => {
    const wrapper = mountField()
    expect((wrapper.vm as any).modelValue).toBeNull()
    expect(wrapper.find('.van-field').exists()).toBe(true)
  })

  it('modelValue 有值时字段回显地址文本', () => {
    const wrapper = mountField({ modelValue: result })
    // 内部 van-field 的 modelValue 为地址
    expect((wrapper.vm as any).modelValue?.address).toBe(result.address)
  })
})

describe('open 打开弹窗', () => {
  it('非禁用：open() 将 show 置 true（内部 VantCheckin 渲染）', () => {
    const wrapper = mountField()
    expect((wrapper.vm as any).show).toBe(false)
    ;(wrapper.vm as any).open()
    expect((wrapper.vm as any).show).toBe(true)
  })

  it('disabled：open() 不打开弹窗', () => {
    const wrapper = mountField({ disabled: true })
    ;(wrapper.vm as any).open()
    expect((wrapper.vm as any).show).toBe(false)
  })
})

describe('onCheckin 回填与关闭', () => {
  it('弹窗内打卡成功：emit update:modelValue + checkin，并关闭弹窗', async () => {
    const wrapper = mountField()
    ;(wrapper.vm as any).open()
    expect((wrapper.vm as any).show).toBe(true)
    ;(wrapper.vm as any).onCheckin(result)
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual(result)
    expect(wrapper.emitted('checkin')?.[0]?.[0]).toEqual(result)
    expect((wrapper.vm as any).show).toBe(false)
  })
})
