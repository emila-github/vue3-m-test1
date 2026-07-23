<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import { getUserInfo, clearAuth, isLoggedIn } from '@/api/core/token'
import { logout } from '@/api/modules/login'

const router = useRouter()
const LOGIN_PATH = '/vant/vant-login-demo'

// 登录态 + 当前登录用户信息（登录成功后由 setUserInfo 持久化）
const logged = ref(isLoggedIn())
const user = ref(getUserInfo())

/** 头像占位首字：优先用户名，未登录则用「登」 */
const avatarText = computed(() => (user.value?.name || '登').slice(0, 1))
/** 副标题：部门 · 角色（缺省则展示手机号 / 提示登录） */
const subText = computed(() => {
  if (!user.value) return '登录后享受更多服务'
  const parts = [user.value.dept, user.value.role].filter(Boolean)
  return parts.length ? parts.join(' · ') : user.value.phone || ''
})

const cells = ref([
  { icon: 'contact', title: '个人资料', to: '' },
  { icon: 'balance-o', title: '权限与角色', to: '' },
  { icon: 'setting-o', title: '设置', to: '' },
  { icon: 'info-o', title: '关于中国人保', to: '' },
])

/** 未登录时点头像区 → 去登录 */
function goLogin() {
  router.push({ path: LOGIN_PATH, query: { redirect: '/vant/mine' } })
}

/** 退出登录：通知后端销毁会话 + 清除本地 token / 用户信息，跳回登录页 */
async function onLogout() {
  showConfirmDialog({ title: '提示', message: '确定要退出登录吗？' })
    .then(async () => {
      try {
        await logout()
      } catch {
        /* 后端登出失败不影响本地退出 */
      }
      clearAuth()
      logged.value = false
      user.value = null
      showToast('已退出登录')
      router.replace({ path: LOGIN_PATH, query: { redirect: '/vant/mine' } })
    })
    .catch(() => {
      /* 取消退出 */
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
      <van-cell v-for="c in cells" :key="c.title" :icon="c.icon" :title="c.title" is-link />
    </van-cell-group>

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
  background: linear-gradient(135deg, #d71920, #b31319);
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
