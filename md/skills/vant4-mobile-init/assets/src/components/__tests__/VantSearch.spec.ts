import { describe, it, expect, vi } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'

import VantSearch from '../VantSearch.vue'

const stubs = {
  'van-search': { template: '<div><slot /></div>' },
  'van-icon': true,
}

describe('VantSearch', () => {
  it('onSelect 选中后回传 value/option 并同步关键字', async () => {
    const wrapper = shallowMount(VantSearch, { global: { stubs } })
    ;(wrapper.vm as any).onSelect({ text: '北京', value: 'bj' })
    expect(wrapper.emitted('select')?.[0]).toEqual(['bj', { text: '北京', value: 'bj' }])
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['北京'])
    expect((wrapper.vm as any).keyword).toBe('北京')
  })

  it('onSearch 立即搜索并归一化结果（字符串数组）', async () => {
    const fetch = vi.fn(async (kw: string) => [kw, `${kw}-2`])
    const wrapper = shallowMount(VantSearch, {
      global: { stubs },
      props: { fetch, minLength: 1, debounce: 0 },
    })
    ;(wrapper.vm as any).keyword = 'be'
    ;(wrapper.vm as any).onSearch()
    expect(wrapper.emitted('search')?.[0]).toEqual(['be'])
    await flushPromises()
    const results = (wrapper.vm as any).results
    expect(results).toEqual([
      { text: 'be', value: 'be' },
      { text: 'be-2', value: 'be-2' },
    ])
    expect(wrapper.emitted('update:results')?.[0]?.[0]).toEqual(results)
  })

  it('归一化支持 labelKey / valueKey', async () => {
    const fetch = vi.fn(async () => [
      { name: '浙江', code: 'zj' },
      { name: '江苏', code: 'js' },
    ])
    const wrapper = shallowMount(VantSearch, {
      global: { stubs },
      props: { fetch, labelKey: 'name', valueKey: 'code' },
    })
    ;(wrapper.vm as any).keyword = 'x'
    ;(wrapper.vm as any).onSearch()
    await flushPromises()
    expect((wrapper.vm as any).results).toEqual([
      { text: '浙江', value: 'zj' },
      { text: '江苏', value: 'js' },
    ])
  })

  it('归一化支持完全自定义 format', async () => {
    const fetch = vi.fn(async () => [
      { label: 'A', id: 1 },
      { label: 'B', id: 2 },
    ])
    const wrapper = shallowMount(VantSearch, {
      global: { stubs },
      props: {
        fetch,
        format: (o: any) => ({ text: o.label, value: o.id }),
      },
    })
    ;(wrapper.vm as any).keyword = 'x'
    ;(wrapper.vm as any).onSearch()
    await flushPromises()
    expect((wrapper.vm as any).results).toEqual([
      { text: 'A', value: 1 },
      { text: 'B', value: 2 },
    ])
  })

  it('竞态保护：仅采用最后一次请求结果', async () => {
    const fetch = vi.fn(async (kw: string) => [{ text: kw, value: kw }])
    const wrapper = shallowMount(VantSearch, {
      global: { stubs },
      props: { fetch, debounce: 0 },
    })
    ;(wrapper.vm as any).keyword = 'a'
    ;(wrapper.vm as any).onSearch()
    ;(wrapper.vm as any).keyword = 'b'
    ;(wrapper.vm as any).onSearch()
    await flushPromises()
    expect((wrapper.vm as any).results).toEqual([{ text: 'b', value: 'b' }])
  })

  it('showPanel：聚焦 + 已达最小长度 + 已搜索时显示；禁用时不显示', async () => {
    const wrapper = shallowMount(VantSearch, { global: { stubs }, props: { minLength: 1 } })
    ;(wrapper.vm as any).focused = true
    ;(wrapper.vm as any).keyword = 'ab'
    ;(wrapper.vm as any).searched = true
    expect((wrapper.vm as any).showPanel).toBe(true)
    await wrapper.setProps({ disabled: true })
    expect((wrapper.vm as any).showPanel).toBe(false)
  })
})
