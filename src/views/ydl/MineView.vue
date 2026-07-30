<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import { getUserInfo, clearAuth, isLoggedIn } from '@/api/core/token'
import { usePermission } from '@/composables/usePermission'
import { siteLogout } from '@/api/modules/ydl/site-auth'
import { useSkin, SKINS, type SkinMeta } from '@/composables/useSkin'

const router = useRouter()
const LOGIN_PATH = '/ydl/login'

// 皮肤设置：接入多皮肤注册表（全套皮肤在源文件 SKINS 中维护）
const { active, setSkin, current } = useSkin()
const skinShow = ref(false)

function openSkinPicker() {
  skinShow.value = true
}
function chooseSkin(id: string) {
  setSkin(id)
  skinShow.value = false
}
// 色卡渐变预览：主色 → 深端色
function swatchStyle(s: SkinMeta) {
  return { background: `linear-gradient(135deg, ${s.color} 0%, ${s.deep} 100%)` }
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
      <van-cell title="皮肤设置" is-link @click="openSkinPicker">
        <template #value>
          <span class="skin-current">
            <span class="skin-dot" :style="{ background: current.color }"></span>
            {{ current.name }}
          </span>
        </template>
      </van-cell>
      <van-cell v-for="c in cells" :key="c.title" :icon="c.icon" :title="c.title" is-link />
    </van-cell-group>

    <!-- 皮肤选择面板：色卡网格 + 选中态 + 无障碍（文字 + 勾选双重标识） -->
    <van-popup v-model:show="skinShow" position="bottom" round>
      <div class="skin-panel">
        <div class="skin-panel__head">
          <span class="skin-panel__title">选择皮肤</span>
          <van-icon name="cross" class="skin-panel__close" @click="skinShow = false" />
        </div>
        <div class="skin-grid">
          <button
            v-for="s in SKINS"
            :key="s.id"
            type="button"
            class="skin-item"
            :class="{ 'skin-item--active': s.id === active }"
            :aria-pressed="s.id === active"
            @click="chooseSkin(s.id)"
          >
            <span class="skin-swatch" :style="swatchStyle(s)"></span>
            <span class="skin-name">{{ s.name }}</span>
            <van-icon v-if="s.id === active" name="success" class="skin-check" />
          </button>
        </div>
      </div>
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
  /* 随皮肤翻转的画布色：深色主题下由 --van-background 覆盖为深色 */
  background: var(--van-background, #f5f6f8);
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

/* 当前皮肤指示 */
.skin-current {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--van-text-color-2, #646566);
}
.skin-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08) inset;
}

/* 皮肤选择面板 */
.skin-panel {
  background: var(--van-background-2, #fff);
  padding: 8px 16px 22px;
}
.skin-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0 14px;
}
.skin-panel__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--van-text-color, #323233);
}
.skin-panel__close {
  font-size: 20px;
  color: var(--van-text-color-3, #969799);
  cursor: pointer;
}
.skin-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.skin-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 6px;
  border-radius: 12px;
  border: 1.5px solid var(--van-border-color, #ebedf0);
  background: var(--van-background-3, #f7f8fa);
  cursor: pointer;
  transition:
    border-color 0.2s,
    transform 0.15s ease,
    box-shadow 0.2s;
}
.skin-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.skin-item--active {
  border-color: var(--van-primary-color);
  box-shadow: 0 0 0 2px rgba(var(--app-primary-rgb), 0.18);
}
.skin-swatch {
  width: 100%;
  height: 36px;
  border-radius: 8px;
}
.skin-name {
  font-size: 13px;
  color: var(--van-text-color, #323233);
}
.skin-check {
  position: absolute;
  top: 6px;
  right: 6px;
  font-size: 16px;
  color: var(--van-primary-color);
}
</style>
