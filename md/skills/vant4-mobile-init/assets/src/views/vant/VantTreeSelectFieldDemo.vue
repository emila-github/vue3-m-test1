<script setup lang="ts">
/**
 * VantTreeSelectField 示例页
 * 演示树型下拉选择的多种用法：默认结构、自定义字段、可清空、禁用/只读、必填+图标、change 回显
 */
import { ref } from 'vue'
import VantTreeSelectField from '../../components/VantTreeSelectField.vue'

// ① 默认树结构（省 / 市 / 区）
const region = ref('')
const regionTree = [
  {
    text: '浙江省',
    value: 'zj',
    children: [
      {
        text: '杭州市',
        value: 'hz',
        children: [
          { text: '西湖区', value: 'xh' },
          { text: '滨江区', value: 'bj' },
          { text: '余杭区', value: 'yh' },
        ],
      },
      {
        text: '宁波市',
        value: 'nb',
        children: [
          { text: '海曙区', value: 'hs' },
          { text: '江北区', value: 'jb' },
        ],
      },
    ],
  },
  {
    text: '江苏省',
    value: 'js',
    children: [
      {
        text: '南京市',
        value: 'nj',
        children: [
          { text: '玄武区', value: 'xw' },
          { text: '江宁区', value: 'jn' },
        ],
      },
    ],
  },
]

// ② 自定义字段（valueKey / labelKey / childrenKey）
const org = ref('')
const orgTree = [
  {
    name: '总公司',
    id: 'hq',
    subs: [
      {
        name: '财险事业部',
        id: 'pc',
        subs: [
          { name: '车险部', id: 'auto' },
          { name: '非车险部', id: 'nonauto' },
        ],
      },
      {
        name: '寿险事业部',
        id: 'life',
        subs: [{ name: '团险部', id: 'group' }],
      },
    ],
  },
]

// ③ 可清空
const clearableVal = ref('hz')

// ④ 禁用 / 只读
const disabledVal = ref('xh')
const readonlyVal = ref('bj')

// ⑤ 必填 + 图标
const requiredVal = ref('')

// ⑥ change 回显（值与完整路径）
const lastValue = ref('')
const lastPath = ref('')

function onChange(value: string | number, path: any[]) {
  lastValue.value = String(value)
  lastPath.value = path.map((n) => n.text ?? n.name).join(' / ')
}

// ⑦ 自定义分隔符
const sepVal = ref('')

// ⑧ 树型深度控制（maxDepth）：最多可选到第 2 层（省 / 市）
const maxDepthVal = ref('')

// ⑨ 深度不一致时浅叶节点可选：北京市（无子级，一级即终点）、上海市（二级浅叶）、浙江省（三级深叶）
const unevenVal = ref('')
const unevenTree = [
  { text: '北京市', value: 'bj' },
  {
    text: '上海市',
    value: 'sh',
    children: [{ text: '浦东新区', value: 'pd' }],
  },
  {
    text: '浙江省',
    value: 'zj',
    children: [
      {
        text: '杭州市',
        value: 'hz',
        children: [
          { text: '西湖区', value: 'xh' },
          { text: '滨江区', value: 'bj2' },
        ],
      },
    ],
  },
]

// ⑩ 父节点可选（selectParent）
const parentVal = ref('')
</script>

<template>
  <div class="demo-page">
    <van-nav-bar
      title="VantTreeSelectField 下拉树型选择"
      left-text="返回"
      left-arrow
      @click-left="$router.back()"
    />

    <div class="container">
      <div class="section-title">① 默认树结构（省 / 市 / 区，单选叶子）</div>
      <div class="card">
        <VantTreeSelectField
          v-model="region"
          :options="regionTree"
          label="地区"
          title="选择地区"
          placeholder="请选择地区"
          @change="onChange"
        />
        <p class="hint">
          当前值：<code>{{ region || '（空）' }}</code>
        </p>
      </div>

      <div class="section-title">② 自定义字段（valueKey / labelKey / childrenKey）</div>
      <div class="card">
        <VantTreeSelectField
          v-model="org"
          :options="orgTree"
          value-key="id"
          label-key="name"
          children-key="subs"
          label="机构"
          title="选择机构"
          placeholder="请选择机构"
          @change="onChange"
        />
        <p class="hint">
          当前值：<code>{{ org || '（空）' }}</code>
        </p>
      </div>

      <div class="section-title">③ 可清空（clearable）</div>
      <div class="card">
        <VantTreeSelectField
          v-model="clearableVal"
          :options="regionTree"
          label="地区"
          title="选择地区"
          placeholder="请选择地区"
          clearable
          @change="onChange"
        />
        <p class="hint">
          当前值：<code>{{ clearableVal || '（空）' }}</code>
        </p>
      </div>

      <div class="section-title">④ 禁用 / 只读</div>
      <div class="card">
        <VantTreeSelectField
          v-model="disabledVal"
          :options="regionTree"
          label="禁用"
          title="选择地区"
          disabled
        />
        <VantTreeSelectField
          v-model="readonlyVal"
          :options="regionTree"
          label="只读"
          title="选择地区"
          readonly
        />
        <p class="hint">
          禁用值：<code>{{ disabledVal }}</code> ｜ 只读值：<code>{{ readonlyVal }}</code>
        </p>
      </div>

      <div class="section-title">⑤ 必填 + 图标（required + left-icon）</div>
      <div class="card">
        <VantTreeSelectField
          v-model="requiredVal"
          :options="regionTree"
          label="地区"
          title="选择地区"
          placeholder="请选择地区"
          required
          left-icon="location-o"
          @change="onChange"
        />
        <p class="hint">
          当前值：<code>{{ requiredVal || '（空）' }}</code>
        </p>
      </div>

      <div class="section-title">⑥ change 事件回显（值 + 完整路径）</div>
      <div class="card">
        <p class="hint">
          选中值：<code>{{ lastValue || '（未选择）' }}</code>
        </p>
        <p class="hint">
          完整路径：<code>{{ lastPath || '（未选择）' }}</code>
        </p>
      </div>

      <div class="section-title">⑦ 自定义路径分隔符（separator）</div>
      <div class="card">
        <VantTreeSelectField
          v-model="sepVal"
          :options="regionTree"
          label="地区"
          title="选择地区"
          separator=" > "
          placeholder="请选择地区"
          @change="onChange"
        />
        <p class="hint">
          当前值（以「 > 」分隔回显）：<code>{{ sepVal || '（空）' }}</code>
        </p>
      </div>

      <div class="section-title">⑧ 树型深度控制（max-depth=2，最多可选到「市」）</div>
      <div class="card">
        <VantTreeSelectField
          v-model="maxDepthVal"
          :options="regionTree"
          :max-depth="2"
          label="地区"
          title="选择地区（限两级）"
          placeholder="只能选到省 / 市级"
          @change="onChange"
        />
        <p class="hint">
          当前值：<code>{{ maxDepthVal || '（空）' }}</code
          >（市及以下的子级已被裁为可选叶子）
        </p>
      </div>

      <div class="section-title">⑨ 深度不一致时浅叶节点可选（北京/上海可直接选）</div>
      <div class="card">
        <VantTreeSelectField
          v-model="unevenVal"
          :options="unevenTree"
          label="地区"
          title="选择地区"
          placeholder="深浅不一的树"
          @change="onChange"
        />
        <p class="hint">
          当前值：<code>{{ unevenVal || '（空）' }}</code
          >（点「北京市」一级即完成；「上海市」到二级即完成）
        </p>
      </div>

      <div class="section-title">⑩ 父节点可选（select-parent）</div>
      <div class="card">
        <VantTreeSelectField
          v-model="parentVal"
          :options="regionTree"
          select-parent
          label="地区"
          title="选择地区（父级可选）"
          placeholder="可选中省 / 市本身"
          @change="onChange"
        />
        <p class="hint">
          当前值：<code>{{ parentVal || '（空）' }}</code
          >（进入「省」列后，点末尾「选择「浙江省」」即直接选中省级，无需下钻到区）
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.demo-page {
  min-height: 100vh;
  background: #f7f8fa;
}
.container {
  padding: 12px 12px 40px;
}
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #323233;
  margin: 18px 4px 8px;
}
.card {
  background: #fff;
  border-radius: 12px;
  padding: 4px 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}
.hint {
  font-size: 12px;
  color: #969799;
  margin: 8px 4px 12px;
}
.hint code {
  color: #07c160;
  background: #f2f3f5;
  padding: 1px 6px;
  border-radius: 4px;
  word-break: break-all;
}
</style>
