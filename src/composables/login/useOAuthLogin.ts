/**
 * 微信 / 企业微信 OAuth 扫码授权登录（useOAuthLogin）
 * ---------------------------------------------------------------
 * 流程（真实 OAuth，code 由后端用 code 换 token 并拉取用户信息）：
 *   1. onOAuth(method) → getWechatAuthorizeUrl / getWecomAuthorizeUrl 拿到授权地址
 *   2. 桌面端：window.open 弹窗扫码；移动端：整页跳转（弹窗在 WebView 多不可用）
 *   3. 回调由后端完成 code 交换，把结果通过 postMessage 或 sessionStorage 回传：
 *        - 弹窗模式：子窗口 postMessage({ type:'oauth-success'|'oauth-error', result })
 *        - 整页跳转：回调页写入 sessionStorage['oauth_result'] 后跳回，本组件 onMounted 读取
 *   4. 收到结果 → 关闭 loading → emit success / error
 *
 * 弹窗被拦截或移动端时降级为整页跳转（redirectOAuth，sessionStorage 记录返回地址）。
 * 组件卸载时清理定时器 / 监听器 / 弹窗。
 */
import { onMounted, onUnmounted } from 'vue'
import { showLoadingToast, closeToast } from 'vant'
import { getWechatAuthorizeUrl, getWecomAuthorizeUrl } from '@/api/modules/login'
import type { LoginMethod, LoginResult } from '@/api/modules/login'
import { setToken, setUserInfo } from '@/api/core/token'
import type { LoginCore, EmitFn } from './useLoginCore'

/** OAuth 登录成功：持久化 token + 用户信息（供请求拦截器与「我的」页使用） */
function persistOAuth(result: LoginResult) {
  setToken(result.token)
  setUserInfo(result.userInfo)
}

export interface OAuthOptions extends LoginCore {
  demoMode: boolean
  emit: EmitFn
  /** 当前激活方式（error 事件回传用） */
  activeMethod: { value: LoginMethod }
}

export function useOAuthLogin(opts: OAuthOptions) {
  const { loading, toast, emit, demoMode, activeMethod } = opts
  let oauthPopup: Window | null = null
  let oauthCloseTimer: ReturnType<typeof setInterval> | null = null

  /** 是否移动端环境（弹窗多不可用，需整页跳转） */
  function isMobile(): boolean {
    return /Android|iPhone|iPad|iPod|Mobile|MicroMessenger|wxwork/i.test(navigator.userAgent)
  }

  /** 整页跳转授权：记录返回地址后跳转 */
  function redirectOAuth(url: string) {
    try {
      sessionStorage.setItem('oauth_return', location.href)
    } catch {
      /* 忽略存储失败 */
    }
    window.location.href = url
  }

  /** 整页跳转（移动端）授权回来后，从 sessionStorage 恢复结果 */
  function restoreOAuthFromSession() {
    let raw: string | null = null
    try {
      raw = sessionStorage.getItem('oauth_result')
      if (raw) {
        sessionStorage.removeItem('oauth_result')
        sessionStorage.removeItem('oauth_return')
      }
    } catch {
      raw = null
    }
    if (!raw) return
    try {
      const d = JSON.parse(raw) as { type?: string; result?: LoginResult; message?: string }
      if (d.type === 'oauth-success' && d.result) {
        persistOAuth(d.result) // 持久化 token + 用户信息
        toast('登录成功')
        emit('success', d.result)
      } else if (d.type === 'oauth-error') {
        const msg = d.message || '授权失败'
        toast(msg)
        emit('error', { method: activeMethod.value, message: msg })
      }
    } catch {
      /* 忽略解析失败 */
    }
  }

  /** 子窗口 postMessage 回调 */
  function onOAuthMessage(e: MessageEvent) {
    const d = e.data as { type?: string; result?: LoginResult; message?: string } | null
    if (!d || (d.type !== 'oauth-success' && d.type !== 'oauth-error')) return
    if (oauthCloseTimer) {
      clearInterval(oauthCloseTimer)
      oauthCloseTimer = null
    }
    oauthPopup = null
    if (d.type === 'oauth-success' && d.result) {
      persistOAuth(d.result) // 持久化 token + 用户信息
      closeToast()
      toast('登录成功')
      loading.value = false
      emit('success', d.result)
    } else {
      closeToast()
      const msg = d.message || '授权失败'
      toast(msg)
      loading.value = false
      emit('error', { method: activeMethod.value, message: msg })
    }
  }

  function openOAuthPopup(url: string, method: LoginMethod) {
    loading.value = true
    showLoadingToast({ message: '请在弹窗中扫码 / 授权…', forbidClick: true, duration: 0 })
    // 移动端优先整页跳转
    if (isMobile()) {
      redirectOAuth(url)
      return
    }
    oauthPopup = window.open(url, 'oauth_' + method, 'width=420,height=560')
    if (!oauthPopup) {
      // 弹窗被拦截 → 整页跳转兜底
      redirectOAuth(url)
      return
    }
    // 监听用户手动关闭弹窗
    oauthCloseTimer = setInterval(() => {
      if (oauthPopup && oauthPopup.closed) {
        if (oauthCloseTimer) clearInterval(oauthCloseTimer)
        oauthCloseTimer = null
        oauthPopup = null
        if (loading.value) {
          closeToast()
          loading.value = false
          toast('已取消授权')
        }
      }
    }, 800)
  }

  async function onOAuth(method: LoginMethod) {
    try {
      const url =
        method === 'wechat'
          ? await getWechatAuthorizeUrl(demoMode)
          : await getWecomAuthorizeUrl(demoMode)
      openOAuthPopup(url.url, method)
    } catch (e: any) {
      toast(e?.message || '获取授权地址失败')
    }
  }

  onMounted(() => {
    window.addEventListener('message', onOAuthMessage)
    restoreOAuthFromSession()
  })
  onUnmounted(() => {
    if (oauthCloseTimer) clearInterval(oauthCloseTimer)
    window.removeEventListener('message', onOAuthMessage)
    if (oauthPopup && !oauthPopup.closed) oauthPopup.close()
  })

  return { onOAuth, isMobile }
}
