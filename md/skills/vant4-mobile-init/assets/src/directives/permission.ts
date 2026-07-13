import type { Directive, DirectiveBinding } from 'vue'
import { watch } from 'vue'
import { usePermission } from '@/composables/usePermission'

/**
 * 全局权限指令家族（基于 usePermission 单例）
 * ------------------------------------------------------------------
 * v-permission       — 拥有「任意一个」所需权限即可见（OR，对应 hasAny）
 * v-permission-all   — 必须拥有「全部」所需权限才可见（AND，对应 hasAll）
 * v-permission-none  — 只要「拥有任意一个」就隐藏（即没有任何权限才可见，对应 hasNone）
 *
 * 用法：
 *   <van-button v-permission="'car:delete'">删除</van-button>
 *   <van-button v-permission-all="['car:edit', 'car:audit']">编辑并审核</van-button>
 *   <van-button v-permission-none="'car:view'">访客可见</van-button>
 * 值为空 / undefined / '' 时视为「不限制，始终可见」。
 * 数组表示多个权限码。
 *
 * 通过 watch 监听 permissions / currentRole，权限加载完成或角色切换后
 * 自动重新求值，避免「权限晚于渲染到达导致按钮残留」的问题。
 *
 * 在 main.ts 注册：
 *   import { permissionDirective, permissionAllDirective, permissionNoneDirective } from '@/directives/permission'
 *   app.directive('permission', permissionDirective)
 *   app.directive('permission-all', permissionAllDirective)
 *   app.directive('permission-none', permissionNoneDirective)
 */

function toCodes(value: unknown): string[] {
  if (value === undefined || value === null || value === '') return []
  return Array.isArray(value) ? (value as string[]) : [value as string]
}

/** 创建一个权限指令：传入一个 (codes) => boolean 的判断函数 */
function createPermissionDirective(check: (codes: string[]) => boolean): Directive {
  function permitted(value: unknown): boolean {
    const codes = toCodes(value)
    if (codes.length === 0) return true
    return check(codes)
  }

  function apply(el: HTMLElement, binding: DirectiveBinding) {
    if (permitted(binding.value)) {
      el.style.display = ''
      el.removeAttribute('data-permission-denied')
    } else {
      // 仅隐藏不移除，便于权限变化后恢复（规避 v-for 下 removeChild 的 DOM 复用问题）
      el.style.display = 'none'
      el.setAttribute('data-permission-denied', '')
    }
  }

  return {
    mounted(el, binding) {
      const { permissions, currentRole } = usePermission()
      apply(el, binding)
      // 权限 / 角色变化时自动重新求值（覆盖「权限晚于渲染到达」的场景）
      const stop = watch([permissions, currentRole], () => apply(el, binding))
      ;(el as any).__permStop__ = stop
    },
    updated(el, binding) {
      apply(el, binding)
    },
    unmounted(el) {
      ;(el as any).__permStop__?.()
      delete (el as any).__permStop__
    },
  }
}

// 复用单例判断函数
const { hasAny, hasAll, hasNone } = usePermission()

/** v-permission：拥有任意一个即可见 */
export const permissionDirective = createPermissionDirective((codes) => hasAny(...codes))
/** v-permission-all：必须拥有全部才可见 */
export const permissionAllDirective = createPermissionDirective((codes) => hasAll(...codes))
/** v-permission-none：拥有任意一个就隐藏（没有任何权限才可见） */
export const permissionNoneDirective = createPermissionDirective((codes) => hasNone(...codes))

export default permissionDirective
