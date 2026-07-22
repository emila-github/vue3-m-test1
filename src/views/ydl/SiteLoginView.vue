<script setup lang="ts">
/**
 * SiteLoginView（ydl 站点登录页）
 * 提供两种登录方式（对齐旧站）：
 *   - 企业微信：无 code 时整页跳授权；回调带 code 时自动换 token 并拉权限
 *   - 普通登录：账号 + 图形验证码 + md5 密码
 * 登录成功后跳 redirect（默认 /ydl）。
 *
 * UI 参考 VantLogin.vue（胶囊 Tab + 白卡 + 浅红药丸按钮 + PICC 粉红渐变）。
 */
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showLoadingToast, closeToast } from 'vant'
import { useSiteWecomLogin } from '@/composables/ydl/useSiteWecomLogin'
import { useSitePasswordLogin } from '@/composables/ydl/useSitePasswordLogin'

const route = useRoute()
const router = useRouter()
const wecom = useSiteWecomLogin()
const { captchaItems, loading: pwdLoading, refreshCaptcha, submit: submitPwd } = useSitePasswordLogin()

const activeTab = ref<'wecom' | 'password'>('wecom')
const username = ref('')
const password = ref('')
const captcha = ref('')
const socialId = ref('') // 企业微信未绑定时回传，普通登录时带上去绑定

const redirect = (route.query.redirect as string) || '/ydl'

// 进入页面即拉取一次验证码，切到账号登录 Tab 时直接显示
refreshCaptcha()

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

/** 企业微信按钮点击：无 code → 整页跳授权（start 内部处理） */
function onWecomClick() {
  // start() 在无 code 时会 location.href 跳转，不会返回
  wecom.start().catch((e) => showToast(e?.message || '企业微信授权失败'))
}

onMounted(async () => {
  // 回跳携带 code：自动换 token 并拉权限
  const code = new URL(location.href).searchParams.get('code')
  if (code) {
    showLoadingToast({ message: '企业微信登录中...', forbidClick: true })
    const res = await wecom.start()
    closeToast()
    if (res.ok) {
      showToast('登录成功')
      router.replace(redirect)
    } else if (res.code === '01') {
      // 未绑定：切到普通登录，带上 socialId 用于绑定
      socialId.value = res.socialId || ''
      activeTab.value = 'password'
      showToast('请先绑定账号')
    } else {
      showToast(res.msg || '企业微信登录失败')
    }
  }
})
</script>

<template>
  <div class="site-login">
    <!-- ====== 顶部标题区 ====== -->
    <header class="login-header">
      <div class="login-brand">
        <span class="brand-mark">源</span>
        <span class="brand-text">源动力平台</span>
      </div>
      <h1 class="login-title">福建源动力平台</h1>
      <p class="login-subtitle">站点登录</p>
    </header>

    <!-- ====== 卡片式登录（胶囊 Tab） ====== -->
    <div class="login-card">
      <div class="card-tabs">
        <button
          class="card-tab"
          :class="{ 'card-tab--active': activeTab === 'wecom' }"
          @click="activeTab = 'wecom'"
        >企业微信</button>
        <button
          class="card-tab"
          :class="{ 'card-tab--active': activeTab === 'password' }"
          @click="activeTab = 'password'"
        >账号登录</button>
      </div>

      <!-- 企业微信 -->
      <div v-show="activeTab === 'wecom'" class="card-form">
        <button type="button" class="submit-btn wecom-btn" @click="onWecomClick">
          <van-icon name="wechat" /> 企业微信扫码登录
        </button>
        <p class="tip">点击后跳转企业微信授权，授权后自动回登录页完成登录。</p>
      </div>

      <!-- 账号登录 -->
      <van-form v-show="activeTab === 'password'" @submit="onSubmitPassword" class="card-form">
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
          <input v-model="captcha" class="field-input" maxlength="4" placeholder="请输入图形验证码" />
          <span class="captcha-box" title="点击刷新验证码" @click="refreshCaptcha">
            <template v-if="captchaItems.length">
              <i
                v-for="(it, i) in captchaItems"
                :key="i"
                :style="{ color: it.color, transform: `rotate(${it.rotate}deg)` }"
              >{{ it.ch }}</i>
            </template>
            <span v-else class="captcha-loading">点击刷新</span>
          </span>
        </div>
        <button type="submit" class="submit-btn" :class="{ loading: pwdLoading }">登录</button>
        <p v-if="socialId" class="bind-tip">检测到企业微信未绑定账号，登录后将自动绑定</p>
      </van-form>
    </div>
  </div>
</template>

<style scoped>
/* ====== 页面根容器：PICC 粉红渐变背景 ====== */
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

/* 胶囊 Tab 切换器 */
.card-tabs {
  display: flex;
  padding: 0 6px;
}
.card-tab {
  flex: 1;
  padding: 13px 0;
  border: none;
  border-radius: 22px 22px 0 0;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  color: #d71920;
  transition: all 0.25s;
}
.card-tab--active {
  background: linear-gradient(135deg, #e88a91, #d71920);
  color: #fff;
}

/* 表单内容 */
.card-form {
  padding: 20px 20px 16px;
}

/* 自定义输入行（无边框，底部细线） */
.card-field {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #eee;
  padding: 12px 0;
  gap: 10px;
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

/* 图形验证码（内联 DOM 渲染，确保一定可见） */
.captcha-box {
  position: relative;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 104px;
  height: 40px;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  background: linear-gradient(135deg, #fafafa, #f0f0f0);
  user-select: none;
  box-shadow: inset 0 0 0 1px #eee;
}
/* 干扰线（两条斜穿的细线） */
.captcha-box::before {
  content: '';
  position: absolute;
  left: -10%;
  top: 55%;
  width: 120%;
  height: 1.5px;
  background: rgba(215, 25, 32, 0.35);
  transform: rotate(-12deg);
}
.captcha-box::after {
  content: '';
  position: absolute;
  left: -10%;
  top: 30%;
  width: 120%;
  height: 1.2px;
  background: rgba(21, 101, 192, 0.3);
  transform: rotate(8deg);
}
.captcha-box i {
  position: relative;
  z-index: 1;
  font-style: normal;
  font-size: 23px;
  font-weight: 900;
  font-family: Arial, Helvetica, sans-serif;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.08);
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
.wecom-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
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
