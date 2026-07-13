<script setup lang="ts">
/**
 * VantTreeTagsField 示例页
 * 演示树型分类打标签多选：默认树、自定义字段、标签显示路径、最多可选数量、可清空、禁用/只读、必填+图标、父级不可选、大数据量多选、change 回显
 */
import { ref, nextTick } from 'vue'
import VantTreeTagsField from '../../components/VantTreeTagsField.vue'

// ① 默认树多选打标签（省 / 市 / 区）—— 扩充为多个省，便于测试多选
const regions = ref<string[]>([])
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
          { text: '拱墅区', value: 'gs' },
          { text: '萧山区', value: 'xs' },
          { text: '临平区', value: 'lp' },
        ],
      },
      {
        text: '宁波市',
        value: 'nb',
        children: [
          { text: '海曙区', value: 'hs' },
          { text: '江北区', value: 'jb' },
          { text: '鄞州区', value: 'yz' },
          { text: '镇海区', value: 'zh' },
          { text: '北仑区', value: 'bl' },
        ],
      },
      {
        text: '温州市',
        value: 'wz',
        children: [
          { text: '鹿城区', value: 'lc' },
          { text: '瓯海区', value: 'oh' },
          { text: '龙湾区', value: 'lw' },
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
          { text: '鼓楼区', value: 'gl' },
          { text: '建邺区', value: 'jy' },
        ],
      },
      {
        text: '苏州市',
        value: 'sz',
        children: [
          { text: '姑苏区', value: 'gsu' },
          { text: '工业园区', value: 'gyy' },
          { text: '吴中区', value: 'wz2' },
          { text: '相城区', value: 'xc' },
        ],
      },
    ],
  },
  {
    text: '广东省',
    value: 'gd',
    children: [
      {
        text: '广州市',
        value: 'gz',
        children: [
          { text: '天河区', value: 'th' },
          { text: '越秀区', value: 'yx' },
          { text: '海珠区', value: 'hz2' },
          { text: '番禺区', value: 'py' },
          { text: '白云区', value: 'by' },
        ],
      },
      {
        text: '深圳市',
        value: 'szc',
        children: [
          { text: '福田区', value: 'ft' },
          { text: '南山区', value: 'ns' },
          { text: '宝安区', value: 'ba' },
          { text: '龙岗区', value: 'lg' },
        ],
      },
      {
        text: '东莞市',
        value: 'dg',
        children: [
          { text: '莞城街道', value: 'gc' },
          { text: '南城街道', value: 'nc' },
          { text: '东城街道', value: 'dc' },
        ],
      },
    ],
  },
  {
    text: '北京市',
    value: 'bj2',
    children: [
      { text: '东城区', value: 'dc2' },
      { text: '西城区', value: 'xc2' },
      { text: '朝阳区', value: 'cy' },
      { text: '海淀区', value: 'hd' },
      { text: '丰台区', value: 'ft2' },
      { text: '通州区', value: 'tz' },
    ],
  },
  {
    text: '上海市',
    value: 'sh',
    children: [
      { text: '黄浦区', value: 'hp' },
      { text: '徐汇区', value: 'xh2' },
      { text: '长宁区', value: 'cn' },
      { text: '静安区', value: 'ja' },
      { text: '浦东新区', value: 'pd' },
      { text: '闵行区', value: 'mh' },
    ],
  },
  {
    text: '四川省',
    value: 'sc',
    children: [
      {
        text: '成都市',
        value: 'cd',
        children: [
          { text: '锦江区', value: 'jj' },
          { text: '青羊区', value: 'qy' },
          { text: '武侯区', value: 'wh' },
          { text: '高新区', value: 'gx' },
          { text: '天府新区', value: 'tf' },
        ],
      },
      {
        text: '绵阳市',
        value: 'my',
        children: [
          { text: '涪城区', value: 'fc' },
          { text: '游仙区', value: 'yx2' },
        ],
      },
    ],
  },
]

// ② 自定义字段（valueKey / labelKey / childrenKey）
const orgs = ref<string[]>([])
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
          { name: '农险部', id: 'agri' },
          { name: '责信险部', id: 'liab' },
        ],
      },
      {
        name: '寿险事业部',
        id: 'life',
        subs: [
          { name: '团险部', id: 'group' },
          { name: '个险部', id: 'indiv' },
          { name: '银保部', id: 'banc' },
        ],
      },
      {
        name: '运营中心',
        id: 'ops',
        subs: [
          { name: '理赔部', id: 'claim' },
          { name: '客服部', id: 'cs' },
          { name: '核保部', id: 'uw' },
        ],
      },
    ],
  },
]

// ③ 标签显示完整路径（show-path）
const pathTags = ref<string[]>([])

// ④ 最多可选数量（max=3）
const limited = ref<string[]>([])

// ⑤ 可清空
const clearableVal = ref<string[]>(['hz', 'xh'])

// ⑥ 禁用 / 只读
const disabledVal = ref<string[]>(['zj'])
const readonlyVal = ref<string[]>(['hz'])

// ⑦ 必填 + 图标
const requiredVal = ref<string[]>([])

// ⑪ change 回显
const lastList = ref<Array<string | number>>([])
const lastCount = ref(0)
const echoBox = ref<HTMLElement>()

function scrollToEnd() {
  const el = echoBox.value
  if (el) el.scrollTop = el.scrollHeight
}

function onChange(value: Array<string | number>) {
  lastList.value = [...value]
  lastCount.value = value.length
  nextTick(scrollToEnd)
}

// ⑨ 父级不可选（select-parent=false，只能选叶子）
const parentOnly = ref<string[]>([])

// ⑩ 大数据量多选（测试标签换行/滚动）—— 兴趣分类树，叶子较多
const bigTags = ref<string[]>([])
const interestTree = [
  {
    name: '运动健身',
    id: 'sport',
    subs: [
      { name: '跑步', id: 'run' },
      { name: '游泳', id: 'swim' },
      { name: '瑜伽', id: 'yoga' },
      { name: '篮球', id: 'basket' },
      { name: '足球', id: 'foot' },
      { name: '骑行', id: 'bike' },
      { name: '健身', id: 'gym' },
      { name: '登山', id: 'hike' },
    ],
  },
  {
    name: '美食烹饪',
    id: 'food',
    subs: [
      { name: '川菜', id: 'sichuan' },
      { name: '粤菜', id: 'yue' },
      { name: '日料', id: 'jp' },
      { name: '烘焙', id: 'bake' },
      { name: '咖啡', id: 'coffee' },
      { name: '烧烤', id: 'bbq' },
      { name: '火锅', id: 'hotpot' },
    ],
  },
  {
    name: '文学艺术',
    id: 'art',
    subs: [
      { name: '阅读', id: 'read' },
      { name: '写作', id: 'write' },
      { name: '绘画', id: 'paint' },
      { name: '书法', id: 'calli' },
      { name: '摄影', id: 'photo' },
      { name: '音乐', id: 'music' },
      { name: '电影', id: 'movie' },
    ],
  },
  {
    name: '科技数码',
    id: 'tech',
    subs: [
      { name: '编程', id: 'code' },
      { name: '人工智能', id: 'ai' },
      { name: '游戏', id: 'game' },
      { name: '摄影器材', id: 'gear' },
      { name: '智能家居', id: 'smarthome' },
    ],
  },
  {
    name: '休闲旅行',
    id: 'travel',
    subs: [
      { name: '国内游', id: 'cn' },
      { name: '出境游', id: 'abroad' },
      { name: '露营', id: 'camp' },
      { name: '自驾', id: 'drive' },
      { name: '民宿', id: 'bnb' },
    ],
  },
]
</script>

<template>
  <div class="demo-page">
    <van-nav-bar
      title="VantTreeTagsField 树型打标签多选"
      left-text="返回"
      left-arrow
      @click-left="$router.back()"
    />

    <div class="container">
      <div class="section-title">① 默认树多选打标签（省 / 市 / 区，可多选）</div>
      <div class="card">
        <VantTreeTagsField
          v-model="regions"
          :options="regionTree"
          label="地区"
          title="选择地区"
          placeholder="请选择地区（可多选）"
          @change="onChange"
        />
        <p class="hint">
          已选：<code>{{ regions.join('、') || '（空）' }}</code>
        </p>
      </div>

      <div class="section-title">② 自定义字段（valueKey / labelKey / childrenKey）</div>
      <div class="card">
        <VantTreeTagsField
          v-model="orgs"
          :options="orgTree"
          value-key="id"
          label-key="name"
          children-key="subs"
          label="机构"
          title="选择机构"
          placeholder="请选择机构（可多选）"
          @change="onChange"
        />
        <p class="hint">
          已选：<code>{{ orgs.join('、') || '（空）' }}</code>
        </p>
      </div>

      <div class="section-title">③ 标签显示完整路径（show-path）</div>
      <div class="card">
        <VantTreeTagsField
          v-model="pathTags"
          :options="regionTree"
          show-path
          separator=" / "
          label="地区"
          title="选择地区"
          placeholder="标签显示完整路径"
          @change="onChange"
        />
        <p class="hint">
          已选：<code>{{ pathTags.join('、') || '（空）' }}</code>
        </p>
      </div>

      <div class="section-title">④ 最多可选数量（max=3）</div>
      <div class="card">
        <VantTreeTagsField
          v-model="limited"
          :options="regionTree"
          :max="3"
          label="地区"
          title="选择地区（最多 3 项）"
          placeholder="最多选 3 项"
          @change="onChange"
        />
        <p class="hint">
          已选：<code>{{ limited.join('、') || '（空）' }}</code>
        </p>
      </div>

      <div class="section-title">⑤ 可清空（clearable）</div>
      <div class="card">
        <VantTreeTagsField
          v-model="clearableVal"
          :options="regionTree"
          label="地区"
          title="选择地区"
          placeholder="请选择地区"
          clearable
          @change="onChange"
        />
        <p class="hint">
          已选：<code>{{ clearableVal.join('、') || '（空）' }}</code>
        </p>
      </div>

      <div class="section-title">⑥ 禁用 / 只读</div>
      <div class="card">
        <VantTreeTagsField
          v-model="disabledVal"
          :options="regionTree"
          label="禁用"
          title="选择地区"
          disabled
        />
        <VantTreeTagsField
          v-model="readonlyVal"
          :options="regionTree"
          label="只读"
          title="选择地区"
          readonly
        />
      </div>

      <div class="section-title">⑦ 必填 + 图标（required + left-icon）</div>
      <div class="card">
        <VantTreeTagsField
          v-model="requiredVal"
          :options="regionTree"
          label="地区"
          title="选择地区"
          placeholder="请选择地区"
          required
          left-icon="bookmark-o"
          @change="onChange"
        />
        <p class="hint">
          已选：<code>{{ requiredVal.join('、') || '（空）' }}</code>
        </p>
      </div>

      <div class="section-title">⑨ 父级不可选（select-parent=false，只能选叶子）</div>
      <div class="card">
        <VantTreeTagsField
          v-model="parentOnly"
          :options="regionTree"
          :select-parent="false"
          label="地区"
          title="选择地区（仅叶子可选）"
          placeholder="只能选到区级"
          @change="onChange"
        />
        <p class="hint">
          已选：<code>{{ parentOnly.join('、') || '（空）' }}</code
          >（省 / 市父级已置灰，仅末级可选）
        </p>
      </div>

      <div class="section-title">⑩ 大数据量多选（测试标签换行 / 滚动）</div>
      <div class="card">
        <VantTreeTagsField
          v-model="bigTags"
          :options="interestTree"
          value-key="id"
          label-key="name"
          children-key="subs"
          label="兴趣"
          title="选择兴趣（可多选多项）"
          placeholder="多选标签，测试标签过多时的排版"
          show-path
          separator=" / "
          @change="onChange"
        />
        <p class="hint">
          已选：<code>{{ bigTags.join('、') || '（空）' }}</code
          >（试试选 10 个以上，观察标签换行与回显）
        </p>
      </div>

      <div class="section-title">⑪ change 事件回显</div>
      <div class="card">
        <p class="hint">
          数量：<code>{{ lastCount }}</code>
        </p>
        <div ref="echoBox" class="echo-box">
          <code v-for="(v, i) in lastList" :key="i" class="echo-item">{{ v }}</code>
          <span v-if="!lastList.length" class="echo-empty">（未选择）</span>
        </div>
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
.echo-box {
  max-height: 140px;
  overflow-y: auto;
  background: #f7f8fa;
  border-radius: 8px;
  padding: 8px 10px;
  margin: 0 4px 12px;
}
.echo-item {
  display: inline-block;
  color: #07c160;
  background: #fff;
  border: 1px solid #ebedf0;
  padding: 2px 8px;
  border-radius: 4px;
  margin: 0 6px 6px 0;
  font-size: 12px;
  word-break: break-all;
}
.echo-empty {
  color: #969799;
  font-size: 12px;
}
</style>
