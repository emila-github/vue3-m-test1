/**
 * 登录核心（useLoginCore）
 * ---------------------------------------------------------------
 * 所有登录方式共用的基础能力：
 *   - loading：全局登录中状态（模板按钮 loading 态复用）
 *   - toast：统一居中提示（Vant Toast 默认偏下，这里固定 position: middle）
 *   - doLogin：统一的「调用接口 → 成功/失败提示 → 派发 success/error 事件」
 *
 * 各登录方式组合式函数（useSmsLogin / usePasswordLogin …）复用此核心，
 * 避免每个登录都重复写 loading toast 与结果派发。
 */
import { ref, type Ref } from 'vue'
import { showToast, showLoadingToast, closeToast } from 'vant'
import type { LoginMethod, LoginResult } from '@/api/modules/login'

export type EmitFn = (event: string, ...args: any[]) => void

export interface LoginCore {
  loading: Ref<boolean>
  toast: (message: string) => void
  doLogin: (fn: () => Promise<LoginResult>, method: LoginMethod) => Promise<void>
}

export function useLoginCore(emit: EmitFn): LoginCore {
  const loading = ref(false)

  function toast(message: string) {
    showToast({ message, position: 'middle' })
  }

  /**
   * 执行一次登录调用，统一处理 loading / 提示 / 事件派发。
   * @param fn      返回 LoginResult 的接口调用（如 loginBySms）
   * @param method  当前登录方式（用于 error 事件回传）
   */
  async function doLogin(fn: () => Promise<LoginResult>, method: LoginMethod) {
    if (loading.value) return
    loading.value = true
    showLoadingToast({ message: '登录中...', forbidClick: true, duration: 0 })
    try {
      const result = await fn()
      closeToast()
      toast('登录成功')
      emit('success', result)
    } catch (e: any) {
      closeToast()
      const msg = e?.message || '登录失败'
      toast(msg)
      emit('error', { method, message: msg })
    } finally {
      loading.value = false
    }
  }

  return { loading, toast, doLogin }
}
