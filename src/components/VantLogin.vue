<script setup lang="ts">
/**
 * VantLogin —— 可配置的 Vant4 登录组件
 *
 * 支持四种登录方式，按「表单类 / OAuth 类」分组：
 *   - 表单类（卡片内胶囊 Tab）：sms 验证码登录、password 密码登录
 *   - OAuth 类（底部其他方式）：wechat 微信、wecom 企业微信
 * 另含「找回密码」弹窗（手机号 + 验证码 + 新密码）。
 *
 * 各登录方式逻辑已拆分为独立组合式函数（src/composables/login/*），
 * 修改某一种登录只需改对应文件，互不影响（详见 md/VantLogin登录说明.md）。
 *
 * 配置来源优先级：props 覆盖  >  后端 GET /login/config  >  内置默认值。
 *
 * 用法：
 *   <VantLogin @success="onLogin" />
 *   <VantLogin :enabled-methods="['wecom','sms']" :default-method="'sms'" />
 */
import { ref, onMounted } from 'vue'
import VantSliderVerify from './VantSliderVerify.vue'
import {
  METHOD_META,
  useLoginCore,
  useLoginConfig,
  useSmsLogin,
  usePasswordLogin,
  useOAuthLogin,
  useForgotPassword,
} from '@/composables/login'
import type { LoginMethod, LoginConfig, LoginResult } from '@/api/modules/login'

const props = withDefaults(
  defineProps<{
    /** 覆盖后端：仅启用的登录方式 */
    enabledMethods?: LoginMethod[]
    /** 覆盖后端：默认选中的登录方式 */
    defaultMethod?: LoginMethod
    /** 登录页标题（覆盖后端） */
    title?: string
    /** 登录页副标题（覆盖后端） */
    subtitle?: string
    /** 是否自动拉取后端配置 */
    autoFetchConfig?: boolean
    /** logo 图片地址 */
    logo?: string
    /** 验证码倒计时秒数（可配置，默认 60） */
    smsCountdown?: number
    /** 强制演示降级：即使配置了真实凭证，也走降级流程（本地预览登录信息用） */
    demoMode?: boolean
    /** 是否展示「忘记密码」入口（可配置，默认开启） */
    forgotPassword?: boolean
  }>(),
  {
    enabledMethods: undefined,
    defaultMethod: undefined,
    title: undefined,
    subtitle: undefined,
    autoFetchConfig: true,
    logo: '',
    smsCountdown: 60,
    demoMode: false,
    forgotPassword: true,
  },
)

const emit = defineEmits<{
  success: [result: LoginResult]
  error: [payload: { method: LoginMethod; message: string }]
}>()

// ============================================================
// 方法说明（本组件仅做「编排」，具体逻辑见对应 composable）
// ------------------------------------------------------------
//   useLoginCore        → loading / toast / doLogin
//                          统一的 loading 态 + 居中提示 + 登录结果派发
//   useLoginConfig     → title / subtitle / formMethods / oauthMethods
//                          / activeMethod / switchTo / fetchConfig
//                          解析可用登录方式、当前激活方式、标题副标题
//   useSmsLogin        → smsForm / sliderVerified / countdown
//                          / onSendCode / onSmsSubmit
//                          短信验证码登录（滑块校验 + 60s 倒计时）
//   usePasswordLogin   → pwdForm / captchaSvg / refreshCaptcha
//                          / onPasswordSubmit
//                          密码登录（含图形验证码）
//   useOAuthLogin      → onOAuth
//                          微信 / 企业微信扫码授权（弹窗或整页跳转）
//   useForgotPassword  → showForgot / resetForm / resetCountdown
//                          / onSendResetCode / onResetSubmit
//                          找回密码弹窗（手机号 + 滑块 + 验证码 + 新密码）
// ============================================================

// ====== 核心（loading / toast / doLogin / 结果派发）======
const core = useLoginCore(emit)
const { loading } = core

// ====== 配置解析（可用方式 / 默认 / 标题 / 激活方式）======
const { title, subtitle, formMethods, oauthMethods, activeMethod, switchTo, fetchConfig } =
  useLoginConfig(props)

// ====== 短信验证码登录 ======
const {
  smsForm,
  sliderComp,
  sliderVerified,
  countdown,
  codeBtnDisabled,
  codeBtnReason,
  onSendCode,
  onSmsSubmit,
} = useSmsLogin(core, props.smsCountdown)

// ====== 密码登录 ======
const { pwdForm, captchaSvg, refreshCaptcha, onPasswordSubmit } = usePasswordLogin(core)

// ====== 微信 / 企业微信 OAuth ======
const { onOAuth } = useOAuthLogin({ ...core, demoMode: props.demoMode, emit, activeMethod })

// ====== 找回密码 ======
const {
  showForgot,
  resetForm,
  resetSliderComp,
  resetSliderVerified,
  resetCountdown,
  resetCodeDisabled,
  resetCodeReason,
  onSendResetCode,
  onResetSubmit,
} = useForgotPassword(core, { goPassword: () => (activeMethod.value = 'password') })

const agreeChecked = ref(true)

// 初始化：① 拉取登录配置（后端 GET /login/config，失败则用内置默认值）
//          ② 拉取密码登录图形验证码（captchaSvg 用于模板渲染）
onMounted(() => {
  fetchConfig()
  refreshCaptcha()
})
</script>

<template>
  <div class="vant-login">
    <!-- ====== 顶部标题区 ====== -->
    <div class="login-header">
      <div v-if="logo" class="login-logo-img">
        <img :src="logo" alt="logo" />
      </div>
      <div v-else class="login-brand">PICC</div>
      <h1 class="login-title">{{ title }}</h1>
      <p class="login-subtitle">{{ subtitle }}</p>
    </div>

    <!-- ====== 卡片式登录表单（自定义胶囊 Tab） ====== -->
    <div class="login-card">
      <!-- 胶囊 Tab 切换器（仅 sms / password 时显示） -->
      <div v-if="formMethods.length > 1" class="card-tabs">
        <button
          v-for="(m, i) in formMethods"
          :key="m"
          class="card-tab"
          :class="{ 'card-tab--active': activeMethod === m }"
          @click="switchTo(m)"
        >
          {{ m === 'sms' ? '验证码登录' : '密码登录' }}
        </button>
      </div>

      <!-- ========== 验证码登录 ========== -->
      <van-form v-if="activeMethod === 'sms'" @submit="onSmsSubmit" class="card-form">
        <div class="card-field">
          <van-icon name="phone-o" class="field-icon" />
          <input
            v-model="smsForm.phone"
            type="tel"
            maxlength="11"
            class="field-input"
            placeholder="请输入手机号"
          />
        </div>
        <VantSliderVerify ref="sliderComp" v-model="sliderVerified" :disabled="countdown > 0" />
        <div class="card-field">
          <van-icon name="shield-o" class="field-icon" />
          <input
            v-model="smsForm.code"
            type="digit"
            maxlength="6"
            class="field-input"
            placeholder="输入短信验证码"
          />
          <button
            type="button"
            class="code-btn"
            :class="{ 'code-btn--disabled': codeBtnDisabled }"
            @click="onSendCode"
          >
            {{ countdown > 0 ? `${countdown}s 后重发` : '获取验证码' }}
          </button>
        </div>

        <button type="submit" class="submit-btn" :class="{ loading }">登录</button>

        <label class="agreement">
          <van-checkbox
            v-model="agreeChecked"
            shape="circle"
            checked-color="var(--van-primary-color)"
            icon-size="14px"
          />
          <span
            >已阅读并同意<a href="#">《中国人保服务协议》</a>和<a href="#">《隐私政策》</a></span
          >
        </label>
      </van-form>

      <!-- ========== 密码登录 ========== -->
      <van-form
        v-else-if="activeMethod === 'password'"
        @submit="onPasswordSubmit"
        class="card-form"
      >
        <div class="card-field">
          <van-icon name="contact" class="field-icon" />
          <input v-model="pwdForm.account" class="field-input" placeholder="手机号 / 工号" />
        </div>
        <div class="card-field">
          <van-icon name="lock" class="field-icon" />
          <input
            v-model="pwdForm.password"
            type="password"
            class="field-input"
            placeholder="请输入密码"
          />
        </div>
        <div class="card-field">
          <van-icon name="shield-o" class="field-icon" />
          <input
            v-model="pwdForm.captcha"
            class="field-input"
            maxlength="4"
            placeholder="请输入右侧图形验证码"
          />
          <span class="captcha-img" @click="refreshCaptcha">
            <span v-if="!captchaSvg" class="captcha-loading">点击刷新</span>
            <span v-else v-html="captchaSvg"></span>
          </span>
        </div>

        <button type="submit" class="submit-btn" :class="{ loading }">登录</button>
        <button v-if="forgotPassword" type="button" class="forgot-link" @click="showForgot = true">
          忘记密码？
        </button>

        <label class="agreement">
          <van-checkbox
            v-model="agreeChecked"
            shape="circle"
            checked-color="var(--van-primary-color)"
            icon-size="14px"
          />
          <span
            >已阅读并同意<a href="#">《中国人保服务协议》</a>和<a href="#">《隐私政策》</a></span
          >
        </label>
      </van-form>
    </div>

    <!-- ====== 底部：其他方式登录 ====== -->
    <div v-if="oauthMethods.length > 0" class="other-login">
      <div class="other-divider">
        <span>其他方式登录</span>
      </div>
      <div class="other-icons">
        <button
          v-for="m in oauthMethods"
          :key="m"
          class="oauth-icon-btn"
          :style="{ background: METHOD_META[m].color }"
          @click="onOAuth(m)"
        >
          <svg v-if="m === 'wechat'" viewBox="0 0 24 24" fill="#fff" class="oauth-svg">
            <path
              d="M9.5 4C5.36 4 2 6.69 2 10c0 1.89 1.08 3.56 2.78 4.66L4 17l2.5-1.5c.86.26 1.77.4 2.72.41A5.7 5.7 0 019 14c0-3.31 3.13-6 7-6 .34 0 .67.02 1 .06C16.47 5.61 13.28 4 9.5 4zm-2.88 4.38a1 1 0 110-2 1 1 0 010 2zm5.76 0a1 1 0 110-2 1 1 0 010 2zM16 9c-3.31 0-6 2.24-6 5s2.69 5 6 5c.67 0 1.31-.1 1.91-.27L20 20l-.54-2.14C21.15 16.93 22 15.55 22 14c0-2.76-2.69-5-6-5zm-2.5 3.25a.88.88 0 110-1.75.88.88 0 010 1.75zm5 0a.88.88 0 110-1.75.88.88 0 010 1.75z"
            />
          </svg>
          <span v-else-if="m === 'wecom'" class="oauth-glyph">{{ METHOD_META[m].glyph }}</span>
          <van-icon v-else :name="METHOD_META[m].icon" color="#fff" size="22" />
        </button>
      </div>
    </div>

    <!-- 找回密码弹窗 -->
    <van-dialog
      v-model:show="showForgot"
      title="找回密码"
      :show-confirm-button="false"
      class="forgot-dialog"
    >
      <van-form @submit="onResetSubmit">
        <van-cell-group inset>
          <van-field
            v-model="resetForm.phone"
            type="tel"
            maxlength="11"
            label="手机号"
            placeholder="请输入手机号"
          />
          <VantSliderVerify
            ref="resetSliderComp"
            v-model="resetSliderVerified"
            :disabled="resetCountdown > 0"
          />
          <van-field
            v-model="resetForm.code"
            type="digit"
            maxlength="6"
            label="验证码"
            placeholder="请输入验证码"
          >
            <template #button>
              <van-button
                size="small"
                type="primary"
                :class="{ 'code-btn--disabled': resetCodeDisabled }"
                @click="onSendResetCode"
              >
                {{ resetCountdown > 0 ? `${resetCountdown}s 后重发` : '获取验证码' }}
              </van-button>
            </template>
          </van-field>
          <van-field
            v-model="resetForm.newPassword"
            type="password"
            label="新密码"
            placeholder="8-20 位新密码"
            maxlength="20"
          />
        </van-cell-group>
        <div class="login-action">
          <van-button round block type="primary" native-type="submit" :loading="loading">
            重置密码
          </van-button>
          <van-button
            round
            block
            plain
            type="primary"
            class="forgot-cancel"
            @click="showForgot = false"
          >
            取消
          </van-button>
        </div>
      </van-form>
    </van-dialog>
  </div>
</template>

<style scoped>
/* ====== 页面根容器：粉红渐变背景 ====== */
.vant-login {
  max-width: 480px;
  min-height: 100vh;
  margin: 0 auto;
  padding: 0 20px 24px;
  background: var(--app-login-gradient);
  box-sizing: border-box;
}

/* ====== 顶部标题区 ====== */
.login-header {
  padding: 48px 0 28px;
}
.login-brand {
  display: inline-block;
  font-size: 26px;
  font-weight: 800;
  color: var(--van-primary-color);
  letter-spacing: 3px;
  line-height: 1;
  margin-bottom: 12px;
}
.login-logo-img img {
  height: 42px;
  width: auto;
  object-fit: contain;
  margin-bottom: 10px;
}
.login-title {
  margin: 4px 0 6px;
  font-size: 22px;
  color: #1a1a1a;
  font-weight: 600;
  line-height: 1.3;
}
.login-subtitle {
  margin: 0;
  font-size: 13px;
  color: #999;
}

/* ====== 卡片式登录表单 ====== */
.login-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(var(--app-primary-rgb), 0.07);
  overflow: hidden;
}

/* --- 胶囊 Tab 切换器（仿截图） --- */
.card-tabs {
  display: flex;
  padding: 0 6px 0;
  gap: 0;
}
.card-tab {
  flex: 1;
  padding: 13px 0;
  border: none;
  border-radius: 22px 22px 0 0;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s;
  text-align: center;
  background: transparent;
  color: var(--van-primary-color);
  position: relative;
}
.card-tab--active {
  background: linear-gradient(135deg, var(--app-primary-deep), var(--van-primary-color));
  color: #fff;
}
.card-tab:not(.card-tab--active):hover {
  color: var(--app-primary-deep);
}

/* --- 表单内容 --- */
.card-form {
  padding: 20px 20px 16px;
}

/* 自定义输入行（无 van-field 边框） */
.card-field {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #eee;
  padding: 12px 0;
  gap: 10px;
  position: relative;
}
.card-field + .card-field {
  margin-top: 4px;
}
.field-icon {
  color: #ccc;
  font-size: 20px;
  flex-shrink: 0;
  width: 24px;
  text-align: center;
}
.field-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 15px;
  color: #333;
  background: transparent;
  min-width: 0;
}
.field-input::placeholder {
  color: #bbb;
  font-size: 14px;
}

/* 验证码按钮（右侧） */
.code-btn {
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: var(--van-primary-color);
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
  padding: 4px 8px;
}
.code-btn--disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* 图形验证码 */
.captcha-img {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 90px;
  height: 34px;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  background: #f7f8fa;
}
.captcha-img :deep(svg) {
  display: block;
  width: 90px;
  height: 34px;
}
.captcha-loading {
  color: #bbb;
  font-size: 12px;
}

/* 登录按钮（浅红填充，仿截图） */
.submit-btn {
  display: block;
  width: 100%;
  margin-top: 28px;
  padding: 13px 0;
  border: none;
  border-radius: 25px;
  font-size: 17px;
  font-weight: 600;
  color: var(--van-primary-color);
  background: rgba(var(--app-primary-rgb), 0.08);
  cursor: pointer;
  transition: background 0.2s;
}
.submit-btn:hover,
.submit-btn:active {
  background: rgba(var(--app-primary-rgb), 0.14);
}
.submit-btn.loading {
  opacity: 0.6;
  pointer-events: none;
}

/* 忘记密码链接 */
.forgot-link {
  display: block;
  width: 100%;
  margin-top: 14px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--van-primary-color);
  font-size: 13px;
  text-align: right;
  cursor: pointer;
}

/* 协议勾选 */
.agreement {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 16px;
  font-size: 12px;
  color: #999;
  cursor: pointer;
  line-height: 1.5;
}
.agreement :deep(.van-checkbox) {
  padding-top: 1px;
}
.agreement a {
  color: var(--van-primary-color);
  text-decoration: none;
}

/* ====== 底部：其他方式登录 ====== */
.other-login {
  padding: 32px 0 8px;
}
.other-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #bbb;
  font-size: 13px;
  margin-bottom: 24px;
}
.other-divider::before,
.other-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e5e5e5;
}
.other-icons {
  display: flex;
  justify-content: center;
  gap: 36px;
}
.oauth-icon-btn {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    transform 0.15s,
    opacity 0.15s;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}
.oauth-icon-btn:hover {
  opacity: 0.85;
  transform: scale(1.06);
}
.oauth-icon-btn:active {
  transform: scale(0.96);
}
.oauth-svg {
  width: 24px;
  height: 24px;
}
.oauth-glyph {
  color: #fff;
  font-size: 17px;
  font-weight: 700;
}

/* ====== 找回密码弹窗 ====== */
.forgot-cancel {
  margin-top: 12px;
}
.login-action {
  padding: 16px 16px 4px;
}

/* 滑块组件在卡片内的间距调整 */
.card-form :deep(.slider-verify) {
  padding: 8px 0 4px;
}
</style>
