<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import { getUserInfo, clearAuth, isLoggedIn } from '@/api/core/token'
import { usePermission } from '@/composables/usePermission'
import { siteLogout } from '@/api/modules/ydl/site-auth'
import { usePiccSkin } from '@/composables/usePiccSkin'

const router = useRouter()
const LOGIN_PATH = '/ydl/login'

// 皮肤设置：picc = PICC 品牌皮肤（默认），vant = 去除 PICC 后的 Vant 默认皮肤
const { active, enable, disable } = usePiccSkin()
const skinShow = ref(false)
const skinColumns = [
  { text: 'PICC 品牌皮肤', value: 'picc' },
  { text: 'Vant 默认皮肤', value: 'vant' },
]
const currentSkin = computed(() => (active.value ? 'picc' : 'vant'))
const currentSkinText = computed(() => (active.value ? 'PICC 品牌皮肤' : 'Vant 默认皮肤'))

function openSkinPicker() {
  skinShow.value = true
}
interface SkinConfirmParams {
  selectedOptions?: { value?: string }[]
}
function onSkinConfirm({ selectedOptions }: SkinConfirmParams) {
  const v = selectedOptions?.[0]?.value
  // vant = 关闭 PICC 皮肤（移除 picc-skin class，回退到默认 Vant 主题）
  if (v === 'vant') disable()
  else enable()
  skinShow.value = false
}
function onSkinCancel() {
  skinShow.value = false
}

// 登录态 + 当前登录用户信息（登录成功后由 setUserInfo 持久化）
const logged = ref(isLoggedIn())
const user = ref(getUserInfo())

const avatarText = computed(() => (user.value?.name || '登').slice(0, 1))
const subText = computed(() => {
  if (!user.value) return '登录后享受更多服务'
  const parts = [user.value.dept, user.value.role].filter(Boolean)
  return parts.length ? parts.join(' · ') : user.value.phone || ''
})

const cells = ref([
  { icon: 'contact', title: '个人资料', to: '' },
  { icon: 'balance-o', title: '权限与角色', to: '' },
  { icon: 'setting-o', title: '设置', to: '' },
  { icon: 'info-o', title: '关于福建源动力平台', to: '' },
])

function goLogin() {
  router.push({ path: LOGIN_PATH, query: { redirect: '/ydl/mine' } })
}

/** 退出登录：先本地清理并即时反馈，再异步通知后端销毁会话（失败不影响本地退出） */
async function onLogout() {
  const { resetPermissions } = usePermission()
  // 取消退出直接返回（showConfirmDialog 取消时 reject）
  const confirmed = await showConfirmDialog({
    title: '提示',
    message: '确定要退出登录吗？',
  }).catch(() => false)
  if (!confirmed) return

  // 本地清理先行：无论后端返回什么（含 401/510），都即时、稳定地退出
  resetPermissions() // 清空按钮 / 菜单权限
  clearAuth() // 清除本地 token / 用户信息
  logged.value = false
  user.value = null
  showToast('已退出登录')
  router.replace({ path: LOGIN_PATH, query: { redirect: '/ydl/mine' } })

  // 再异步通知后端销毁会话（标记 __skipAuthFail，不再触发 onAuthFail 抢跳）
  siteLogout().catch(() => {
    /* 后端登出失败不影响本地退出 */
  })
}
</script>

<template>
  <div class="mine">
    <header class="mine-header">
      <div class="mine-user" @click="!logged && goLogin()">
        <div class="avatar">
          {{ avatarText }}
        </div>
        <div class="mine-meta">
          <div class="mine-name">
            {{ logged ? user?.name : '未登录' }}
            <van-icon v-if="!logged" name="arrow" />
          </div>
          <div class="mine-sub">{{ subText }}</div>
        </div>
      </div>
    </header>

    <van-cell-group inset class="mine-cells">
      <van-cell
        icon="brush-o"
        title="皮肤设置"
        :value="currentSkinText"
        is-link
        @click="openSkinPicker"
      />
      <van-cell v-for="c in cells" :key="c.title" :icon="c.icon" :title="c.title" is-link />
    </van-cell-group>

    <!-- 皮肤选择弹层 -->
    <van-popup v-model:show="skinShow" position="bottom" round>
      <van-picker
        :model-value="[currentSkin]"
        :columns="skinColumns"
        :show-toolbar="true"
        title="选择皮肤"
        @confirm="onSkinConfirm"
        @cancel="onSkinCancel"
      />
    </van-popup>

    <div class="mine-logout">
      <van-button v-if="logged" block round type="primary" plain @click="onLogout">
        退出登录
      </van-button>
      <van-button v-else block round type="primary" @click="goLogin"> 去登录 </van-button>
    </div>
  </div>
</template>

<style scoped>
.mine {
  min-height: 100vh;
  background: #f5f6f8;
}
.mine-header {
  background: linear-gradient(135deg, var(--van-primary-color), var(--app-primary-deep));
  padding: 36px 20px 28px;
}
.mine-user {
  display: flex;
  align-items: center;
  gap: 14px;
}
.avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
  font-size: 22px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mine-meta {
  color: #fff;
}
.mine-name {
  font-size: 18px;
  font-weight: 600;
}
.mine-sub {
  margin-top: 4px;
  font-size: 13px;
  opacity: 0.85;
}
.mine-cells {
  margin-top: 16px !important;
}
.mine-logout {
  padding: 24px 16px;
}
</style>
