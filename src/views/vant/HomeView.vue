<script setup lang="ts">
/**
 * HomeView（vant 模块）—— 首页（仿 PICC 移动端截图）
 *
 * 布局结构（从上到下）：
 *   1. 红色渐变头部：品牌名 + 城市选择 + 搜索栏
 *   2. 红底区域内的快捷菜单（车险算费风格 / highlight 白色方块图标）
 *   3. 营业推广 banner 区
 *   4. 白底业务菜单卡片（学幼专区风格 / default 红色圆徽图标）
 *   5. 底部 tabbar 由 MainLayout 提供
 *
 * 图标双风格：
 *   - highlight（车险算费风格）：白色圆角方块 + 彩色线性图标 → 用于红底区高频入口
 *   - default（学幼专区风格）：红色圆形徽章 + 白色线性图标 → 用于白底常规菜单（默认）
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import MenuIcon, { type IconStyle } from '../../components/MenuIcon.vue'

const router = useRouter()

interface MenuItem {
  key: string
  title: string
  to: string
  /** 图标风格：不填则由所在区域自动决定 */
  style?: IconStyle
  /** 角标文字 */
  badge?: string
}
interface MenuGroup {
  title: string
  items: MenuItem[]
}

// ====== 红底快捷入口（车险算费 highlight 风格）======
const quickItems = ref<MenuItem[]>([
  { key: 'dashboard-analysis', title: '数据汇总', to: '/analysis', style: 'highlight' },
  { key: 'insurance-source-stats-TrackSummary', title: '跟踪统计', to: '/track-summary', style: 'highlight', badge: 'NEW' },
  { key: 'insurance-source-workplace', title: '我的保源', to: '/myis', style: 'highlight' },
  { key: 'xb-renewedList', title: '续保管理', to: '/xb/renewedList', style: 'highlight', badge: '热' },
  { key: 'insurance-source-monitor-track-visit', title: '拜访汇总', to: '/monitor/track/visit', style: 'highlight' },
])

// ====== 业务菜单分组（学幼专区 default 风格）======
const groups = ref<MenuGroup[]>([
  {
    title: '',
    items: [
      { key: 'insurance-source-stats-UserSummary', title: '劳效统计', to: '/user-summary' }, // insurance-source-stats-UserSummary
      { key: 'insurance-source-stats-Visit', title: '拜访明细', to: '/visit' }, // insurance-source-stats-Visit
      { key: 'insurance-source-stats-PolicySummary', title: '签单明细', to: '/policy-summary' }, // insurance-source-stats-PolicySummary
      { key: 'insurance-source-fcdd-policy-main', title: '非车续保跟踪', to: '/fcdd-policy-main' }, // insurance-source-fcdd-policy-main
      { key: 'xbCar-renewedList', title: '车险续保', to: '/xbCar/renewedList', badge: '¥' }, // xbCar-renewedList
    ],
  },
  {
    title: '',
    items: [
      { key: 'jc-JcEnterpriseItemList', title: '客户渗透率', to: '/JcEnterpriseItemList' }, // jc-JcEnterpriseItemList
      { key: 'jc-JcEnterpriseRiskList', title: '企业增量保费', to: '/JcEnterpriseRiskList' }, // jc-JcEnterpriseRiskList
      { key: 'xb-questionList', title: '问题项目', to: '/xb/questionList' }, // xb-questionList
      { key: 'xb-endList', title: '项目终止', to: '/xb/endList' }, // xb-endList
      { key: 'lhzj-lhVisitInfoList', title: '领航足迹', to: '/lhzj' }, // lhzj-lhVisitInfoList
    ],
  },
])

function go(it: MenuItem) {
  router.push(it.to)
}
</script>

<template>
  <div class="home">
    <!-- ==================== 红色渐变头 ==================== -->
    <header class="home-header">
      <!-- 顶栏：品牌名 + 城市选择 + 右侧操作 -->
      <div class="header-bar">
        <div class="brand-area">
          <span class="brand-name">中国人保</span>
          <span class="brand-sub">官方自营平台</span>
        </div>
        <div class="header-right">
          <button class="city-btn">
            福州
            <van-icon name="arrow-down" size="11" />
          </button>
          <van-icon name="bell" size="22" color="#fff" />
          <van-icon name="info-o" size="22" color="#fff" />
        </div>
      </div>

      <!-- 搜索栏 -->
      <div class="search-bar" @click="() => {}">
        <van-icon name="search" size="16" color="#bbb" />
        <span class="search-placeholder">小金罐</span>
      </div>

      <!-- ====== 红底快捷菜单（highlight 车险算费风格）====== -->
      <div class="quick-menu">
        <button v-for="it in quickItems" :key="it.key" class="quick-item" @click="go(it)">
          <MenuIcon :name="it.key" :style="it.style ?? 'highlight'" :size="50" :badge="it.badge" />
          <span class="quick-label">{{ it.title }}</span>
        </button>
      </div>

      <!-- 推广横幅占位（可替换为轮播/图片） -->
      <div class="promo-banner">
        <div class="promo-left">
          <p class="promo-title">甲流感冒住院保障</p>
          <p class="promo-subtitle">小病可赔 · 促进康复</p>
        </div>
        <div class="promo-tag">理赔低门槛</div>
      </div>
    </header>

    <!-- ==================== 白底业务菜单（default 学幼专区风格）==================== -->
    <main class="home-body">
      <section v-for="(g, gi) in groups" :key="'g' + gi" class="menu-section">
        <h2 v-if="g.title" class="section-title">{{ g.title }}</h2>
        <div v-if="g.items.length" class="menu-grid">
          <button
            v-for="it in g.items"
            :key="it.key"
            class="menu-item"
            @click="go(it)"
          >
            <MenuIcon :name="it.key" :style="it.style ?? 'default'" :size="44" :badge="it.badge" />
            <span class="menu-label">{{ it.title }}</span>
          </button>
        </div>
      </section>

      <!-- 底部安全提示条 -->
      <div class="safety-tips">
        <span>安全</span><span>医疗新升级</span><span>增额寿险</span><span>少儿医疗</span><span>福运周周乐</span><span>盛夏嘻游</span>
      </div>

      <!-- 底部留白，避免被 tabbar 遮挡 -->
      <div class="bottom-spacer"></div>
    </main>
  </div>
</template>

<style scoped>
/* ========== 页面根 ========== */
.home {
  min-height: 100vh;
  background: #f5f6f8;
}

/* ========== 红色渐变头部 ========== */
.home-header {
  background: linear-gradient(180deg, #d71920 0%, #e84a52 55%, #f08a8f 100%);
  padding: 12px 16px 0;
  color: #fff;
  border-radius: 0 0 24px 24px;
  position: relative;
  overflow: hidden;
}
.home-header::after {
  content: '';
  position: absolute;
  bottom: -30px;
  left: -20%;
  width: 140%;
  height: 60px;
  background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.1), transparent 70%);
  pointer-events: none;
}

/* ---- 顶栏 ---- */
.header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.brand-area {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}
.brand-name {
  font-size: 19px;
  font-weight: 800;
  letter-spacing: 1px;
}
.brand-sub {
  font-size: 11px;
  opacity: 0.85;
  letter-spacing: 0.5px;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 14px;
}
.city-btn {
  background: rgba(255, 255, 255, 0.18);
  border: none;
  color: #fff;
  padding: 4px 8px;
  border-radius: 14px;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 2px;
}

/* ---- 搜索栏 ---- */
.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border-radius: 20px;
  padding: 9px 16px;
  margin-bottom: 16px;
  cursor: pointer;
}
.search-placeholder {
  color: #999;
  font-size: 14px;
}

/* ---- 红底快捷菜单（车险算费风格）---- */
.quick-menu {
  display: flex;
  justify-content: space-between;
  padding-bottom: 18px;
  gap: 4px;
}
.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  min-width: 0;
  flex: 1;
}
.quick-item:active {
  opacity: 0.78;
  transform: scale(0.96);
}
.quick-label {
  font-size: 13px;
  color: #fff;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
  line-height: 1.2;
}

/* ---- 推广横幅 ---- */
.promo-banner {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 250, 245, 0.92));
  border-radius: 12px 12px 0 0;
  padding: 14px 16px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
}
.promo-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #d71920;
}
.promo-subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  color: #666;
}
.promo-tag {
  flex-shrink: 0;
  background: linear-gradient(135deg, #d71920, #ee5a24);
  color: #fff;
  padding: 6px 14px;
  border-radius: 18px;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(215, 25, 32, 0.25);
}

/* ========== 白底业务菜单区 ========== */
.home-body {
  padding: 0 12px 0;
}
.menu-section {
  margin-top: 0;
}
.section-title {
  margin: 16px 0 10px;
  padding-left: 4px;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

/* 学幼专区网格 */
.menu-grid {
  background: #fff;
  border-radius: 14px;
  padding: 20px 6px 14px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  row-gap: 18px;
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.04);
}
.menu-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
}
.menu-item:active .menu-label {
  opacity: 0.6;
}
.menu-label {
  font-size: 12.5px;
  color: #333;
  text-align: center;
  line-height: 1.3;
  max-width: 68px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---- 底部安全提示 ---- */
.safety-tips {
  margin: 18px 4px 0;
  padding: 12px 4px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  font-size: 12px;
  color: #bbb;
}
.safety-tips span::before {
  content: '|';
  margin-right: 10px;
  color: #eee;
}
.safety-tips span:first-child::before {
  content: '';
  margin-right: 0;
}

.bottom-spacer {
  height: 70px;
}
</style>
