import { describe, it, expect, vi, beforeAll } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'

import VantUpload from '../VantUpload.vue'

const stubs = {
  'van-uploader': true,
  'van-icon': true,
  'van-loading': true,
  'van-tag': true,
  'van-button': { template: '<button><slot /></button>' },
}

beforeAll(() => {
  // jsdom 未实现 createObjectURL，测试桩避免报错
  URL.createObjectURL = vi.fn(() => 'blob:mock')
})

function file(name: string, size: number, type = 'image/png') {
  return new File([new ArrayBuffer(size)], name, { type })
}

describe('VantUpload', () => {
  it('realMaxSize 默认值：image 5 / document 10 / 自定义', () => {
    expect(
      (shallowMount(VantUpload, { global: { stubs }, props: { type: 'image' } }).vm as any)
        .realMaxSize,
    ).toBe(5)
    expect(
      (shallowMount(VantUpload, { global: { stubs }, props: { type: 'document' } }).vm as any)
        .realMaxSize,
    ).toBe(10)
    expect(
      (shallowMount(VantUpload, { global: { stubs }, props: { maxSize: 20 } }).vm as any)
        .realMaxSize,
    ).toBe(20)
  })

  it('realAccept 默认值：image image/* / document image/*,.pdf / 自定义', () => {
    expect(
      (shallowMount(VantUpload, { global: { stubs }, props: { type: 'image' } }).vm as any)
        .realAccept,
    ).toBe('image/*')
    expect(
      (shallowMount(VantUpload, { global: { stubs }, props: { type: 'document' } }).vm as any)
        .realAccept,
    ).toBe('image/*,.pdf')
    expect(
      (shallowMount(VantUpload, { global: { stubs }, props: { accept: 'image/png' } }).vm as any)
        .realAccept,
    ).toBe('image/png')
  })

  it('effectiveMaxCount：单选 1 / 多选 9 / 多选指定 maxCount', () => {
    expect((shallowMount(VantUpload, { global: { stubs } }).vm as any).effectiveMaxCount).toBe(1)
    expect(
      (shallowMount(VantUpload, { global: { stubs }, props: { multiple: true } }).vm as any)
        .effectiveMaxCount,
    ).toBe(9)
    expect(
      (
        shallowMount(VantUpload, { global: { stubs }, props: { multiple: true, maxCount: 3 } })
          .vm as any
      ).effectiveMaxCount,
    ).toBe(3)
  })

  it('formatSize 单位换算', () => {
    const vm = shallowMount(VantUpload, { global: { stubs } }).vm as any
    expect(vm.formatSize(500)).toBe('500 B')
    expect(vm.formatSize(2048)).toBe('2.0 KB')
    expect(vm.formatSize(3 * 1024 * 1024)).toBe('3.00 MB')
  })

  it('nameFromUrl 解码文件名', () => {
    const vm = shallowMount(VantUpload, { global: { stubs } }).vm as any
    expect(vm.nameFromUrl('https://x.com/a%20b.png?t=1')).toBe('a b.png')
  })

  it('docIcon 按扩展名选择图标', () => {
    const vm = shallowMount(VantUpload, { global: { stubs } }).vm as any
    expect(vm.docIcon({ name: 'a.png' })).toBe('photo-o')
    expect(vm.docIcon({ name: 'a.pdf' })).toBe('description-o')
    expect(vm.docIcon({ name: 'a.zip' })).toBe('file-o')
  })

  it('beforeRead 非图片被拒绝（image 类型）', () => {
    const wrapper = shallowMount(VantUpload, { global: { stubs }, props: { type: 'image' } })
    const ok = (wrapper.vm as any).beforeRead(file('a.txt', 100, 'text/plain'))
    expect(ok).toBe(false)
  })

  it('beforeRead 超限返回 false 并派发 oversize', () => {
    const wrapper = shallowMount(VantUpload, {
      global: { stubs },
      props: { type: 'image', maxSize: 5 },
    })
    const ok = (wrapper.vm as any).beforeRead(file('big.png', 6 * 1024 * 1024))
    expect(ok).toBe(false)
    expect(wrapper.emitted('oversize')).toBeTruthy()
  })

  it('afterRead 自定义上传成功后回写 url 并派发 success', async () => {
    const upload = vi.fn(async () => ({ url: 'http://img/x.png' }))
    const wrapper = shallowMount(VantUpload, { global: { stubs }, props: { upload } })
    // van-uploader 在真实场景下会在调用 afterRead 前把文件项压入 fileList；
    // 这里手动模拟该行为，否则 syncModel 读到的 fileList 为空，无法回写
    const item: any = { file: file('a.png', 100), status: 'uploading' }
    ;(wrapper.vm as any).fileList.push(item)
    ;(wrapper.vm as any).afterRead(item)
    await flushPromises()
    expect(upload).toHaveBeenCalled()
    // 回写作用在传入的 item 本身上
    expect(item.value).toBe('http://img/x.png')
    // 单选模式下 update:modelValue 回传字符串（非数组）
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toBe('http://img/x.png')
    expect(wrapper.emitted('success')?.[0]?.[0]).toBe('http://img/x.png')
  })

  it('removeItem 删除并派发 remove', () => {
    const wrapper = shallowMount(VantUpload, {
      global: { stubs },
      props: { modelValue: 'http://x' },
    })
    // 必须用 fileList 中真实存在的对象引用，removeItem 按引用查找
    const item = (wrapper.vm as any).fileList[0]
    ;(wrapper.vm as any).removeItem(item)
    expect(wrapper.emitted('remove')).toBeTruthy()
    expect((wrapper.vm as any).fileList.length).toBe(0)
  })

  it('toItems 由 modelValue 还原文件项', () => {
    const vm = shallowMount(VantUpload, { global: { stubs }, props: { modelValue: 'http://a' } })
      .vm as any
    expect(vm.toItems('http://a')).toEqual([
      { url: 'http://a', value: 'http://a', name: 'a', status: 'done' },
    ])
  })
})
