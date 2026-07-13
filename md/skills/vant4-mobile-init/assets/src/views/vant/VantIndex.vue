<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const stages = ref([
  {
    id: 'select',
    title: '通用下拉单选组件 VantSelectField',
    desc: '可配置数据格式（字符串/对象/自定义字段/format），演示清空、禁用、只读、必填等用法',
    path: '/vant/vant-select-field-demo',
    icon: '🔽',
    color: '#07c160',
  },
  {
    id: 'select-multiple',
    title: '通用下拉多选组件 VantSelectMultipleField',
    desc: '基于 Checkbox 列表的多选下拉，数据格式可配置，支持最多可选数量限制',
    path: '/vant/vant-select-multiple-field-demo',
    icon: '☑️',
    color: '#ff976a',
  },
  {
    id: 'time-picker',
    title: '通用下拉时间选择组件 VantTimePickerField',
    desc: '基于 DatetimePicker 的时间/日期选择，支持 time/date/datetime/year-month 与范围限制',
    path: '/vant/vant-time-picker-field-demo',
    icon: '⏰',
    color: '#ee0a24',
  },
  {
    id: 'tree-select',
    title: '通用下拉树型选择组件 VantTreeSelectField',
    desc: '基于 Cascader 的树型级联选择，数据字段可配置，选中叶子回显完整路径',
    path: '/vant/vant-tree-select-field-demo',
    icon: '🌳',
    color: '#1989fa',
  },
  {
    id: 'tree-tags',
    title: '通用树型分类打标签组件 VantTreeTagsField',
    desc: '树型多选 + 标签回显，可将分类节点选为可删除标签，支持最多可选数量限制',
    path: '/vant/vant-tree-tags-field-demo',
    icon: '🏷️',
    color: '#7232dd',
  },
  {
    id: 'calendar',
    title: '通用下拉日历组件 VantCalendarField',
    desc: '基于 van-calendar 的单选/区间/多选日期，支持范围限制、默认定位、快速选择与清空',
    path: '/vant/vant-calendar-field-demo',
    icon: '📅',
    color: '#1989fa',
  },
  {
    id: 'search',
    title: '通用动态搜索组件 VantSearch',
    desc: '基于 van-search 的联想搜索，内置防抖与竞态保护，支持自定义数据字段与键盘导航',
    path: '/vant/vant-search-demo',
    icon: '🔍',
    color: '#7232dd',
  },
  {
    id: 'search-field',
    title: '表单内动态搜索组件 VantSearchField',
    desc: '渲染为 van-field 的表单搜索项，弹层内防抖远程/本地搜索，可直接放入 van-form',
    path: '/vant/vant-search-field-demo',
    icon: '📋',
    color: '#00a078',
  },
  {
    id: 'upload',
    title: '通用文件上传组件 VantUpload',
    desc: '头像/身份证正反面/图片上传 + 证件上传自定义 UI，支持自定义上传函数与大小校验',
    path: '/vant/vant-upload-field-demo',
    icon: '🖼️',
    color: '#1989fa',
  },
  {
    id: 'list',
    title: '通用列表控件 VantList',
    desc: '下拉筛选/查询/更多查询 + 增删改 + 自定义扩展操作 + 权限门禁，复用 useCrudList',
    path: '/vant/vant-list-demo',
    icon: '📑',
    color: '#07c160',
  },
  {
    id: 'permission',
    title: '权限指令 v-permission 家族',
    desc: 'v-permission / v-permission-all / v-permission-none 三种全局指令，配合角色切换实时显隐',
    path: '/vant/vant-permission-demo',
    icon: '🔐',
    color: '#ee0a24',
  },
])

function navigateTo(path: string) {
  router.push(path)
}
</script>

<template>
  <div class="vant-index">
    <header class="page-header">
      <h1>Vant 移动端 UI 学习</h1>
      <p class="subtitle">
        基于 <code>vant@^4.x</code>，有赞开源、业界领先的 Vue 3 移动端组件库，覆盖 70+ 高质量组件。
      </p>
    </header>

    <!-- 核心组件速览 -->
    <section class="card quick-ref">
      <h2>核心组件速览</h2>
      <div class="api-grid">
        <div class="api-item"><code>&lt;van-button&gt;</code><span>按钮</span></div>
        <div class="api-item"><code>&lt;van-cell&gt;</code><span>单元格</span></div>
        <div class="api-item"><code>&lt;van-field&gt;</code><span>输入框</span></div>
        <div class="api-item"><code>&lt;van-form&gt;</code><span>表单</span></div>
        <div class="api-item"><code>&lt;van-popup&gt;</code><span>弹出层</span></div>
        <div class="api-item"><code>&lt;van-picker&gt;</code><span>选择器</span></div>
        <div class="api-item"><code>&lt;van-list&gt;</code><span>列表</span></div>
        <div class="api-item"><code>&lt;van-swipe&gt;</code><span>轮播</span></div>
        <div class="api-item"><code>&lt;van-tabbar&gt;</code><span>标签栏</span></div>
        <div class="api-item"><code>&lt;van-nav-bar&gt;</code><span>导航栏</span></div>
        <div class="api-item"><code>&lt;van-search&gt;</code><span>搜索</span></div>
        <div class="api-item"><code>&lt;van-dialog&gt;</code><span>对话框</span></div>
        <div class="api-item"><code>&lt;van-toast&gt;</code><span>轻提示</span></div>
        <div class="api-item"><code>&lt;van-uploader&gt;</code><span>上传</span></div>
        <div class="api-item"><code>&lt;van-image&gt;</code><span>图片</span></div>
      </div>
    </section>

    <!-- 学习阶段 -->
    <section class="stages">
      <h2>组件演示（共 11 个）</h2>
      <div class="stage-grid">
        <div
          v-for="s in stages"
          :key="s.id"
          class="stage-card"
          :style="{ borderTopColor: s.color }"
          @click="navigateTo(s.path)"
        >
          <span class="stage-icon">{{ s.icon }}</span>
          <h3>{{ s.title }}</h3>
          <p class="stage-desc">{{ s.desc }}</p>
          <div class="stage-badge" :style="{ background: s.color, color: '#fff' }">
            Stage {{ s.id }}
          </div>
        </div>
      </div>
    </section>

    <!-- Vant 特点 -->
    <section class="card">
      <h2>Vant 4 特点</h2>
      <ul class="why-list">
        <li><strong>70+ 组件</strong>：覆盖移动端开发绝大部分场景</li>
        <li><strong>轻量</strong>：平均组件体积 &lt; 5KB（min+gzip），支持 Tree Shaking</li>
        <li><strong>Vue 3 原生</strong>：全面支持 Composition API 和 TypeScript</li>
        <li><strong>主题定制</strong>：CSS 变量方案，轻松实现品牌定制</li>
        <li><strong>国际化</strong>：内置 30+ 语言包</li>
        <li><strong>服务端渲染</strong>：支持 Nuxt 3 集成</li>
        <li><strong>Rem 适配</strong>：内置适配方案，自动处理不同屏幕</li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.vant-index {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  text-align: center;
  margin-bottom: 32px;
}
.page-header h1 {
  font-size: 28px;
  color: #1a1a1a;
  margin: 0 0 8px;
}
.subtitle {
  color: #666;
  font-size: 14px;
}
.subtitle code {
  background: #f0f0f0;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 13px;
}

.card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.card h2 {
  margin: 0 0 16px;
  font-size: 18px;
  color: #333;
}

.api-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}

.api-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}
.api-item code {
  font-size: 13px;
  color: #1989fa;
  font-weight: 500;
}
.api-item span {
  font-size: 12px;
  color: #999;
}

.stages h2 {
  margin: 0 0 16px;
  font-size: 18px;
  color: #333;
}
.stage-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stage-card {
  position: relative;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-top: 3px solid;
  border-radius: 10px;
  padding: 20px 16px;
  cursor: pointer;
  transition:
    box-shadow 0.2s,
    transform 0.2s;
}
.stage-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}
.stage-icon {
  font-size: 28px;
}
.stage-card h3 {
  margin: 10px 0 6px;
  font-size: 15px;
  color: #333;
}
.stage-desc {
  font-size: 12px;
  color: #999;
  line-height: 1.5;
  margin: 0;
}
.stage-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
}

.why-list {
  list-style: none;
  padding: 0;
}
.why-list li {
  padding: 6px 0;
  font-size: 14px;
  color: #555;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .api-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .stage-grid {
    grid-template-columns: 1fr;
  }
}
</style>
