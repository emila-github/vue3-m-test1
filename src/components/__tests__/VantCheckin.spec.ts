import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'

// 避免 jsdom 下 showToast 副作用；定位相关网络请求不在单测范围
vi.mock('vant', () => ({
  showToast: vi.fn(),
  showLoadingToast: vi.fn(),
  closeToast: vi.fn(),
}))

import VantCheckin from '../VantCheckin.vue'
import type { CheckinResult } from '../VantCheckin.vue'

const stubs = {
  'van-nav-bar': true,
  'van-loading': true,
  'van-icon': true,
  'van-button': true,
  'van-cell-group': true,
  'van-cell': true,
}

/** 默认关闭自动定位与地图，避免测试期间发起网络请求 */
function mountCheckin(props: Record<string, any> = {}) {
  return shallowMount(VantCheckin, {
    props: { autoLocate: false, mapKey: '', ...props },
    global: { stubs },
  })
}

const sample: CheckinResult = {
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

describe('默认派生状态', () => {
  it('mode=once 且未打卡：canCheckin=true，按钮文案「打卡」', () => {
    const vm = mountCheckin().vm as any
    expect(vm.canCheckin).toBe(true)
    expect(vm.checkinBtnText).toBe('打卡')
    expect(vm.checkinBtnSub).toContain('点击定位打卡')
    expect(vm.ringColor).toBe('#1989fa')
    expect(vm.checkedIn).toBe(false)
  })

  it('mode=multiple：canCheckin 恒为 true', () => {
    expect((mountCheckin({ mode: 'multiple' }).vm as any).canCheckin).toBe(true)
  })
})

describe('modelValue 回填预览', () => {
  it('传入 modelValue：checkedIn=true、history 含一条、once 模式 canCheckin=false', () => {
    const vm = mountCheckin({ modelValue: sample }).vm as any
    expect(vm.checkedIn).toBe(true)
    expect(vm.history).toHaveLength(1)
    expect(vm.history[0].address).toBe(sample.address)
    expect(vm.canCheckin).toBe(false) // once 模式打卡后置灰
  })

  it('未传 modelValue：checkedIn=false，history 为空', () => {
    const vm = mountCheckin().vm as any
    expect(vm.checkedIn).toBe(false)
    expect(vm.history).toHaveLength(0)
  })
})

describe('reset / 暴露方法', () => {
  it('reset() 将 checkedIn 置回 false', () => {
    const vm = mountCheckin({ modelValue: sample }).vm as any
    expect(vm.checkedIn).toBe(true)
    vm.reset()
    expect(vm.checkedIn).toBe(false)
  })

  it('defineExpose 暴露核心方法', () => {
    const vm = mountCheckin().vm as any
    for (const fn of ['doLocate', 'retryLocate', 'initTMap', 'setMapCenter', 'reset']) {
      expect(typeof vm[fn]).toBe('function')
    }
  })
})

describe('禁用与打卡守卫', () => {
  it('disabled=true：handleCheckin 直接返回不抛错、checkedIn 不变', () => {
    const vm = mountCheckin({ disabled: true }).vm as any
    expect(() => vm.handleCheckin()).not.toThrow()
    expect(vm.checkedIn).toBe(false)
  })

  it('canCheckin=false（once 已打卡）时 handleCheckin 不重复打卡', () => {
    const vm = mountCheckin({ modelValue: sample }).vm as any
    expect(vm.canCheckin).toBe(false)
    expect(() => vm.handleCheckin()).not.toThrow()
  })
})
