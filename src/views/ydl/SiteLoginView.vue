<script setup lang="ts">
/**
 * SiteLoginView（ydl 站点登录页）
 * 提供两种登录方式（对齐旧站）：
 *   - 企业微信：无 code 时整页跳授权；回调带 code 时自动换 token 并拉权限
 *   - 普通登录：账号 + 图形验证码 + md5 密码
 * 登录成功后跳 redirect（默认 /ydl）。
 */
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showLoadingToast, closeToast } from 'vant'
import { useSiteWecomLogin } from '@/composables/ydl/useSiteWecomLogin'
import { useSitePasswordLogin } from '@/composables/ydl/useSitePasswordLogin'

const route = useRoute()
const router = useRouter()
const wecom = useSiteWecomLogin()
const {
  captchaUrl,
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
    <header class="login-header">
      <div class="login-title">福建源动力平台</div>
      <div class="login-sub">站点登录</div>
    </header>

    <van-tabs v-model:active="activeTab" class="login-tabs" sticky>
      <!-- 企业微信登录 -->
      <van-tab title="企业微信" name="wecom">
        <div class="tab-body">
          <van-button block round type="primary" @click="onWecomClick">
            企业微信扫码登录
          </van-button>
          <p class="tip">点击后跳转企业微信授权，授权后自动回登录页完成登录。</p>
        </div>
      </van-tab>

      <!-- 普通登录 -->
      <van-tab title="账号登录" name="password">
        <div class="tab-body">
          <van-form @submit="onSubmitPassword">
            <van-cell-group inset>
              <van-field
                v-model="username"
                name="username"
                label="账号"
                placeholder="请输入账号"
                :rules="[{ required: true, message: '请填写账号' }]"
              />
              <van-field
                v-model="password"
                type="password"
                name="password"
                label="密码"
                placeholder="请输入密码"
                :rules="[{ required: true, message: '请填写密码' }]"
              />
              <van-field
                v-model="captcha"
                name="captcha"
                label="验证码"
                placeholder="请输入验证码"
                :rules="[{ required: true, message: '请填写验证码' }]"
              >
                <template #right-icon>
                  <img
                    v-if="captchaUrl"
                    class="captcha-img"
                    :src="captchaUrl"
                    alt="验证码"
                    @click="refreshCaptcha"
                  />
                  <van-button v-else size="mini" @click="refreshCaptcha">获取</van-button>
                </template>
              </van-field>
            </van-cell-group>
            <div class="submit-area">
              <van-button round block type="primary" native-type="submit" :loading="pwdLoading">
                登录
              </van-button>
            </div>
          </van-form>
        </div>
      </van-tab>
    </van-tabs>
  </div>
</template>

<style scoped>
.site-login {
  min-height: 100vh;
  background: #f5f6f8;
}
.login-header {
  background: linear-gradient(135deg, #07c160, #05a050);
  padding: 40px 20px 30px;
  color: #fff;
}
.login-title {
  font-size: 22px;
  font-weight: 800;
}
.login-sub {
  margin-top: 6px;
  font-size: 13px;
  opacity: 0.9;
}
.login-tabs {
  margin-top: -16px;
  border-radius: 16px 16px 0 0;
  overflow: hidden;
}
.tab-body {
  padding: 28px 16px;
}
.tip {
  margin-top: 16px;
  font-size: 12px;
  color: #999;
  text-align: center;
}
.captcha-img {
  width: 88px;
  height: 32px;
  cursor: pointer;
}
.submit-area {
  margin: 24px 16px 0;
}
</style>
