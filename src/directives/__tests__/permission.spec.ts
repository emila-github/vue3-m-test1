import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DirectiveBinding } from 'vue'

vi.mock('@/api/modules/permission', () => ({
  getUserPermissions: vi.fn(async (role: string) => ({
    role,
    permissions: ['car:edit', 'car:delete'],
    username: `${role}-user`,
  })),
}))

import { permissionDirective, permissionAllDirective, permissionNoneDirective } from '../permission'
import { usePermission } from '@/composables/usePermission'

const el = () => document.createElement('button')

async function prime(perms: string[]) {
  const p = usePermission()
  p.permissions.value = perms
  p.loaded.value = true
}

describe('权限指令 v-permission', () => {
  beforeEach(async () => {
    await prime(['car:edit', 'car:delete'])
  })

  it('拥有权限时元素可见', () => {
    const node = el()
    permissionDirective.mounted!(node, { value: 'car:edit' } as DirectiveBinding)
    expect(node.style.display).toBe('')
    expect(node.hasAttribute('data-permission-denied')).toBe(false)
  })

  it('无权限时元素隐藏（display:none + 标记）', () => {
    const node = el()
    permissionDirective.mounted!(node, { value: 'car:view' } as DirectiveBinding)
    expect(node.style.display).toBe('none')
    expect(node.getAttribute('data-permission-denied')).toBe('')
  })

  it('空值视为不限制，始终可见', () => {
    const node = el()
    permissionDirective.mounted!(node, { value: '' } as DirectiveBinding)
    expect(node.style.display).toBe('')
  })

  it('数组权限：拥有其一即可见', () => {
    const node = el()
    permissionDirective.mounted!(node, { value: ['car:view', 'car:delete'] } as DirectiveBinding)
    expect(node.style.display).toBe('')
  })

  it('updated 时按最新值重新求值', () => {
    const node = el()
    permissionDirective.mounted!(node, { value: 'car:edit' } as DirectiveBinding)
    permissionDirective.updated!(node, { value: 'car:view' } as DirectiveBinding)
    expect(node.style.display).toBe('none')
  })

  it('unmounted 清理 watcher', () => {
    const node = el() as any
    permissionDirective.mounted!(node, { value: 'car:edit' } as DirectiveBinding)
    expect(typeof node.__permStop__).toBe('function')
    permissionDirective.unmounted!(node, {} as DirectiveBinding)
    expect(node.__permStop__).toBeUndefined()
  })

  it('权限加载完成后 watcher 自动重算（早到晚到场景）', async () => {
    const node = el()
    // 先以无权限挂载
    await prime([])
    permissionDirective.mounted!(node, { value: 'car:edit' } as DirectiveBinding)
    expect(node.style.display).toBe('none')
    // 权限晚到
    await prime(['car:edit'])
    await Promise.resolve()
    expect(node.style.display).toBe('')
  })
})

describe('权限指令 v-permission-all', () => {
  beforeEach(async () => {
    await prime(['car:edit', 'car:delete'])
  })

  it('拥有全部权限才可见', () => {
    const node = el()
    permissionAllDirective.mounted!(node, { value: ['car:edit', 'car:delete'] } as DirectiveBinding)
    expect(node.style.display).toBe('')
  })

  it('缺一个权限即隐藏', () => {
    const node = el()
    permissionAllDirective.mounted!(node, { value: ['car:edit', 'car:view'] } as DirectiveBinding)
    expect(node.style.display).toBe('none')
  })
})

describe('权限指令 v-permission-none', () => {
  beforeEach(async () => {
    await prime(['car:edit', 'car:delete'])
  })

  it('拥有任一目标权限即隐藏', () => {
    const node = el()
    permissionNoneDirective.mounted!(node, { value: 'car:edit' } as DirectiveBinding)
    expect(node.style.display).toBe('none')
  })

  it('没有任何目标权限才可见', () => {
    const node = el()
    permissionNoneDirective.mounted!(node, { value: 'car:view' } as DirectiveBinding)
    expect(node.style.display).toBe('')
  })
})
