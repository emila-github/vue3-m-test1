import { describe, it, expect, vi, afterEach } from 'vitest'

// 拦截权限接口，避免真实网络请求（onMounted 内会自动调用）
vi.mock('@/api/modules/permission', () => ({
  getUserPermissions: vi.fn(async (role: string) => ({
    role,
    permissions: ['car:create', 'car:edit', 'car:view', 'car:delete'],
    username: `${role}-user`,
  })),
}))

import { useCrudList } from '../useCrudList'
import type { CrudApi } from '../useCrudList'

interface Row {
  id: number
  name: string
}

function makeApi(over: Partial<CrudApi<Row, Row, any>> = {}) {
  const list = vi.fn(async (params: any) => {
    const page = params.page as number
    const size = params.pageSize as number
    const arr: Row[] = Array.from({ length: size }, (_, i) => ({
      id: (page - 1) * size + i + 1,
      name: `item-${(page - 1) * size + i + 1}`,
    }))
    return { list: arr, total: 100, page, pageSize: size }
  })
  return {
    list,
    create: vi.fn(async () => ({})),
    update: vi.fn(async () => ({})),
    remove: vi.fn(async () => ({})),
    ...over,
  } as CrudApi<Row, Row, any>
}

describe('useCrudList', () => {
  afterEach(() => {
    const p = useCrudList({ api: makeApi(), initialForm: { id: 0, name: '' } })
    p.permissions.value = []
    p.loaded.value = false
    p.currentRole.value = 'admin'
  })

  it('onLoad 加载列表并按 pageSize 推进分页', async () => {
    const api = makeApi()
    const crud = useCrudList({ api, initialForm: { id: 0, name: '' }, pageSize: 5 })
    await crud.onLoad()
    expect(api.list).toHaveBeenCalled()
    expect(crud.list.value.length).toBe(5)
    expect(crud.page.value).toBe(2)
    expect(crud.loading.value).toBe(false)
  })

  it('onLoad 数据不足一页时标记 finished', async () => {
    const api = makeApi({
      list: vi.fn(async () => ({ list: [{ id: 1, name: 'a' }], total: 1, page: 1, pageSize: 10 })),
    })
    const crud = useCrudList({ api, initialForm: { id: 0, name: '' } })
    await crud.onLoad()
    expect(crud.list.value.length).toBe(1)
    expect(crud.finished.value).toBe(true)
  })

  it('onSearch 重置列表与页码后重新拉取', async () => {
    const api = makeApi()
    const crud = useCrudList({ api, initialForm: { id: 0, name: '' }, pageSize: 5 })
    await crud.onLoad()
    crud.query.keyword = 'abc'
    crud.onSearch()
    expect(crud.page.value).toBe(1)
    expect(crud.list.value.length).toBe(0)
    expect(api.list).toHaveBeenCalledTimes(2)
  })

  it('openCreate 打开新增表单并重置初始值', async () => {
    const crud = useCrudList({ api: makeApi(), initialForm: { id: 0, name: '' } })
    crud.form.name = 'dirty'
    crud.openCreate()
    expect(crud.isEdit.value).toBe(false)
    expect(crud.formVisible.value).toBe(true)
    expect(crud.form.name).toBe('')
  })

  it('openEdit 复制行数据到表单', async () => {
    const crud = useCrudList({ api: makeApi(), initialForm: { id: 0, name: '' } })
    crud.openEdit({ id: 9, name: 'row9' })
    expect(crud.isEdit.value).toBe(true)
    expect(crud.editingId.value).toBe(9)
    expect(crud.form.name).toBe('row9')
    expect(crud.formVisible.value).toBe(true)
  })

  it('submit 在编辑态调用 update 并刷新', async () => {
    const api = makeApi()
    const crud = useCrudList({ api, initialForm: { id: 0, name: '' } })
    crud.openEdit({ id: 9, name: 'row9' })
    await crud.submit()
    expect(api.update).toHaveBeenCalledTimes(1)
    expect(api.create).not.toHaveBeenCalled()
    expect(crud.formVisible.value).toBe(false)
  })

  it('submit 在非编辑态调用 create', async () => {
    const api = makeApi()
    const crud = useCrudList({ api, initialForm: { id: 0, name: '' } })
    crud.openCreate()
    await crud.submit()
    expect(api.create).toHaveBeenCalledTimes(1)
    expect(api.update).not.toHaveBeenCalled()
  })

  it('confirmDelete / doDelete 触发 remove 并刷新', async () => {
    const api = makeApi()
    const crud = useCrudList({ api, initialForm: { id: 0, name: '' } })
    crud.confirmDelete({ id: 5, name: 'x' })
    expect(crud.deleteId.value).toBe(5)
    expect(crud.showDeleteDialog.value).toBe(true)
    await crud.doDelete()
    expect(api.remove).toHaveBeenCalledWith(5)
    expect(crud.showDeleteDialog.value).toBe(false)
  })

  it('openDetail 打开详情弹层', async () => {
    const crud = useCrudList({ api: makeApi(), initialForm: { id: 0, name: '' } })
    crud.openDetail({ id: 3, name: 'd' })
    expect(crud.detailItem.value?.id).toBe(3)
    expect(crud.detailVisible.value).toBe(true)
  })

  it('permCodes 按 permissionPrefix 生成权限码', async () => {
    const crud = useCrudList({
      api: makeApi(),
      initialForm: { id: 0, name: '' },
      permissionPrefix: 'car',
    })
    expect(crud.permCodes.value).toEqual({
      create: 'car:create',
      edit: 'car:edit',
      view: 'car:view',
      delete: 'car:delete',
    })
  })

  it('hasPerm 支持单码与码数组（OR）', async () => {
    const crud = useCrudList({ api: makeApi(), initialForm: { id: 0, name: '' } })
    await crud.loadPermissions('admin')
    expect(crud.hasPerm('car:view')).toBe(true)
    expect(crud.hasPerm(['car:audit', 'car:edit'])).toBe(true)
    expect(crud.hasPerm(['car:audit', 'car:export'])).toBe(false)
  })
})
