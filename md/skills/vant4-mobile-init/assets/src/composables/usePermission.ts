import { ref } from 'vue'
import { getUserPermissions } from '@/api/modules/permission'

// ===== 全局共享的权限状态（单例） =====
const currentRole = ref('admin')
const permissions = ref<string[]>([])
const username = ref('')
const loading = ref(false)
const loaded = ref(false)

/**
 * 权限控制 Composable
 * 全局单例，切换角色后所有组件同步更新
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

  return {
    currentRole,
    permissions,
    username,
    loading,
    loaded,
    loadPermissions,
    setRole,
    hasPermission,
    hasAny,
    hasAll,
    hasNone,
  }
}
