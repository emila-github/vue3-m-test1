import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { shallowMount, mount, flushPromises } from '@vue/test-utils'

// 测试中将 vant 的 showToast / showImagePreview 替换为桩函数，
// 既避免 jsdom 环境副作用，又便于对「放大预览」等行为做断言
vi.mock('vant', () => ({
  showToast: vi.fn(),
  showImagePreview: vi.fn(),
}))

import { showImagePreview } from 'vant'

import VantUpload from '../VantUpload.vue'

/** van 组件桩：van-uploader 需渲染 default 插槽（身份证卡片在其内部） */
const vantStubs = {
  'van-uploader': { template: '<div class="van-uploader"><slot /></div>' },
  'van-icon': { template: '<i class="van-icon"><slot /></i>' },
  'van-loading': { template: '<span class="van-loading" />' },
  // van-dialog 真实组件会 Teleport，测试不易断言；用桩渲染到组件树内便于校验弹窗内容
  'van-dialog': { template: '<div class="van-dialog"><slot /><slot name="footer" /></div>' },
}

// show-sample 测试用：让 van-uploader 桩暴露 chooseFile，便于断言示例弹窗确认后是否唤起选图
const chooseFileSpy = vi.fn()
const vanUploaderWithChoose = {
  name: 'van-uploader',
  template: '<div class="van-uploader"><slot /></div>',
  methods: { chooseFile: chooseFileSpy },
}

beforeAll(() => {
  // jsdom 未实现 ObjectURL 相关 API，测试桩避免报错并可控断言
  URL.createObjectURL = vi.fn(() => 'blob:mock')
  URL.revokeObjectURL = vi.fn()
})

beforeEach(() => {
  vi.clearAllMocks()
})

/** 生成测试用 File */
function file(name: string, size: number, type = 'image/png') {
  return new File([new ArrayBuffer(size)], name, { type })
}

/** 逻辑测试挂载（子组件自动桩化，直接访问 vm 方法 / 计算属性） */
function shallow(props: Record<string, any> = {}) {
  return shallowMount(VantUpload, {
    props,
    global: { stubs: { 'van-uploader': vanUploaderWithChoose } },
  })
}

/** 渲染测试挂载（渲染插槽内容，用于校验 DOM 结构） */
function full(props: Record<string, any> = {}) {
  return mount(VantUpload, { global: { stubs: vantStubs }, props })
}

describe('计算属性', () => {
  it('realMaxSize：image=5 / document=10 / invoice=10 / 自定义优先', () => {
    expect((shallow({ type: 'image' }).vm as any).realMaxSize).toBe(5)
    expect((shallow({ type: 'document' }).vm as any).realMaxSize).toBe(10)
    expect((shallow({ type: 'invoice' }).vm as any).realMaxSize).toBe(10)
    expect((shallow({ type: 'document', maxSize: 20 }).vm as any).realMaxSize).toBe(20)
    expect((shallow({ type: 'image', maxSize: 3 }).vm as any).realMaxSize).toBe(3)
  })

  it('realAccept：document=image/*,.pdf / image=image/* / 自定义优先', () => {
    expect((shallow({ type: 'image' }).vm as any).realAccept).toBe('image/*')
    expect((shallow({ type: 'document' }).vm as any).realAccept).toBe('image/*,.pdf')
    expect((shallow({ accept: 'image/png' }).vm as any).realAccept).toBe('image/png')
  })

  it('effectiveMaxCount：单选=maxCount / 多选默认=9 / 多选指定生效', () => {
    expect((shallow({}).vm as any).effectiveMaxCount).toBe(1)
    expect((shallow({ multiple: true }).vm as any).effectiveMaxCount).toBe(9)
    expect((shallow({ multiple: true, maxCount: 3 }).vm as any).effectiveMaxCount).toBe(3)
    // 多选时显式 maxCount=1 应被提升到 9
    expect((shallow({ multiple: true, maxCount: 1 }).vm as any).effectiveMaxCount).toBe(9)
  })

  it('previewSize：avatar=80 / idcard 全宽=[320,200] / idcard+compact=[150,95] / 其它=80', () => {
    expect((shallow({ type: 'avatar' }).vm as any).previewSize).toBe(80)
    expect((shallow({ type: 'idcard' }).vm as any).previewSize).toEqual([320, 200])
    expect((shallow({ type: 'idcard', compact: true }).vm as any).previewSize).toEqual([150, 95])
    expect((shallow({ type: 'image' }).vm as any).previewSize).toBe(80)
  })

  it('idcardCompact：仅 type=idcard 且 compact 时为 true', () => {
    expect((shallow({ type: 'idcard', compact: true }).vm as any).idcardCompact).toBe(true)
    expect((shallow({ type: 'idcard' }).vm as any).idcardCompact).toBe(false)
    expect((shallow({ type: 'image', compact: true }).vm as any).idcardCompact).toBe(false)
  })

  it('invoiceAddLarge：多张空态为 true，已有图后为 false（单选恒为 true）', async () => {
    // 单选 invoice：multiple=false → 恒为 true（大卡片常驻）
    expect((shallow({ type: 'invoice' }).vm as any).invoiceAddLarge).toBe(true)
    // 多张 invoice：空态为 true，已有图后转为小方格
    const wrapper = shallow({ type: 'invoice', multiple: true })
    const vm = wrapper.vm as any
    expect(vm.invoiceAddLarge).toBe(true)
    vm.fileList.push({ url: 'http://x', value: 'http://x', name: 'x', status: 'done' })
    await flushPromises()
    expect(vm.invoiceAddLarge).toBe(false)
  })
})

describe('工具函数', () => {
  it('formatSize 单位换算', () => {
    const vm = shallow({}).vm as any
    expect(vm.formatSize(0)).toBe('')
    expect(vm.formatSize(500)).toBe('500 B')
    expect(vm.formatSize(2048)).toBe('2.0 KB')
    expect(vm.formatSize(3 * 1024 * 1024)).toBe('3.00 MB')
  })

  it('nameFromUrl 解码文件名（含 query）', () => {
    const vm = shallow({}).vm as any
    expect(vm.nameFromUrl('https://x.com/a%20b.png?t=1')).toBe('a b.png')
    expect(vm.nameFromUrl('https://x.com/path/c.jpg')).toBe('c.jpg')
  })

  it('docIcon 按扩展名选择图标', () => {
    const vm = shallow({}).vm as any
    expect(vm.docIcon({ name: 'a.png' })).toBe('photo-o')
    expect(vm.docIcon({ name: 'a.JPG' })).toBe('photo-o')
    expect(vm.docIcon({ name: 'a.pdf' })).toBe('description-o')
    expect(vm.docIcon({ name: 'a.zip' })).toBe('file-o')
  })

  it('toItems 由 modelValue 还原文件项（单选 / 多选 / 空）', () => {
    const vm = shallow({}).vm as any
    expect(vm.toItems('http://a')).toEqual([
      { url: 'http://a', value: 'http://a', name: 'a', status: 'done' },
    ])
    expect(vm.toItems(['http://a', 'http://b'])).toEqual([
      { url: 'http://a', value: 'http://a', name: 'a', status: 'done' },
      { url: 'http://b', value: 'http://b', name: 'b', status: 'done' },
    ])
    expect(vm.toItems('')).toEqual([])
  })
})

describe('beforeRead 校验', () => {
  it('image 类型拒绝非图片（Promise reject）', async () => {
    const wrapper = shallow({ type: 'image' })
    await expect(
      (wrapper.vm as any).beforeRead(file('a.txt', 100, 'text/plain')),
    ).rejects.toBeTruthy()
  })

  it('document 类型允许非图片（resolve 该文件）', async () => {
    const f = file('a.pdf', 100, 'application/pdf')
    const r = await (shallow({ type: 'document' }).vm as any).beforeRead(f)
    expect(r).toBe(f)
  })

  it('超限 reject 并派发 oversize', async () => {
    const wrapper = shallow({ type: 'image', maxSize: 5 })
    await expect(
      (wrapper.vm as any).beforeRead(file('big.png', 6 * 1024 * 1024)),
    ).rejects.toBeTruthy()
    expect(wrapper.emitted('oversize')).toBeTruthy()
  })

  it('document 类型同样校验大小上限（超限 reject + oversize）', async () => {
    const wrapper = shallow({ type: 'document', maxSize: 5 })
    await expect(
      (wrapper.vm as any).beforeRead(file('big.pdf', 6 * 1024 * 1024, 'application/pdf')),
    ).rejects.toBeTruthy()
    expect(wrapper.emitted('oversize')).toBeTruthy()
  })

  it('兼容 File[]：逐文件处理，仅返回通过校验的文件数组', async () => {
    const r = await (shallow({ type: 'image' }).vm as any).beforeRead([
      file('a.txt', 100, 'text/plain'),
      file('b.png', 100),
    ])
    expect(Array.isArray(r)).toBe(true)
    expect(r).toHaveLength(1)
    expect(r[0].name).toBe('b.png')
  })

  it('空数组 reject（无有效文件，中止上传）', async () => {
    await expect((shallow({ type: 'image' }).vm as any).beforeRead([])).rejects.toBeTruthy()
  })

  it('合法图片 resolve 该文件且不派发 oversize', async () => {
    const wrapper = shallow({ type: 'image' })
    const f = file('ok.png', 100)
    const r = await (wrapper.vm as any).beforeRead(f)
    expect(r).toBe(f)
    expect(wrapper.emitted('oversize')).toBeFalsy()
  })
})

describe('resolveContainer 响应定位', () => {
  it('无 responsePath 直接返回原对象', () => {
    const vm = shallow({}).vm as any
    const raw = { url: 'x' }
    expect(vm.resolveContainer(raw)).toBe(raw)
    expect(vm.resolveContainer(null)).toEqual({})
  })

  it('按点号路径定位嵌套结果对象', () => {
    const vm = shallow({ responsePath: 'data.result' }).vm as any
    const raw = { code: 200, data: { result: { url: 'http://r' } } }
    expect(vm.resolveContainer(raw)).toEqual({ url: 'http://r' })
  })

  it('路径不存在时回退到原对象', () => {
    const vm = shallow({ responsePath: 'a.b.c' }).vm as any
    const raw = { code: 200 }
    expect(vm.resolveContainer(raw)).toEqual(raw)
  })
})

describe('applyUploadResult 结果适配', () => {
  it('默认 url 回写', () => {
    const vm = shallow({}).vm as any
    const it: any = { name: 'a.png', file: file('a.png', 100), status: 'uploading' }
    vm.applyUploadResult(it, { url: 'http://x' }, it.file)
    expect(it.url).toBe('http://x')
    expect(it.value).toBe('http://x')
    expect(it.status).toBe('done')
  })

  it('fieldMap 适配 url / value / name', () => {
    const vm = shallow({
      fieldMap: { url: 'imgUrl', value: 'fileId', name: 'fileName' },
    }).vm as any
    const it: any = { name: 'a.png', file: file('a.png', 100), status: 'uploading' }
    vm.applyUploadResult(it, { imgUrl: 'http://x', fileId: 'abc', fileName: 'pic.png' }, it.file)
    expect(it.url).toBe('http://x')
    expect(it.value).toBe('abc') // 取 fieldMap.value
    expect(it.name).toBe('pic.png') // 取 fieldMap.name 覆盖
  })

  it('resultField 指定回写字段（无 fieldMap 时）', () => {
    const vm = shallow({ resultField: 'base64' }).vm as any
    const it: any = { name: 'a.png', file: file('a.png', 100), status: 'uploading' }
    vm.applyUploadResult(it, { url: 'http://x', base64: 'data:xxx' }, it.file)
    expect(it.value).toBe('data:xxx') // 取 resultField
    expect(it.url).toBe('http://x')
  })

  it('base64 data URI 作为预览回退', () => {
    const vm = shallow({}).vm as any
    const it: any = { name: 'a.png', file: file('a.png', 100), status: 'uploading' }
    vm.applyUploadResult(it, { base64: 'data:image/png;base64,xxx' }, it.file)
    expect(it.url).toBe('data:image/png;base64,xxx')
    expect(it.value).toBe('data:image/png;base64,xxx')
  })

  it('无 url/base64 时回退到本地 blob 预览', () => {
    const vm = shallow({}).vm as any
    const it: any = { name: 'a.png', file: file('a.png', 100), status: 'uploading' }
    vm.applyUploadResult(it, null, it.file)
    expect(it.url).toBe('blob:mock')
    expect(it.value).toBe('blob:mock')
  })

  it('覆盖旧 blob 预览时释放（revoke）', () => {
    const vm = shallow({}).vm as any
    const it: any = {
      name: 'a.png',
      url: 'blob:old',
      file: file('a.png', 100),
      status: 'uploading',
    }
    vm.applyUploadResult(it, { url: 'http://x' }, it.file)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:old')
  })
})

describe('runUpload 上传流程', () => {
  it('自定义上传成功：回写值 + 派发 success(含第三参 result) + update:modelValue', async () => {
    const upload = vi.fn(async () => ({ url: 'http://img/x.png', fileName: 'a.png' }))
    const wrapper = shallow({ upload })
    const item: any = { file: file('a.png', 100), status: 'uploading' }
    ;(wrapper.vm as any).fileList.push(item)
    await (wrapper.vm as any).runUpload(item)
    await flushPromises()
    expect(upload).toHaveBeenCalled()
    expect(item.value).toBe('http://img/x.png')
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toBe('http://img/x.png')
    expect(wrapper.emitted('success')?.[0]?.[0]).toBe('http://img/x.png')
    expect(wrapper.emitted('success')?.[0]?.[2]).toMatchObject({ url: 'http://img/x.png' })
  })

  it('无 upload 时回退 blob 预览且不派发 success', async () => {
    const wrapper = shallow({})
    const item: any = { file: file('a.png', 100), status: 'uploading' }
    ;(wrapper.vm as any).fileList.push(item)
    await (wrapper.vm as any).runUpload(item)
    await flushPromises()
    expect(item.value).toBe('blob:mock')
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toBe('blob:mock')
    expect(wrapper.emitted('success')).toBeFalsy()
  })

  it('上传失败：状态置 failed，不派发 success', async () => {
    const upload = vi.fn(async () => {
      throw new Error('boom')
    })
    const wrapper = shallow({ upload })
    const item: any = { file: file('a.png', 100), status: 'uploading' }
    ;(wrapper.vm as any).fileList.push(item)
    await (wrapper.vm as any).runUpload(item)
    await flushPromises()
    expect(item.status).toBe('failed')
    expect(item.message).toBe('上传失败')
    expect(wrapper.emitted('success')).toBeFalsy()
  })
})

describe('afterRead 图片类', () => {
  it('多个文件各自上传并回写', async () => {
    const upload = vi.fn(async (f: File) => ({ url: `http://img/${f.name}` }))
    const wrapper = shallow({ multiple: true, upload })
    const items: any[] = [
      { file: file('a.png', 100), status: 'uploading' },
      { file: file('b.png', 100), status: 'uploading' },
    ]
    // 真实场景下 van-uploader 先把这些文件项压入 fileList 再回调 afterRead
    ;(wrapper.vm as any).fileList.push(...items)
    ;(wrapper.vm as any).afterRead(items)
    await flushPromises()
    expect(items[0].value).toBe('http://img/a.png')
    expect(items[1].value).toBe('http://img/b.png')
    expect(wrapper.emitted('success')).toHaveLength(2)
    // 多选 update:modelValue 为数组（并发上传会多次 emit，取最后一次）
    const modelEvents = wrapper.emitted('update:modelValue') || []
    expect(modelEvents.at(-1)?.[0]).toEqual(['http://img/a.png', 'http://img/b.png'])
  })

  it('单选：继续上传覆盖之前的项（保留 1 张）', async () => {
    const upload = vi.fn(async (f: File) => ({ url: `http://img/${f.name}` }))
    const wrapper = shallow({ type: 'idcard', variant: 'front', upload })
    // 已有一张
    const old: any = {
      file: file('old.png', 100),
      status: 'done',
      url: 'http://img/old.png',
      value: 'http://img/old.png',
    }
    ;(wrapper.vm as any).fileList.push(old)
    // 再次上传新图
    const neu: any = { file: file('new.png', 100), status: 'uploading' }
    ;(wrapper.vm as any).afterRead([neu])
    await flushPromises()
    // 仅保留新图（覆盖），且回写为新值
    expect((wrapper.vm as any).fileList).toHaveLength(1)
    expect((wrapper.vm as any).fileList[0].value).toBe('http://img/new.png')
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBe('http://img/new.png')
  })
})

describe('onFileChange 证件类', () => {
  function makeEvent(files: File[]) {
    return { target: { files: [...files], value: '/fake/path' } } as unknown as Event
  }

  it('正常落盘文件并回写 modelValue', async () => {
    const upload = vi.fn(async () => ({ url: 'http://x/a.pdf' }))
    const wrapper = shallow({ type: 'document', upload })
    await (wrapper.vm as any).onFileChange(makeEvent([file('a.pdf', 100, 'application/pdf')]))
    await flushPromises()
    expect((wrapper.vm as any).fileList).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toBe('http://x/a.pdf')
  })

  it('达到 maxCount 后剩余文件被拦截并提示', async () => {
    const upload = vi.fn(async () => ({ url: 'http://x' }))
    // 单选（maxCount=1）下 effectiveMaxCount=1，第二个文件应被拦截
    const wrapper = shallow({ type: 'document', maxCount: 1, upload })
    await (wrapper.vm as any).onFileChange(
      makeEvent([file('a.pdf', 100, 'application/pdf'), file('b.pdf', 100, 'application/pdf')]),
    )
    await flushPromises()
    expect((wrapper.vm as any).fileList).toHaveLength(1)
  })

  it('处理后清空 input.value，便于再次选择同名文件', async () => {
    const upload = vi.fn(async () => ({ url: 'http://x' }))
    const wrapper = shallow({ type: 'document', upload })
    const evt = makeEvent([file('a.pdf', 100, 'application/pdf')])
    await (wrapper.vm as any).onFileChange(evt)
    expect((evt.target as any).value).toBe('')
  })
})

describe('pickDocument 触发选择', () => {
  it('disabled / readonly 时直接返回，不触发点击', () => {
    const wrapper = shallow({ type: 'document', disabled: true })
    const input = (wrapper.vm as any).docInput
    const spy = input ? vi.spyOn(input, 'click') : vi.fn()
    ;(wrapper.vm as any).pickDocument()
    expect(spy).not.toHaveBeenCalled()
  })

  it('可用时调用 input.click()', () => {
    const wrapper = shallow({ type: 'document' })
    const input = (wrapper.vm as any).docInput
    const spy = vi.spyOn(input, 'click')
    ;(wrapper.vm as any).pickDocument()
    expect(spy).toHaveBeenCalled()
  })
})

describe('removeItem 删除', () => {
  it('删除文件项并派发 remove + update:modelValue', () => {
    const wrapper = shallow({ modelValue: 'http://x' })
    const item = (wrapper.vm as any).fileList[0]
    ;(wrapper.vm as any).removeItem(item)
    expect(wrapper.emitted('remove')).toBeTruthy()
    expect((wrapper.vm as any).fileList).toHaveLength(0)
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toBe('')
  })

  it('删除 blob 预览时释放（revoke）', () => {
    const wrapper = shallow({ modelValue: 'blob:todelete' })
    const item = (wrapper.vm as any).fileList[0]
    ;(wrapper.vm as any).removeItem(item)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:todelete')
  })
})

describe('modelValue 双向同步', () => {
  it('外部变更 modelValue 还原文件项', async () => {
    const wrapper = shallow({ modelValue: '' })
    await wrapper.setProps({ modelValue: 'http://new' })
    await flushPromises()
    expect((wrapper.vm as any).fileList[0]).toMatchObject({
      url: 'http://new',
      value: 'http://new',
    })
  })

  it('覆盖含 blob 的旧值时释放旧预览', async () => {
    const wrapper = shallow({ modelValue: 'blob:old' })
    await flushPromises()
    await wrapper.setProps({ modelValue: 'http://new' })
    await flushPromises()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:old')
  })

  it('change 事件返回主值与对应项', async () => {
    const upload = vi.fn(async () => ({ url: 'http://x/y.png' }))
    const wrapper = shallow({ upload })
    const item: any = { file: file('y.png', 100), status: 'uploading' }
    ;(wrapper.vm as any).fileList.push(item)
    await (wrapper.vm as any).runUpload(item)
    await flushPromises()
    const change = wrapper.emitted('change')?.[0]
    expect(change?.[0]).toBe('http://x/y.png')
    expect((change?.[1] as any)?.value).toBe('http://x/y.png')
  })
})

describe('渲染：各类型 UI', () => {
  it('idcard 人像面：渲染头像块 + "身份证人像面"标签 + 5 条字段线', () => {
    const wrapper = full({ type: 'idcard', variant: 'front' })
    expect(wrapper.find('.vuf-idcard--front').exists()).toBe(true)
    expect(wrapper.find('.vuf-idcard-photo').exists()).toBe(true)
    expect(wrapper.find('.vuf-idcard-emblem').exists()).toBe(false)
    expect(wrapper.find('.vuf-idcard-label').text()).toContain('身份证人像面')
    expect(wrapper.findAll('.vuf-idcard--front .vuf-idcard-line')).toHaveLength(5)
  })

  it('idcard 国徽面：渲染国徽块 + "身份证国徽面"标签 + 3 条字段线', () => {
    const wrapper = full({ type: 'idcard', variant: 'back' })
    expect(wrapper.find('.vuf-idcard--back').exists()).toBe(true)
    expect(wrapper.find('.vuf-idcard-emblem').exists()).toBe(true)
    expect(wrapper.find('.vuf-idcard-photo').exists()).toBe(false)
    expect(wrapper.find('.vuf-idcard-label').text()).toContain('身份证国徽面')
    expect(wrapper.findAll('.vuf-idcard--back .vuf-idcard-line')).toHaveLength(3)
  })

  it('idcard compact：根 uploader 加 idcard-compact 且卡片加 is-compact', () => {
    const wrapper = full({ type: 'idcard', variant: 'front', compact: true })
    expect(wrapper.find('.vuf-uploader--idcard.idcard-compact').exists()).toBe(true)
    expect(wrapper.find('.vuf-idcard.is-compact').exists()).toBe(true)
  })

  it('idcard 默认全宽：无 idcard-compact / is-compact 类', () => {
    const wrapper = full({ type: 'idcard', variant: 'front' })
    expect(wrapper.find('.idcard-compact').exists()).toBe(false)
    expect(wrapper.find('.vuf-idcard.is-compact').exists()).toBe(false)
  })

  it('avatar：根 uploader 加 is-round 并渲染头像占位', () => {
    const wrapper = full({ type: 'avatar' })
    expect(wrapper.find('.vuf-uploader.is-round').exists()).toBe(true)
    expect(wrapper.find('.vuf-avatar-add').exists()).toBe(true)
  })

  it('image：渲染通用图片占位', () => {
    const wrapper = full({ type: 'image' })
    expect(wrapper.find('.vuf-image-add').exists()).toBe(true)
  })

  it('invoice：渲染自定义网格 + 添加按钮 + 隐藏 input', () => {
    const wrapper = full({ type: 'invoice' })
    expect(wrapper.find('.vuf-invoice').exists()).toBe(true)
    expect(wrapper.find('.vuf-invoice-add').exists()).toBe(true)
    expect(wrapper.find('input[type="file"]').exists()).toBe(true)
  })

  it('document：渲染上传区 + 隐藏 input', () => {
    const wrapper = full({ type: 'document' })
    expect(wrapper.find('.vuf-doc-drop').exists()).toBe(true)
    expect(wrapper.find('input[type="file"]').exists()).toBe(true)
  })

  it('document 已上传后渲染文件列表项（名称回显）', async () => {
    const wrapper = full({ type: 'document', modelValue: 'http://x/合同.pdf' })
    await flushPromises()
    expect(wrapper.find('.vuf-doc-item').exists()).toBe(true)
    expect(wrapper.find('.vuf-doc-name').text()).toBe('合同.pdf')
  })

  it('document disabled 时点击上传区不触发文件选择', () => {
    const wrapper = full({ type: 'document', disabled: true })
    const input = (wrapper.vm as any).docInput
    const spy = vi.spyOn(input, 'click')
    wrapper.find('.vuf-doc-drop').trigger('click')
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('show-sample 身份证上传示例引导', () => {
  it('showSample=false：点击身份证直接唤起选图（不弹弹窗）', () => {
    const wrapper = shallow({ type: 'idcard', variant: 'front' })
    ;(wrapper.vm as any).onIdcardClick()
    expect(chooseFileSpy).toHaveBeenCalledTimes(1)
    expect((wrapper.vm as any).sampleVisible).toBe(false)
  })

  it('showSample=true：点击身份证先弹示例弹窗，不直接选图', () => {
    const wrapper = shallow({ type: 'idcard', variant: 'front', showSample: true })
    ;(wrapper.vm as any).onIdcardClick()
    expect((wrapper.vm as any).sampleVisible).toBe(true)
    expect(chooseFileSpy).not.toHaveBeenCalled()
  })

  it('disabled / readonly：点击不弹弹窗也不选图', () => {
    const wrapper = shallow({ type: 'idcard', variant: 'front', showSample: true, disabled: true })
    ;(wrapper.vm as any).onIdcardClick()
    expect((wrapper.vm as any).sampleVisible).toBe(false)
    expect(chooseFileSpy).not.toHaveBeenCalled()
  })

  it('onSampleClose：关闭示例弹窗', () => {
    const wrapper = shallow({ type: 'idcard', variant: 'front', showSample: true })
    ;(wrapper.vm as any).sampleVisible = true
    ;(wrapper.vm as any).onSampleClose()
    expect((wrapper.vm as any).sampleVisible).toBe(false)
  })

  it('onSampleConfirm：关闭弹窗并在 nextTick 后唤起选图', async () => {
    const wrapper = shallow({ type: 'idcard', variant: 'front', showSample: true })
    ;(wrapper.vm as any).sampleVisible = true
    ;(wrapper.vm as any).onSampleConfirm()
    // 弹窗立即关闭
    expect((wrapper.vm as any).sampleVisible).toBe(false)
    // 选图经 nextTick 触发
    expect(chooseFileSpy).not.toHaveBeenCalled()
    await flushPromises()
    expect(chooseFileSpy).toHaveBeenCalledTimes(1)
  })

  it('渲染：showSample=true 时 uploader 加 has-sample 类（禁用透明 input 点击拦截）', () => {
    const wrapper = full({ type: 'idcard', variant: 'front', showSample: true })
    expect(wrapper.find('.vuf-uploader.has-sample').exists()).toBe(true)
  })

  it('渲染：showSample 未传时不加 has-sample 类', () => {
    const wrapper = full({ type: 'idcard', variant: 'front' })
    expect(wrapper.find('.vuf-uploader.has-sample').exists()).toBe(false)
  })

  it('渲染：示例弹窗结构 + 文案随 variant 切换（人像面 / 国徽面）', () => {
    const front = full({ type: 'idcard', variant: 'front', showSample: true })
    expect(front.find('.vuf-sample-body').exists()).toBe(true)
    expect(front.text()).toContain('保险法')
    expect(front.text()).toContain('上传照片')
    expect(front.text()).toContain('人像面')

    const back = full({ type: 'idcard', variant: 'back', showSample: true })
    expect(back.find('.vuf-sample-body').exists()).toBe(true)
    expect(back.text()).toContain('国徽面')
    // 背面弹窗加 --back 修饰类：提示图与按钮统一为橙黄色调
    expect(back.find('.vuf-sample-body--back').exists()).toBe(true)
    // 人像面不加 --back 类（保留原有蓝色提示图 + 品牌红按钮）
    expect(front.find('.vuf-sample-body--back').exists()).toBe(false)
  })

  it('triggerUpload：idcard + showSample 先弹示例引导（不直接选图）', () => {
    const wrapper = shallow({ type: 'idcard', variant: 'front', showSample: true })
    ;(wrapper.vm as any).triggerUpload()
    expect((wrapper.vm as any).sampleVisible).toBe(true)
    expect(chooseFileSpy).not.toHaveBeenCalled()
  })

  it('triggerUpload：idcard + 未开 showSample 直接唤起选图', () => {
    const wrapper = shallow({ type: 'idcard', variant: 'front' })
    ;(wrapper.vm as any).triggerUpload()
    expect(chooseFileSpy).toHaveBeenCalledTimes(1)
    expect((wrapper.vm as any).sampleVisible).toBe(false)
  })

  it('triggerUpload：disabled 时不弹弹窗也不选图', () => {
    const wrapper = shallow({ type: 'idcard', variant: 'front', showSample: true, disabled: true })
    ;(wrapper.vm as any).triggerUpload()
    expect((wrapper.vm as any).sampleVisible).toBe(false)
    expect(chooseFileSpy).not.toHaveBeenCalled()
  })
})

describe('超限压缩 compressBeforeUpload（默认关闭）', () => {
  // 桩化 canvas / createImageBitmap，使压缩路径可在 jsdom 中执行
  function mockCompress(): () => void {
    const origCreate = (globalThis as any).createImageBitmap
    const origGet = HTMLCanvasElement.prototype.getContext
    const origToBlob = HTMLCanvasElement.prototype.toBlob
    ;(globalThis as any).createImageBitmap = vi.fn(async () => ({
      width: 4000,
      height: 3000,
      close: vi.fn(),
    }))
    ;(HTMLCanvasElement.prototype as any).getContext = () => ({ drawImage: vi.fn() })
    ;(HTMLCanvasElement.prototype as any).toBlob = function (cb: (b: Blob | null) => void) {
      // 返回一个明显小于上限的 blob，模拟压缩达标
      cb(new Blob([new ArrayBuffer(2048)], { type: 'image/jpeg' }))
    }
    return () => {
      ;(globalThis as any).createImageBitmap = origCreate
      HTMLCanvasElement.prototype.getContext = origGet
      HTMLCanvasElement.prototype.toBlob = origToBlob
    }
  }

  it('默认关闭（false）：超限图片被拒绝并触发 oversize', async () => {
    const wrapper = shallow({ type: 'image', maxSize: 1 })
    const big = file('a.png', 2 * 1024 * 1024, 'image/png')
    const res = await (wrapper.vm as any).processFile(big)
    expect(res).toBeNull()
    expect(wrapper.emitted('oversize')).toBeTruthy()
  })

  it('开启压缩但未超限：直接返回原文件（不压缩、不拒绝）', async () => {
    const wrapper = shallow({ type: 'image', maxSize: 5, compressBeforeUpload: true })
    const small = file('a.png', 1024, 'image/png')
    const res = await (wrapper.vm as any).processFile(small)
    expect(res).toBe(small)
    expect(wrapper.emitted('oversize')).toBeFalsy()
  })

  it('开启压缩但超限文件非图片（PDF）：无法压缩，拒绝并触发 oversize', async () => {
    const wrapper = shallow({ type: 'document', maxSize: 1, compressBeforeUpload: true })
    const big = file('a.pdf', 2 * 1024 * 1024, 'application/pdf')
    const res = await (wrapper.vm as any).processFile(big)
    expect(res).toBeNull()
    expect(wrapper.emitted('oversize')).toBeTruthy()
  })

  it('开启压缩且超限图片：压缩后返回带 -compressed 的文件，且不触发 oversize', async () => {
    const restore = mockCompress()
    try {
      const wrapper = shallow({ type: 'image', maxSize: 1, compressBeforeUpload: true })
      const big = file('photo.png', 3 * 1024 * 1024, 'image/png')
      const res = await (wrapper.vm as any).processFile(big)
      expect(res).not.toBeNull()
      expect((res as File).name).toMatch(/-compressed\.(jpg|png)$/)
      expect(wrapper.emitted('oversize')).toBeFalsy()
    } finally {
      restore()
    }
  })

  it('beforeRead：默认关闭时超限图片 reject（中止上传）', async () => {
    const wrapper = shallow({ type: 'image', maxSize: 1 })
    const big = file('a.png', 2 * 1024 * 1024, 'image/png')
    await expect((wrapper.vm as any).beforeRead(big)).rejects.toBeTruthy()
  })

  it('beforeRead：开启压缩时超限图片 resolve 压缩文件（不 reject）', async () => {
    const restore = mockCompress()
    try {
      const wrapper = shallow({ type: 'image', maxSize: 1, compressBeforeUpload: true })
      const big = file('photo.png', 3 * 1024 * 1024, 'image/png')
      const r = await (wrapper.vm as any).beforeRead(big)
      expect(r).toBeInstanceOf(File)
      expect((r as File).name).toMatch(/-compressed/)
    } finally {
      restore()
    }
  })
})

describe('field 表单回填计算属性', () => {
  it('fieldFormValue：单选取原 string；空取空串；数组序列化为 JSON 字符串', () => {
    expect((shallow({ type: 'image', modelValue: 'http://a' }).vm as any).fieldFormValue).toBe(
      'http://a',
    )
    expect((shallow({ type: 'document', modelValue: 'blob:x' }).vm as any).fieldFormValue).toBe(
      'blob:x',
    )
    expect((shallow({ type: 'document', modelValue: '' }).vm as any).fieldFormValue).toBe('')
    // 多选数组 → JSON 字符串（仍可被 van-form 收集 / 回填）
    expect(
      (
        shallow({ type: 'document', multiple: true, modelValue: ['http://a', 'http://b'] })
          .vm as any
      ).fieldFormValue,
    ).toBe(JSON.stringify(['http://a', 'http://b']))
  })

  it('fieldDisplayText：单选显示文件名 / 多选显示已上传个数 / 空显示未上传', () => {
    expect(
      (shallow({ type: 'image', modelValue: 'http://x/合同.png' }).vm as any).fieldDisplayText,
    ).toBe('合同.png')
    expect(
      (
        shallow({ type: 'document', multiple: true, modelValue: ['http://a', 'http://b'] })
          .vm as any
      ).fieldDisplayText,
    ).toBe('已上传 2 个文件')
    expect((shallow({ type: 'document', modelValue: '' }).vm as any).fieldDisplayText).toBe(
      '未上传文件',
    )
  })

  it('fieldWrapperProps：field=true 透传 name/label/rules 等；false 返回空对象', () => {
    expect((shallow({ type: 'image' }).vm as any).fieldWrapperProps).toEqual({})
    const on = (
      shallow({
        type: 'image',
        field: true,
        name: 'idPhoto',
        label: '证件照',
        required: true,
        rules: [{ required: true, message: 'x' }],
      }).vm as any
    ).fieldWrapperProps
    expect(on.name).toBe('idPhoto')
    expect(on.label).toBe('证件照')
    expect(on.required).toBe(true)
    expect(on.rules).toHaveLength(1)
  })

  it('fieldUploading：存在 uploading 项时为 true', () => {
    const wrapper = shallow({ type: 'document' })
    const vm = wrapper.vm as any
    expect(vm.fieldUploading).toBe(false)
    vm.fileList.push({ file: file('a.pdf', 1, 'application/pdf'), status: 'uploading' })
    expect(vm.fieldUploading).toBe(true)
  })

  it('hideOriginUpload：仅 field && hideUploadWhenField 为 true', () => {
    expect((shallow({ type: 'image' }).vm as any).hideOriginUpload).toBe(false)
    expect((shallow({ type: 'image', field: true }).vm as any).hideOriginUpload).toBe(false)
    expect(
      (shallow({ type: 'image', field: true, hideUploadWhenField: true }).vm as any)
        .hideOriginUpload,
    ).toBe(true)
  })

  it('showRemainingHint：仅多文件 document / invoice 且未禁用 / 只读', () => {
    expect((shallow({ type: 'document', multiple: true }).vm as any).showRemainingHint).toBe(true)
    expect((shallow({ type: 'invoice', multiple: true }).vm as any).showRemainingHint).toBe(true)
    expect((shallow({ type: 'document' }).vm as any).showRemainingHint).toBe(false) // 单选
    expect(
      (shallow({ type: 'document', multiple: true, disabled: true }).vm as any).showRemainingHint,
    ).toBe(false) // 禁用
    expect((shallow({ type: 'image', multiple: true }).vm as any).showRemainingHint).toBe(false) // 非 doc/invoice
  })
})

describe('triggerUpload 上传入口路由', () => {
  it('document / invoice 类型 → 调用 pickDocument（隐藏 input.click）', () => {
    const doc = shallow({ type: 'document' })
    const docSpy = vi.spyOn((doc.vm as any).docInput, 'click')
    ;(doc.vm as any).triggerUpload()
    expect(docSpy).toHaveBeenCalled()

    const inv = shallow({ type: 'invoice' })
    const invSpy = vi.spyOn((inv.vm as any).docInput, 'click')
    ;(inv.vm as any).triggerUpload()
    expect(invSpy).toHaveBeenCalled()
  })

  it('image / avatar / idcard（未开 showSample）→ 调用 uploadRef.chooseFile', () => {
    const img = shallow({ type: 'image' })
    chooseFileSpy.mockClear()
    ;(img.vm as any).triggerUpload()
    expect(chooseFileSpy).toHaveBeenCalledTimes(1)

    const av = shallow({ type: 'avatar' })
    chooseFileSpy.mockClear()
    ;(av.vm as any).triggerUpload()
    expect(chooseFileSpy).toHaveBeenCalledTimes(1)
  })

  it('disabled / readonly → 不弹弹窗、不选图、不调 pickDocument', () => {
    const doc = shallow({ type: 'document', disabled: true })
    const docSpy = vi.spyOn((doc.vm as any).docInput, 'click')
    ;(doc.vm as any).triggerUpload()
    expect(docSpy).not.toHaveBeenCalled()

    const id = shallow({ type: 'idcard', variant: 'front', showSample: true, readonly: true })
    chooseFileSpy.mockClear()
    ;(id.vm as any).triggerUpload()
    expect((id.vm as any).sampleVisible).toBe(false)
    expect(chooseFileSpy).not.toHaveBeenCalled()
  })
})

describe('previewImage 放大预览', () => {
  it('调用 showImagePreview 并传入当前图片列表与起始位置', () => {
    const wrapper = shallow({ type: 'image' })
    const vm = wrapper.vm as any
    vm.fileList.push(
      { url: 'http://a/1.png', value: 'http://a/1.png', name: '1.png', status: 'done' },
      { url: 'http://a/2.png', value: 'http://a/2.png', name: '2.png', status: 'done' },
    )
    vm.previewImage(vm.fileList[1])
    expect(showImagePreview).toHaveBeenCalledWith({
      images: ['http://a/1.png', 'http://a/2.png'],
      startPosition: 1,
    })
  })

  it('无 url 时直接返回（不触发预览）', () => {
    const wrapper = shallow({ type: 'image' })
    const vm = wrapper.vm as any
    vm.previewImage({ url: '', value: '', name: 'x' })
    expect(showImagePreview).not.toHaveBeenCalled()
  })
})

describe('hideUploadWhenField 隐藏原上传按钮', () => {
  it('idcard + field + hideUploadWhenField：隐藏卡片占位（仅保留 van-field 相机入口）', () => {
    const wrapper = full({
      type: 'idcard',
      variant: 'front',
      field: true,
      hideUploadWhenField: true,
    })
    expect(wrapper.find('.vuf-idcard').exists()).toBe(false)
  })

  it('idcard + field（未隐藏）：仍渲染卡片占位', () => {
    const wrapper = full({ type: 'idcard', variant: 'front', field: true })
    expect(wrapper.find('.vuf-idcard').exists()).toBe(true)
  })

  it('image + field + hideUploadWhenField：隐藏通用图片占位', () => {
    expect(
      full({ type: 'image', field: true, hideUploadWhenField: true })
        .find('.vuf-image-add')
        .exists(),
    ).toBe(false)
    expect(full({ type: 'image', field: true }).find('.vuf-image-add').exists()).toBe(true)
  })
})

describe('compact 预览与占位同尺寸（防上传后换行 / 抖动）', () => {
  it('compact 模式根 uploader 带 idcard-compact 类，预览与占位均锁 150×95', () => {
    const wrapper = full({ type: 'idcard', variant: 'front', compact: true })
    // 该类是 CSS 锁定 wrapper / input-wrapper / preview 为 150×95 且 margin:0 的钩子，
    // 上传前后尺寸一致 → .idcard-row 并排不换行（修复：默认 8px 右边距导致溢出）
    expect(wrapper.find('.vuf-uploader--idcard.idcard-compact').exists()).toBe(true)
    // 占位卡片同样带 is-compact（150×95），与预览锁定尺寸对齐
    expect(wrapper.find('.vuf-idcard.is-compact').exists()).toBe(true)
  })

  it('compact 上传一项后 fileList 仅 1 项且值回写（不撑破固定尺寸 UI）', async () => {
    const upload = vi.fn(async () => ({ url: 'http://x/c.png' }))
    const wrapper = shallow({ type: 'idcard', variant: 'front', compact: true, upload })
    const item: any = { file: file('c.png', 100), status: 'uploading' }
    ;(wrapper.vm as any).afterRead([item])
    await flushPromises()
    expect((wrapper.vm as any).fileList).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBe('http://x/c.png')
  })
})
