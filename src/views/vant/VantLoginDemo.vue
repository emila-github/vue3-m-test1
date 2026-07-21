<script setup lang="ts">
/**
 * VantLogin 登录组件演示
 *
 * 演示「可配置」能力：通过开关控制启用哪些登录方式、用单选指定默认方式，
 * 组件会实时响应 props 变化。
 */
import { ref, computed } from 'vue'
import { showDialog } from 'vant'
import VantLogin from '../../components/VantLogin.vue'
import type { LoginMethod, LoginResult } from '../../api/modules/login'

const allMethods: LoginMethod[] = ['sms', 'password', 'wechat', 'wecom']
const methodLabels: Record<LoginMethod, string> = {
  sms: '验证码登录',
  password: '密码登录',
  wechat: '微信登录',
  wecom: '企业微信登录',
}

const enabled = ref<Record<LoginMethod, boolean>>({
  sms: true,
  password: true,
  wechat: true,
  wecom: true,
})
const defaultMethod = ref<LoginMethod>('wecom')

const enabledMethods = computed<LoginMethod[]>(() => allMethods.filter((m) => enabled.value[m]))

const smsCountdown = ref(60)
/** 演示模式：本地预览用，强制降级返回模拟登录信息（无需 https / 可信域名） */
const demoMode = ref(true)
/** 是否展示「忘记密码」入口（可配置，默认开启） */
const forgotPassword = ref(true)

const result = ref<LoginResult | null>(null)
const showRaw = ref(false)

/** 是否真实 OAuth 返回（非演示降级）。后端在 raw 里带有 _real 标记 */
const isReal = computed(
  () => !!result.value?.userInfo.raw && (result.value.userInfo.raw as any)._real === true,
)

/** 登录信息卡片展示的字段：仅展示有值的字段 */
const infoRows = computed<{ label: string; value: string }[]>(() => {
  const u = result.value?.userInfo
  if (!u) return []
  const rows: { label: string; value: string }[] = []
  if (u.userId) rows.push({ label: '用户ID', value: u.userId })
  if (u.dept) rows.push({ label: '部门', value: u.dept })
  if (u.role) rows.push({ label: '角色', value: u.role })
  if (u.phone) rows.push({ label: '手机号', value: u.phone })
  if (u.email) rows.push({ label: '邮箱', value: u.email })
  if (u.openid) rows.push({ label: 'openid', value: u.openid })
  if (u.unionid) rows.push({ label: 'unionid', value: u.unionid })
  return rows
})

function onSuccess(r: LoginResult) {
  result.value = r
  showDialog({
    title: '登录成功',
    message: `欢迎 ${r.userInfo.name}（${methodLabels[r.method]}）\ntoken: ${r.token.slice(0, 24)}...`,
  })
}
</script>

<template>
  <div class="login-demo">
    <VantLogin
      :enabled-methods="enabledMethods"
      :default-method="defaultMethod"
      :sms-countdown="smsCountdown"
      :demo-mode="demoMode"
      :forgot-password="forgotPassword"
      @success="onSuccess"
    />
    <van-nav-bar title="VantLogin 登录组件" />

    <div v-if="result" class="result-card">
      <h3>（{{ methodLabels[result.method] }}）</h3>

      <!-- 用户卡片 -->
      <div class="user-card">
        <img
          v-if="result.userInfo.avatar"
          :src="result.userInfo.avatar"
          class="user-avatar"
          alt="avatar"
        />
        <div v-else class="user-avatar avatar-placeholder">
          {{ (result.userInfo.name || '?').slice(0, 1) }}
        </div>
        <div class="user-meta">
          <div class="user-name">
            {{ result.userInfo.name }}
            <van-tag :type="isReal ? 'success' : 'warning'" size="medium">
              {{ isReal ? '真实登录' : '演示模式' }}
            </van-tag>
          </div>
          <div class="user-method">登录方式：{{ methodLabels[result.method] }}</div>
        </div>
      </div>

      <!-- 关键信息 -->
      <van-cell-group inset class="user-info">
        <van-cell v-for="row in infoRows" :key="row.label" :title="row.label" :value="row.value" />
      </van-cell-group>

      <!-- token -->
      <div class="token-line">
        <span>token</span>
        <code>{{ result.token.slice(0, 16) }}…（已脱敏）</code>
      </div>

      <van-button
        size="small"
        plain
        type="primary"
        block
        class="raw-toggle"
        @click="showRaw = !showRaw"
      >
        {{ showRaw ? '收起原始返回' : '查看原始返回' }}
      </van-button>
      <pre v-if="showRaw" class="raw-json">{{ JSON.stringify(result, null, 2) }}</pre>
    </div>

    <div class="config-card">
      <h3>配置项（演示「可配置」能力）</h3>
      <van-cell-group inset>
        <van-cell v-for="m in allMethods" :key="m" :title="methodLabels[m]">
          <template #value>
            <van-switch v-model="enabled[m]" size="20" />
          </template>
        </van-cell>
        <van-cell title="默认登录方式">
          <template #value>
            <van-radio-group v-model="defaultMethod" direction="horizontal">
              <van-radio v-for="m in allMethods" :key="m" :name="m" :disabled="!enabled[m]">
                {{ methodLabels[m] }}
              </van-radio>
            </van-radio-group>
          </template>
        </van-cell>
        <van-cell title="验证码倒计时（秒）">
          <template #value>
            <van-stepper v-model="smsCountdown" :min="10" :max="120" :step="10" integer />
          </template>
        </van-cell>
        <van-cell title="演示模式（企业微信本地预览）">
          <template #value>
            <van-switch v-model="demoMode" size="20" />
          </template>
        </van-cell>
        <van-cell title="忘记密码入口">
          <template #value>
            <van-switch v-model="forgotPassword" size="20" />
          </template>
        </van-cell>
        <van-cell
          v-if="demoMode"
          title="说明"
          label="已强制降级，无需 https / 可信域名即可看到登录信息；关闭后走真实扫码（需配好回调域名）"
        />
      </van-cell-group>
    </div>
  </div>
</template>

<style scoped>
.login-demo {
  padding-bottom: 24px;
}
.config-card,
.result-card {
  margin: 12px;
}
.config-card h3,
.result-card h3 {
  margin: 8px 4px;
  font-size: 15px;
  color: #333;
}
.result-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
}
.result-card h3 {
  margin: 0 0 12px;
}
.user-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: linear-gradient(135deg, #2e7be4, #1a5fc4);
  border-radius: 12px;
  color: #fff;
}
.user-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  flex: 0 0 auto;
  background: #fff;
}
.avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  color: #2e7be4;
}
.user-meta {
  min-width: 0;
}
.user-name {
  font-size: 17px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}
.user-method {
  margin-top: 4px;
  font-size: 12px;
  opacity: 0.85;
}
.user-info {
  margin: 12px 0 0 !important;
}
.token-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0 0;
  font-size: 12px;
  color: #999;
}
.token-line code {
  flex: 1;
  background: #f5f6f8;
  border-radius: 6px;
  padding: 4px 8px;
  color: #666;
  word-break: break-all;
}
.raw-toggle {
  margin-top: 12px;
}
.raw-json {
  margin: 12px 0 0;
  font-size: 12px;
  color: #555;
  white-space: pre-wrap;
  word-break: break-all;
  background: #f5f6f8;
  border-radius: 8px;
  padding: 10px;
}
</style>
