<script setup lang="ts">
/**
 * SiteLoginView（ydl 站点登录页）
 * UI 参考 VantLogin 组件（白卡 + 胶囊 Tab + 自定义图标输入行 + 浅红药丸按钮）。
 *
 * 提供两种登录方式（对齐旧站）：
 *   - 企业微信：左侧 Tab，无 code 时整页跳授权；回调带 code 时自动换 token 并拉权限
 *   - 普通登录：右侧 Tab，账号 + 图形验证码 + md5 密码
 * 登录成功后跳 redirect（默认 /ydl）。
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showLoadingToast, closeToast } from 'vant'
import { useSiteWecomLogin, type WecomLoginResult } from '@/composables/ydl/useSiteWecomLogin'
import { useSitePasswordLogin } from '@/composables/ydl/useSitePasswordLogin'

const route = useRoute()
const router = useRouter()
const wecom = useSiteWecomLogin()
const {
  captchaImg,
  loading: pwdLoading,
  refreshCaptcha,
  submit: submitPwd,
} = useSitePasswordLogin()

const activeTab = ref<'wecom' | 'password'>('wecom')
const username = ref('')
const password = ref('')
const captcha = ref('')
const socialId = ref('') // 企业微信未绑定时回传，普通登录时带上去绑定

const redirect = (route.query.redirect as string) || '/ydl'

// 根据 base64 头部推断真实图片 MIME（后端返回 PNG，mock 返回 SVG，不能写死 gif）
const captchaSrc = computed(() => {
  if (!captchaImg.value) return ''
  const head = captchaImg.value.slice(0, 8)
  let mime = 'image/gif'
  if (head.startsWith('iVBOR')) mime = 'image/png'
  else if (head.startsWith('/9j/')) mime = 'image/jpeg'
  else if (head.startsWith('R0lGOD')) mime = 'image/gif'
  else if (head.startsWith('PHN2') || head.startsWith('PD94')) mime = 'image/svg+xml'
  return `data:${mime};base64,${captchaImg.value}`
})

/** 普通登录提交 */
async function onSubmitPassword() {
  if (!username.value || !password.value || !captcha.value) {
    showToast('请输入账号、密码和验证码')
    return
  }
  try {
    showLoadingToast({ message: '登录中...', forbidClick: true })
    await submitPwd({
      username: username.value,
      password: password.value,
      captcha: captcha.value,
      socialId: socialId.value || undefined,
    })
    closeToast()
    showToast('登录成功')
    router.replace(redirect)
  } catch (e: any) {
    closeToast()
    showToast(e?.message || '登录失败')
    refreshCaptcha() // 刷新验证码
  }
}

/** 企业微信登录结果统一处理：成功跳 redirect / 未绑定切密码 Tab 带 socialId / 其它提示。
 *  onWecomClick（无 code 跳转后回跳）与 onMounted（回跳带 code）共用，避免结果分支重复。 */
function finishWecom(res: WecomLoginResult) {
  if (res.ok) {
    showToast('登录成功')
    router.replace(redirect)
  } else if (res.code === '01') {
    // 未绑定：切到普通登录，带上 socialId 用于绑定
    socialId.value = res.socialId || ''
    activeTab.value = 'password'
    showToast('请先绑定账号')
  } else if (res.code) {
    showToast(res.msg || '企业微信登录失败')
  }
}

/** 企业微信按钮点击：无 code → 整页跳授权（start 内部 location.href 并 return，不会进 finishWecom）；
 *  带 code 回跳 → start 换 token 后把结果交给 finishWecom 统一处理。 */
function onWecomClick() {
  wecom.start().then(finishWecom).catch((e) => showToast(e?.message || '企业微信授权失败'))
}

onMounted(async () => {
  // 进入页面即拉取一次验证码，切到账号登录 Tab 时直接显示
  refreshCaptcha()
  // 回跳携带 code：自动换 token 并拉权限
  const code = new URL(location.href).searchParams.get('code')
  if (!code) return
  showLoadingToast({ message: '企业微信登录中...', forbidClick: true })
  try {
    const res = await wecom.start()
    finishWecom(res)
  } finally {
    closeToast()
  }
})
</script>

<template>
  <div class="site-login">
    <!-- ====== 顶部标题区 ====== -->
    <div class="login-header">
      <div class="login-brand">
        <span class="brand-mark">源</span>
        <span class="brand-text">源动力平台</span>
      </div>
      <h1 class="login-title">福建源动力平台</h1>
      <p class="login-subtitle">站点登录</p>
    </div>

    <!-- ====== 卡片式登录表单（胶囊 Tab 切换） ====== -->
    <div class="login-card">
      <!-- 胶囊 Tab 切换器：左 企业微信 / 右 密码 -->
      <div class="card-tabs">
        <button
          class="card-tab"
          :class="{ 'card-tab--active': activeTab === 'wecom' }"
          @click="activeTab = 'wecom'"
        >
          企业微信登录
        </button>
        <button
          class="card-tab"
          :class="{ 'card-tab--active': activeTab === 'password' }"
          @click="activeTab = 'password'"
        >
          密码登录
        </button>
      </div>

      <!-- ========== 企业微信登录 ========== -->
      <div v-if="activeTab === 'wecom'" class="card-form tab-body">
        <button type="button" class="submit-btn" @click="onWecomClick">企业微信登录</button>
        <p class="tip">点击后跳转企业微信授权，授权后自动回登录页完成登录。</p>
        <p v-if="socialId" class="bind-tip">检测到企业微信未绑定账号，登录后将自动绑定</p>
      </div>

      <!-- ========== 账号密码登录 ========== -->
      <div v-else class="card-form">
        <div class="card-field">
          <van-icon name="contact" class="field-icon" />
          <input v-model="username" class="field-input" placeholder="请输入账号" />
        </div>
        <div class="card-field">
          <van-icon name="lock" class="field-icon" />
          <input v-model="password" type="password" class="field-input" placeholder="请输入密码" />
        </div>
        <div class="card-field">
          <van-icon name="shield-o" class="field-icon" />
          <input
            v-model="captcha"
            class="field-input"
            maxlength="4"
            placeholder="请输入右侧图形验证码"
          />
          <span class="captcha-img" title="点击刷新验证码" @click="refreshCaptcha">
            <img v-if="captchaImg" :src="captchaSrc" class="captcha-svg-img" alt="图形验证码" />
            <span v-else class="captcha-loading">加载中</span>
          </span>
        </div>

        <button
          type="button"
          class="submit-btn"
          :class="{ loading: pwdLoading }"
          @click="onSubmitPassword"
        >
          登录
        </button>
        <p v-if="socialId" class="bind-tip">检测到企业微信未绑定账号，登录后将自动绑定</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ====== 页面根容器：粉红渐变背景 ====== */
.site-login {
  max-width: 480px;
  min-height: 100vh;
  margin: 0 auto;
  padding: 0 20px 24px;
  box-sizing: border-box;
  background: linear-gradient(180deg, #fff1f2 0%, #fce7ec 40%, #f5e8ec 100%);
}

/* ====== 顶部标题区 ====== */
.login-header {
  padding: 48px 0 28px;
}
.login-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}
.brand-mark {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #d71920;
  color: #fff;
  font-size: 20px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}
.brand-text {
  font-size: 22px;
  font-weight: 800;
  color: #d71920;
  letter-spacing: 2px;
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
  box-shadow: 0 4px 20px rgba(215, 25, 32, 0.07);
  overflow: hidden;
}

/* --- 胶囊 Tab 切换器（仿 VantLogin） --- */
.card-tabs {
  display: flex;
  padding: 0 6px;
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
  color: #d71920;
  position: relative;
}
.card-tab--active {
  background: linear-gradient(135deg, #e88a91, #d71920);
  color: #fff;
}
.card-tab:not(.card-tab--active):hover {
  color: #b01418;
}

/* --- 表单内容 --- */
.card-form {
  padding: 20px 20px 16px;
}
.tab-body {
  text-align: center;
}

/* 自定义输入行（无边框，底部细线） */
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

/* 图形验证码（点击刷新） */
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
  user-select: none;
}
.captcha-svg-img {
  display: block;
  width: 90px;
  height: 34px;
  object-fit: contain;
}
.captcha-loading {
  color: #bbb;
  font-size: 12px;
}

/* 登录按钮（浅红填充药丸，对齐 VantLogin） */
.submit-btn {
  display: block;
  width: 100%;
  margin-top: 28px;
  padding: 13px 0;
  border: none;
  border-radius: 25px;
  font-size: 17px;
  font-weight: 600;
  color: #d71920;
  background: rgba(215, 25, 32, 0.08);
  cursor: pointer;
  transition: background 0.2s;
}
.submit-btn:hover,
.submit-btn:active {
  background: rgba(215, 25, 32, 0.14);
}
.submit-btn.loading {
  opacity: 0.6;
  pointer-events: none;
}

/* 提示文案 */
.tip {
  margin-top: 16px;
  font-size: 12px;
  color: #999;
  text-align: center;
}
.bind-tip {
  margin: 14px 0 0;
  font-size: 12px;
  color: #d71920;
  text-align: center;
}
</style>
