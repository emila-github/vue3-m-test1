/**
 * 登录配置解析（useLoginConfig）
 * ---------------------------------------------------------------
 * 负责「有哪些登录方式 / 默认哪种 / 标题副标题」，并维护当前激活方式 activeMethod。
 *
 * 配置优先级：props 覆盖  >  后端 GET /login/config  >  内置默认值。
 *   - 表单类（卡片内胶囊 Tab）：sms 验证码、password 密码
 *   - OAuth 类（底部「其他方式」）：wechat 微信、wecom 企业微信
 *
 * 若默认方式是 OAuth 且存在表单方式，会自动回退到第一个表单方式
 * （OAuth 入口放在底部，不适合做初始 Tab）。
 */
import { ref, computed, watch } from 'vue'
import { getLoginConfig } from '@/api/modules/login'
import type { LoginMethod, LoginConfig } from '@/api/modules/login'

/** 登录方式固定展示顺序：决定 Tab / 图标排列 */
export const ORDER: LoginMethod[] = ['sms', 'password', 'wechat', 'wecom']

/** 每种方式的元信息（标题、图标、主题色、可选字形） */
export const METHOD_META: Record<
  LoginMethod,
  { title: string; icon: string; color: string; glyph?: string }
> = {
  sms: { title: '验证码', icon: 'comment-o', color: '#1989fa' },
  password: { title: '密码', icon: 'lock', color: '#07c160' },
  wechat: { title: '微信', icon: 'wechat', color: '#07c160' },
  wecom: { title: '企业微信', icon: '', color: '#2e7be4', glyph: '企' },
}

export interface LoginConfigProps {
  enabledMethods?: LoginMethod[]
  defaultMethod?: LoginMethod
  title?: string
  subtitle?: string
  autoFetchConfig?: boolean
}

export function useLoginConfig(props: LoginConfigProps) {
  const serverConfig = ref<LoginConfig | null>(null)

  /** 实际可用的登录方式（按 ORDER 排序） */
  const availableMethods = computed<LoginMethod[]>(() => {
    const list = props.enabledMethods ?? serverConfig.value?.enabledMethods ?? ORDER
    return ORDER.filter((m) => list.includes(m))
  })

  /** 默认选中方式 */
  const resolvedDefault = computed<LoginMethod>(
    () => props.defaultMethod ?? serverConfig.value?.defaultMethod ?? 'sms',
  )

  const title = computed(
    () => props.title ?? serverConfig.value?.title ?? '欢迎使用中国人保APP',
  )
  const subtitle = computed(
    () => props.subtitle ?? serverConfig.value?.subtitle ?? '首次登录将自动为您创建账号',
  )

  /** 表单类（卡片 Tab 内） */
  const formMethods = computed<LoginMethod[]>(() =>
    availableMethods.value.filter((m) => m === 'sms' || m === 'password'),
  )
  /** OAuth 类（底部「其他方式」） */
  const oauthMethods = computed<LoginMethod[]>(() =>
    availableMethods.value.filter((m) => m === 'wechat' || m === 'wecom'),
  )

  /** 当前激活的登录方式 */
  const activeMethod = ref<LoginMethod>('sms')

  function switchTo(m: LoginMethod) {
    activeMethod.value = m
  }

  // 可用方式 / 默认方式变化时，修正激活方式（OAuth 默认回退到表单）
  watch(
    [availableMethods, resolvedDefault],
    () => {
      const target = resolvedDefault.value
      if ((target === 'wechat' || target === 'wecom') && formMethods.value.length > 0) {
        activeMethod.value = formMethods.value[0]
      } else if (formMethods.value.includes(target)) {
        activeMethod.value = target
      } else {
        activeMethod.value = formMethods.value[0] || availableMethods.value[0] || 'sms'
      }
    },
    { immediate: true },
  )

  /** 拉取后端配置（失败静默，使用内置默认值） */
  async function fetchConfig() {
    if (!props.autoFetchConfig) return
    try {
      serverConfig.value = await getLoginConfig()
    } catch {
      /* 拉取失败则用内置默认值 */
    }
  }

  return {
    serverConfig,
    availableMethods,
    resolvedDefault,
    title,
    subtitle,
    formMethods,
    oauthMethods,
    activeMethod,
    switchTo,
    fetchConfig,
  }
}
