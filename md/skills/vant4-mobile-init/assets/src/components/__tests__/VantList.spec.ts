import { describe, it, expect, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'

vi.mock('@/api/modules/permission', () => ({
  getUserPermissions: vi.fn(async (role: string) => ({
    role,
    permissions: ['renewal:create', 'renewal:edit', 'renewal:view', 'renewal:delete'],
    username: `${role}-user`,
  })),
}))

import VantList from '../VantList.vue'
import { usePermission } from '@/composables/usePermission'
import permissionDirective, {
  permissionAllDirective,
  permissionNoneDirective,
} from '@/directives/permission'

const stubs = {
  'van-nav-bar': { template: '<div><slot /></div>' },
  'van-search': { template: '<div><slot /></div>' },
  'van-icon': { template: '<i />' },
  'van-badge': { template: '<span />' },
  'van-pull-refresh': { template: '<div><slot /></div>' },
  // 阻止 van-list 触发真实 onLoad 网络请求
  'van-list': { template: '<div><slot /></div>', props: ['loading', 'finished'] },
  'van-skeleton': { template: '<div />' },
  'van-button': { template: '<button><slot /></button>' },
  'van-radio-group': { template: '<div><slot /></div>' },
  'van-radio': { template: '<div />' },
  'van-field': { template: '<div />' },
  'van-dialog': { template: '<div />' },
  'van-action-sheet': { template: '<div />' },
  'van-popup': { template: '<div><slot /></div>' },
  'van-picker': { template: '<div />' },
  'van-date-picker': { template: '<div />' },
}

const api = {
  list: vi.fn(async () => ({ list: [], total: 0, page: 1, pageSize: 10 })),
  create: vi.fn(async () => ({})),
  update: vi.fn(async () => ({})),
  remove: vi.fn(async () => ({})),
}

function mountList(props: Record<string, any> = {}) {
  return shallowMount(VantList, {
    props: { api, ...props } as any,
    global: {
      stubs,
      directives: {
        permission: permissionDirective,
        'permission-all': permissionAllDirective,
        'permission-none': permissionNoneDirective,
      },
    },
    slots: {
      item: '<template #item="{ item }">{{ item.name }}</template>',
    },
  })
}

describe('VantList', () => {
  it('默认渲染搜索栏与列表容器', () => {
    const wrapper = mountList()
    expect(wrapper.find('.vl-search-wrap').exists()).toBe(true)
    expect(wrapper.find('.vant-list').exists()).toBe(true)
  })

  it('骨架屏：loading 且列表为空时按 skeletonCount 渲染', async () => {
    const wrapper = mountList({ skeletonCount: 3 })
    // 进入加载态（script setup 暴露到 vm 的 ref 已自动解包，直接赋值）
    wrapper.vm.loading = true
    await wrapper.vm.$nextTick()
    // 列表为空且仍 loading 时展示骨架
    expect(wrapper.find('.vl-skeleton').exists()).toBe(true)
  })

  it('传入 title 时渲染导航栏', () => {
    const wrapper = mountList({ title: '续保列表' })
    expect(wrapper.find('.van-nav-bar--picc-primary').exists()).toBe(true)
  })

  it('create 事件：点击新增触发 emit 并打开表单', async () => {
    const wrapper = mountList()
    ;(wrapper.vm as any).onCreate()
    expect(wrapper.emitted('create')).toBeTruthy()
    expect((wrapper.vm as any).formVisible).toBe(true)
  })

  it('action 事件：ActionSheet 选择自定义操作派发对应 key', async () => {
    const wrapper = mountList({
      actions: [{ key: 'audit', name: '审核', perm: 'renewal:edit' }],
    })
    const item = { id: 1, name: 'a' }
    ;(wrapper.vm as any).openActionSheet(item)
    ;(wrapper.vm as any).onActionSelect({ name: '审核', value: 'act:audit' })
    const payload = wrapper.emitted('action')?.[0]?.[0] as any
    expect(payload.key).toBe('audit')
    expect(payload.item).toEqual(item)
  })

  it('rowPermission 与角色权限做「与」运算', async () => {
    const p = usePermission()
    await p.loadPermissions('admin') // 拥有 renewal:edit
    const wrapper = mountList({
      permissionPrefix: 'renewal',
      rowPermission: (item: any) => ({ edit: (item as any).status !== 'renewal' }),
    })
    expect((wrapper.vm as any).rowCan({ status: 'renewal' }, 'edit')).toBe(false)
    expect((wrapper.vm as any).rowCan({ status: 'open' }, 'edit')).toBe(true)
  })

  it('无权限（角色）时 rowCan 直接为 false', async () => {
    const p = usePermission()
    p.permissions.value = [] // 清空权限
    p.loaded.value = true
    const wrapper = mountList({ permissionPrefix: 'renewal' })
    expect((wrapper.vm as any).rowCan({ status: 'open' }, 'edit')).toBe(false)
  })
})
