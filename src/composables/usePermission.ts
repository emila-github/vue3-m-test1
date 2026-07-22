import { ref } from 'vue'
import { getUserPermissions } from '@/api'
import { getUserPermissionByToken, type SiteMenuNode } from '@/api/modules/ydl/site-auth'

// ===== 全局共享的权限状态（单例） =====
const currentRole = ref('admin')
const permissions = ref<string[]>([]) // 按钮 / 元素级权限（action 码）
const menuAuth = ref<string[]>([]) // 菜单级权限（菜单 name）
const username = ref('')
const loading = ref(false)
const loaded = ref(false)

/**
 * 权限控制 Composable
 * 全局单例，切换角色后所有组件同步更新
 *
 * 两套加载来源：
 *  - loadPermissions(role)：vant 侧按角色写死（演示）
 *  - loadPermissionsByToken(token)：ydl 站点侧用真实 token 拉权限树
 */
export function usePermission() {
  async function loadPermissions(role?: string) {
    if (role !== undefined) currentRole.value = role
    loading.value = true
    try {
      const data = await getUserPermissions(currentRole.value)
      permissions.value = data.permissions
      username.value = data.username
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  function setRole(role: string) {
    return loadPermissions(role)
  }

  /** 递归拍平菜单树为 name 数组（对齐旧站 getTreeName） */
  function flattenMenuNames(menu: SiteMenuNode[]): string[] {
    const names: string[] = []
    const walk = (list: SiteMenuNode[]) => {
      for (const m of list) {
        if (m.name) names.push(m.name)
        if (m.children?.length) walk(m.children)
      }
    }
    walk(menu)
    return names
  }

  /** 登录成功后：用 token 拉真实权限树并落库（ydl 站点侧） */
  async function loadPermissionsByToken(token: string) {
    loading.value = true
    try {
      const result = await getUserPermissionByToken(token)
      permissions.value = (result.auth || []).map((i) => i.action) // 按钮权限码
      menuAuth.value = flattenMenuNames(result.menu || []) // 菜单权限
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  /** 登出时清空权限（配合 clearAuth） */
  function resetPermissions() {
    permissions.value = []
    menuAuth.value = []
    loaded.value = false
  }

  /** 检查是否拥有某个权限 */
  function hasPermission(perm: string): boolean {
    return permissions.value.includes(perm)
  }

  /** 检查是否至少拥有目标权限列表中的一个 */
  function hasAny(...perms: string[]): boolean {
    return perms.some((p) => permissions.value.includes(p))
  }

  /** 检查是否拥有目标权限列表的全部 */
  function hasAll(...perms: string[]): boolean {
    return perms.every((p) => permissions.value.includes(p))
  }

  /** 检查是否没有任何目标权限 */
  function hasNone(...perms: string[]): boolean {
    return perms.every((p) => !permissions.value.includes(p))
  }

  // ===== 菜单级权限判断 =====
  const hasMenuAny = (...names: string[]) => names.some((n) => menuAuth.value.includes(n))
  const hasMenuAll = (...names: string[]) => names.every((n) => menuAuth.value.includes(n))

  return {
    currentRole,
    permissions,
    menuAuth,
    username,
    loading,
    loaded,
    loadPermissions,
    setRole,
    loadPermissionsByToken,
    resetPermissions,
    hasPermission,
    hasAny,
    hasAll,
    hasNone,
    hasMenuAny,
    hasMenuAll,
  }
}
