<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { usePermission } from '@/composables/usePermission'

const { currentRole, permissions, loaded, setRole, hasAny, hasAll, hasNone } = usePermission()

// 角色切换：v-model 直接驱动 currentRole，再触发权限重载（指令内部 watch 权限集合会自动重新显隐）
const roles = [
  { name: 'admin', text: '管理员（车险全权限）' },
  { name: 'manager', text: '经理' },
  { name: 'editor', text: '编辑（无删除）' },
  { name: 'viewer', text: '访客（仅查看）' },
]

const carPerms = computed(() => permissions.value.filter((p) => p.startsWith('car:')))

// 角色变化即重载权限（currentRole 为全局单例 ref，v-model 直接写入）
watch(currentRole, (role) => setRole(role))
// 进入页面时若权限尚未加载（单例可能由其他页面加载过），主动加载一次
onMounted(() => {
  if (!loaded.value) setRole(currentRole.value)
})

// 「状态」列实时计算（与指令内部逻辑一致，便于观察显隐结果）
function visibleAny(codes: string | string[]): boolean {
  return hasAny(...(Array.isArray(codes) ? codes : [codes]))
}
function visibleAll(codes: string[]): boolean {
  return hasAll(...codes)
}
function visibleNone(codes: string | string[]): boolean {
  return hasNone(...(Array.isArray(codes) ? codes : [codes]))
}
</script>

<template>
  <div class="perm-page picc-page">
    <van-nav-bar
      title="权限指令示例"
      class="van-nav-bar--picc-primary"
      left-text="返回"
      left-arrow
      @click-left="$router.back()"
    />

    <!-- 角色切换 + 当前权限 -->
    <van-cell-group inset class="picc-card perm-block">
      <div class="perm-block-title">
        当前角色：<b>{{ currentRole }}</b>
      </div>
      <van-radio-group v-model="currentRole" direction="horizontal">
        <van-radio v-for="r in roles" :key="r.name" :name="r.name" icon-size="16px">{{
          r.text
        }}</van-radio>
      </van-radio-group>
      <div class="perm-codes">
        <span class="perm-codes-label">当前 car:* 权限：</span>
        <van-tag v-for="p in carPerms" :key="p" plain type="primary" class="perm-code-tag">{{
          p
        }}</van-tag>
        <span v-if="!carPerms.length" class="perm-codes-empty">无</span>
      </div>
    </van-cell-group>

    <!-- v-permission (hasAny) -->
    <van-cell-group inset class="picc-card perm-block">
      <h3 class="perm-block-title">v-permission（拥有任意一个即可见 · hasAny）</h3>
      <div class="perm-row">
        <div class="perm-row-info">
          <code>v-permission="'car:view'"</code>
          <span class="perm-state" :class="visibleAny('car:view') ? 'on' : 'off'">{{
            visibleAny('car:view') ? '可见' : '已隐藏'
          }}</span>
        </div>
        <van-button size="small" type="primary" v-permission="'car:view'">查看</van-button>
      </div>
      <div class="perm-row">
        <div class="perm-row-info">
          <code>v-permission="'car:export'"</code>
          <span class="perm-state" :class="visibleAny('car:export') ? 'on' : 'off'">{{
            visibleAny('car:export') ? '可见' : '已隐藏'
          }}</span>
        </div>
        <van-button size="small" type="primary" v-permission="'car:export'">导出</van-button>
      </div>
      <div class="perm-row">
        <div class="perm-row-info">
          <code>v-permission="['car:edit','car:export']"</code>
          <span class="perm-state" :class="visibleAny(['car:edit', 'car:export']) ? 'on' : 'off'">{{
            visibleAny(['car:edit', 'car:export']) ? '可见' : '已隐藏'
          }}</span>
        </div>
        <van-button size="small" type="primary" v-permission="['car:edit', 'car:export']"
          >编辑或导出</van-button
        >
      </div>
    </van-cell-group>

    <!-- v-permission-all (hasAll) -->
    <van-cell-group inset class="picc-card perm-block">
      <h3 class="perm-block-title">v-permission-all（必须全部拥有才可见 · hasAll）</h3>
      <div class="perm-row">
        <div class="perm-row-info">
          <code>v-permission-all="['car:view','car:edit']"</code>
          <span class="perm-state" :class="visibleAll(['car:view', 'car:edit']) ? 'on' : 'off'">{{
            visibleAll(['car:view', 'car:edit']) ? '可见' : '已隐藏'
          }}</span>
        </div>
        <van-button size="small" type="success" v-permission-all="['car:view', 'car:edit']"
          >查看且编辑</van-button
        >
      </div>
      <div class="perm-row">
        <div class="perm-row-info">
          <code>v-permission-all="['car:view','car:export']"</code>
          <span class="perm-state" :class="visibleAll(['car:view', 'car:export']) ? 'on' : 'off'">{{
            visibleAll(['car:view', 'car:export']) ? '可见' : '已隐藏'
          }}</span>
        </div>
        <van-button size="small" type="success" v-permission-all="['car:view', 'car:export']"
          >查看且导出</van-button
        >
      </div>
      <div class="perm-row">
        <div class="perm-row-info">
          <code>v-permission-all="['car:view','car:edit','car:delete']"</code>
          <span
            class="perm-state"
            :class="visibleAll(['car:view', 'car:edit', 'car:delete']) ? 'on' : 'off'"
            >{{ visibleAll(['car:view', 'car:edit', 'car:delete']) ? '可见' : '已隐藏' }}</span
          >
        </div>
        <van-button
          size="small"
          type="success"
          v-permission-all="['car:view', 'car:edit', 'car:delete']"
          >查看且编辑且删除</van-button
        >
      </div>
    </van-cell-group>

    <!-- v-permission-none (hasNone 反向) -->
    <van-cell-group inset class="picc-card perm-block">
      <h3 class="perm-block-title">v-permission-none（拥有任意一个就隐藏 · hasNone 反向）</h3>
      <div class="perm-row">
        <div class="perm-row-info">
          <code>v-permission-none="'car:delete'"</code>
          <span class="perm-state" :class="visibleNone('car:delete') ? 'on' : 'off'">{{
            visibleNone('car:delete') ? '可见' : '已隐藏'
          }}</span>
        </div>
        <van-button size="small" type="warning" v-permission-none="'car:delete'"
          >非删除员可见</van-button
        >
      </div>
      <div class="perm-row">
        <div class="perm-row-info">
          <code>v-permission-none="'car:export'"</code>
          <span class="perm-state" :class="visibleNone('car:export') ? 'on' : 'off'">{{
            visibleNone('car:export') ? '可见' : '已隐藏'
          }}</span>
        </div>
        <van-button size="small" type="warning" v-permission-none="'car:export'"
          >非导出员可见</van-button
        >
      </div>
      <div class="perm-row">
        <div class="perm-row-info">
          <code>v-permission-none="['car:edit','car:export']"</code>
          <span
            class="perm-state"
            :class="visibleNone(['car:edit', 'car:export']) ? 'on' : 'off'"
            >{{ visibleNone(['car:edit', 'car:export']) ? '可见' : '已隐藏' }}</span
          >
        </div>
        <van-button size="small" type="warning" v-permission-none="['car:edit', 'car:export']"
          >非编辑且非导出员可见</van-button
        >
      </div>
    </van-cell-group>

    <p class="perm-foot">
      指令基于 <code>usePermission()</code> 全局单例判断；无权限时 <code>display:none</code>（不移除
      DOM）。<br />
      切换角色后，指令内部 <code>watch</code> 权限集合变化，按钮会自动重新显隐。
    </p>
  </div>
</template>

<style scoped>
.perm-page {
  padding-bottom: 24px;
}
.picc-card {
  margin: 12px 0;
}
.perm-block {
  padding: 14px 12px;
}
.perm-block-title {
  font-size: 15px;
  font-weight: 700;
  color: #323233;
  margin: 0 0 10px;
}
.perm-block-title b {
  color: #d71920;
}
.perm-codes {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.perm-codes-label {
  font-size: 12px;
  color: #969799;
}
.perm-code-tag {
  margin-right: 2px;
}
.perm-codes-empty {
  font-size: 12px;
  color: #c8c9cc;
}
.perm-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}
.perm-row:last-child {
  border-bottom: none;
}
.perm-row-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.perm-row-info code {
  font-size: 12px;
  color: #1989fa;
  background: #ebf3ff;
  padding: 2px 6px;
  border-radius: 4px;
  word-break: break-all;
}
.perm-state {
  font-size: 12px;
}
.perm-state.on {
  color: #07c160;
}
.perm-state.off {
  color: #ee0a24;
}
.perm-foot {
  font-size: 12px;
  color: #969799;
  line-height: 1.7;
  padding: 4px 16px;
}
.perm-foot code {
  color: #1989fa;
  background: #ebf3ff;
  padding: 0 4px;
  border-radius: 4px;
}
</style>
