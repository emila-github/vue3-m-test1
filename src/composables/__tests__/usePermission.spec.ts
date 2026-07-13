import { describe, it, expect, vi, afterEach } from 'vitest'

// 拦截权限接口，按 role 返回模拟权限，避免真实网络请求
vi.mock('@/api/modules/permission', () => ({
  getUserPermissions: vi.fn(async (role: string) => {
    const map: Record<string, string[]> = {
      admin: ['car:create', 'car:edit', 'car:view', 'car:delete'],
      viewer: ['car:view'],
    }
    return {
      role,
      permissions: map[role] ?? map.viewer,
      username: `${role}-user`,
    }
  }),
}))

import { usePermission } from '../usePermission'

describe('usePermission', () => {
  afterEach(() => {
    // 重置全局单例状态，避免测试相互耦合
    const p = usePermission()
    p.permissions.value = []
    p.currentRole.value = 'admin'
    p.username.value = ''
    p.loading.value = false
    p.loaded.value = false
  })

  it('初始为未加载状态', () => {
    const p = usePermission()
    expect(p.permissions.value).toEqual([])
    expect(p.loaded.value).toBe(false)
    expect(p.loading.value).toBe(false)
    expect(p.currentRole.value).toBe('admin')
  })

  it('loadPermissions 成功加载权限并标记 loaded', async () => {
    const p = usePermission()
    await p.loadPermissions('admin')
    expect(p.loaded.value).toBe(true)
    expect(p.permissions.value).toContain('car:create')
    expect(p.username.value).toBe('admin-user')
  })

  it('hasPermission 判定单码拥有情况', async () => {
    const p = usePermission()
    await p.loadPermissions('admin')
    expect(p.hasPermission('car:delete')).toBe(true)
    expect(p.hasPermission('car:audit')).toBe(false)
  })

  it('hasAny 拥有其一即返回 true', async () => {
    const p = usePermission()
    await p.loadPermissions('viewer')
    expect(p.hasAny('car:view', 'car:delete')).toBe(true)
    expect(p.hasAny('car:edit', 'car:delete')).toBe(false)
  })

  it('hasAll 必须全部拥有', async () => {
    const p = usePermission()
    await p.loadPermissions('admin')
    expect(p.hasAll('car:create', 'car:delete')).toBe(true)
    expect(p.hasAll('car:create', 'car:audit')).toBe(false)
  })

  it('hasNone 一个都不拥有才返回 true', async () => {
    const p = usePermission()
    await p.loadPermissions('viewer')
    expect(p.hasNone('car:create', 'car:edit')).toBe(true)
    expect(p.hasNone('car:view', 'car:edit')).toBe(false)
  })

  it('setRole 切换角色后权限同步更新（单例共享）', async () => {
    const a = usePermission()
    await a.loadPermissions('admin')
    const b = usePermission()
    expect(b.hasPermission('car:create')).toBe(true)
    await b.setRole('viewer')
    expect(b.hasPermission('car:create')).toBe(false)
    expect(b.hasPermission('car:view')).toBe(true)
  })

  it('loading 在请求期间为 true', async () => {
    const p = usePermission()
    const task = p.loadPermissions('admin')
    expect(p.loading.value).toBe(true)
    await task
    expect(p.loading.value).toBe(false)
  })
})
