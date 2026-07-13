<script setup lang="ts">
/**
 * VantTreeTagsField —— 通用 Vant4 下拉树型「分类打标签」多选组件
 *
 * 基于 van-field（只读触发）+ van-popup（底部弹出）+ 自定义可展开树（checkbox 多选）封装。
 * 选中的节点以 van-tag 标签形式回显，每个标签可单独删除。
 * 数据格式可配置：
 *   1) Vant 默认树：[{ text: '浙江', value: 'zj', children: [...] }]
 *   2) 自定义字段：通过 valueKey / labelKey / childrenKey 指定取值字段
 *   3) select-parent：父节点（含子级）是否可被选中。默认 true（全可选）；
 *      设为 false 时仅叶子节点可勾选，含子级的父节点置灰不可选，但仍可展开下钻。
 *
 * 用法：
 *   <VantTreeTagsField v-model="regions" :options="regionTree" label="地区" title="选择地区" />
 *   <VantTreeTagsField v-model="tags" :options="tree" value-key="id" label-key="name" children-key="subs" show-path />
 *   <VantTreeTagsField v-model="tags" :options="tree" :select-parent="false" />
 *
 * 清空：字段右侧 clearable 图标一键清空；弹层内底部「清空」按钮重置当前勾选。
 */
import { ref, computed } from 'vue'

type TreeNode = Record<string, any>

interface FlatRow {
  node: TreeNode
  depth: number
  hasChildren: boolean
  expanded: boolean
}

const props = withDefaults(
  defineProps<{
    modelValue?: Array<string | number>
    /** 树型数据，节点含 children 字段表示下级 */
    options?: TreeNode[]
    label?: string
    placeholder?: string
    title?: string
    /** 自定义对象中取值字段（默认 value） */
    valueKey?: string
    /** 自定义对象中取文本字段（默认 text） */
    labelKey?: string
    /** 自定义对象中取子级字段（默认 children） */
    childrenKey?: string
    /** 标签是否显示完整路径（如「浙江 / 杭州」），默认只显示节点名 */
    showPath?: boolean
    /** 父节点（含子级）是否可被选中。默认 true；为 false 时仅叶子节点可勾选 */
    selectParent?: boolean
    /** 路径文本分隔符（showPath 为 true 时生效） */
    separator?: string
    /** 最多可选数量（0 或不传表示不限制） */
    max?: number
    disabled?: boolean
    readonly?: boolean
    clearable?: boolean
    leftIcon?: string
    required?: boolean
  }>(),
  {
    modelValue: () => [],
    options: () => [],
    label: '',
    placeholder: '请选择',
    title: '请选择',
    valueKey: 'value',
    labelKey: 'text',
    childrenKey: 'children',
    showPath: false,
    selectParent: true,
    separator: ' / ',
    max: 0,
    disabled: false,
    readonly: false,
    clearable: false,
    leftIcon: '',
    required: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: Array<string | number>]
  /** 选中变化时回传：选中值数组 + 对应节点数组 */
  change: [value: Array<string | number>, nodes: TreeNode[]]
}>()

const show = ref(false)
// 弹层内临时勾选，确认后才写回
const tempSelected = ref<Array<string | number>>([])
// 已展开的节点 value 集合
const expanded = ref<Set<string | number>>(new Set())

// value -> 节点 映射，便于回显标签文本
const nodeMap = computed(() => {
  const m = new Map<string | number, TreeNode>()
  const walk = (nodes: TreeNode[]) => {
    for (const n of nodes) {
      m.set(n[props.valueKey], n)
      const children = n[props.childrenKey]
      if (Array.isArray(children) && children.length > 0) walk(children as TreeNode[])
    }
  }
  walk(props.options)
  return m
})

// 根据 value 反查完整路径
function findPath(value: string | number): TreeNode[] {
  const path: TreeNode[] = []
  const walk = (nodes: TreeNode[]): boolean => {
    for (const n of nodes) {
      path.push(n)
      if (n[props.valueKey] === value) return true
      const children = n[props.childrenKey]
      if (Array.isArray(children) && children.length > 0 && walk(children as TreeNode[]))
        return true
      path.pop()
    }
    return false
  }
  walk(props.options)
  return path
}

// 展平为带层级的行（仅包含已展开分支），用于渲染树
const flatList = computed<FlatRow[]>(() => {
  const rows: FlatRow[] = []
  const walk = (nodes: TreeNode[], depth: number) => {
    for (const node of nodes) {
      const children = node[props.childrenKey]
      const hasChildren = Array.isArray(children) && children.length > 0
      const value = node[props.valueKey] as string | number
      const isExpanded = expanded.value.has(value)
      rows.push({ node, depth, hasChildren, expanded: isExpanded })
      if (hasChildren && isExpanded) walk(children as TreeNode[], depth + 1)
    }
  }
  walk(props.options, 0)
  return rows
})

// 已选节点（用于 change 回传与标签文本）
const selectedNodes = (values: Array<string | number>): TreeNode[] =>
  values.map((v) => nodeMap.value.get(v)).filter((n): n is TreeNode => !!n)

// 标签展示：节点名 或 完整路径
const selectedTags = computed(() =>
  (props.modelValue ?? [])
    .map((v) => {
      const node = nodeMap.value.get(v)
      if (!node) return null
      const text = props.showPath
        ? findPath(v)
            .map((n) => n[props.labelKey])
            .join(props.separator)
        : node[props.labelKey]
      return { value: v, text }
    })
    .filter((t): t is { value: string | number; text: string } => !!t),
)

const displayText = computed(() => {
  const len = (props.modelValue ?? []).length
  return len > 0 ? `已选 ${len} 项` : ''
})

const showClear = computed(
  () => (props.modelValue ?? []).length > 0 && !props.disabled && !props.readonly,
)

function isChecked(value: string | number) {
  return tempSelected.value.includes(value)
}

// 是否禁用勾选：
//  - 关闭父级可选（selectParent=false）且当前行含子级（即父节点）时，置灰不可选，但仍可展开下钻
//  - 达到 max 上限且未选中时，禁用其余项
// 直接用渲染行已算好的 rowHasChildren，保证「有展开箭头才可能被禁用」，叶子必然可选
function isDisabled(value: string | number, rowHasChildren: boolean) {
  if (!props.selectParent && rowHasChildren) return true
  return props.max > 0 && !isChecked(value) && tempSelected.value.length >= props.max
}

function open() {
  if (props.disabled || props.readonly) return
  tempSelected.value = Array.from(props.modelValue ?? []) as Array<string | number>
  // 默认展开第一层，方便直接浏览
  if (expanded.value.size === 0) {
    expanded.value = new Set(props.options.map((o) => o[props.valueKey] as string | number))
  }
  show.value = true
}

function toggleExpand(value: string | number) {
  const s = new Set(expanded.value)
  if (s.has(value)) s.delete(value)
  else s.add(value)
  expanded.value = s
}

// 整行点击：
//  - select-parent=false 且为父节点时，点击行（非箭头）折叠/展开，方便下钻，而非“点了没反应”
//  - 其余情况（叶子，或 select-parent=true 的父节点）走 toggle 勾选
function onRowClick(row: FlatRow) {
  if (row.hasChildren && !props.selectParent) {
    toggleExpand(row.node[props.valueKey] as string | number)
    return
  }
  toggle(row.node[props.valueKey] as string | number, row.hasChildren)
}

function toggle(value: string | number, rowHasChildren = false) {
  if (isDisabled(value, rowHasChildren)) return
  const set = new Set(tempSelected.value)
  if (set.has(value)) set.delete(value)
  else set.add(value)
  tempSelected.value = Array.from(set)
}

function confirm() {
  const val = Array.from(tempSelected.value)
  emit('update:modelValue', val)
  emit('change', val, selectedNodes(val))
  show.value = false
}

function cancel() {
  show.value = false
}

function remove(value: string | number) {
  const arr = (props.modelValue ?? []).filter((v) => v !== value)
  emit('update:modelValue', arr)
  emit('change', arr, selectedNodes(arr))
}

function onClear() {
  emit('update:modelValue', [])
  emit('change', [], [])
}

// 弹层内清空：仅重置临时勾选（确认后写回），不立即改外部值
function clearTemp() {
  tempSelected.value = []
}
</script>

<template>
  <div class="vant-tree-tags">
    <van-field
      :model-value="displayText"
      :label="label"
      :placeholder="placeholder"
      :left-icon="leftIcon"
      :required="required"
      :disabled="disabled"
      is-link
      readonly
      class="vant-tree-tags__field"
      @click="open"
    >
      <template v-if="showClear" #right-icon>
        <span class="vant-tree-tags__clear" role="button" aria-label="清空" @click.stop="onClear">
          <van-icon name="clear" />
        </span>
      </template>
    </van-field>

    <div v-if="selectedTags.length" class="vant-tree-tags__tags">
      <van-tag
        v-for="t in selectedTags"
        :key="t.value"
        type="primary"
        closeable
        class="vant-tree-tags__tag"
        @close="remove(t.value)"
      >
        {{ t.text }}
      </van-tag>
    </div>

    <van-popup v-model:show="show" position="bottom" round class="vant-tree-tags__popup">
      <div class="tree-header">{{ title }}</div>
      <div class="tree-body">
        <div
          v-for="row in flatList"
          :key="row.node[valueKey]"
          class="tree-row"
          :class="{ 'is-disabled': isDisabled(row.node[valueKey], row.hasChildren) }"
          :style="{ paddingLeft: row.depth * 18 + 12 + 'px' }"
          @click="onRowClick(row)"
        >
          <van-icon
            v-if="row.hasChildren"
            :name="row.expanded ? 'chevron-down' : 'chevron-right'"
            class="tree-row__arrow"
            @click.stop="toggleExpand(row.node[valueKey])"
          />
          <span v-else class="tree-row__arrow tree-row__arrow--spacer" />
          <van-icon
            :name="isChecked(row.node[valueKey]) ? 'checked' : 'circle'"
            :class="[
              'tree-row__check',
              isChecked(row.node[valueKey]) ? 'is-checked' : 'is-unchecked',
              { 'is-disabled': isDisabled(row.node[valueKey], row.hasChildren) },
            ]"
          />
          <span class="tree-row__label">{{ row.node[labelKey] }}</span>
        </div>
      </div>
      <div class="tree-footer">
        <span class="tree-footer__count">
          {{ max > 0 ? `已选 ${tempSelected.length} / ${max}` : `已选 ${tempSelected.length} 项` }}
        </span>
        <div class="tree-footer__btns">
          <van-button size="small" :disabled="tempSelected.length === 0" @click="clearTemp"
            >清空</van-button
          >
          <van-button size="small" @click="cancel">取消</van-button>
          <van-button size="small" type="primary" @click="confirm">确定</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.vant-tree-tags__field :deep(.van-field__control) {
  color: #1a1a1a;
}
.vant-tree-tags__clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #8a8a8a;
  font-size: 16px;
  padding: 4px 2px 4px 6px;
  margin-right: 2px;
  cursor: pointer;
}
.vant-tree-tags__clear:active {
  color: #323233;
}
.vant-tree-tags__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 12px 4px;
}
.vant-tree-tags__tag {
  font-size: 12px;
}
.tree-header {
  font-size: 15px;
  font-weight: 600;
  text-align: center;
  padding: 14px;
  border-bottom: 1px solid #f2f3f5;
}
.tree-body {
  max-height: 50vh;
  overflow-y: auto;
  padding: 4px 0;
}
.tree-row {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding-right: 12px;
  cursor: pointer;
}
.tree-row.is-disabled {
  cursor: pointer;
}
.tree-row__arrow {
  font-size: 16px;
  color: #969799;
  width: 20px;
  flex: none;
  cursor: pointer;
}
.tree-row__arrow--spacer {
  display: inline-block;
}
.tree-row__check {
  font-size: 18px;
  margin-right: 8px;
  flex: none;
}
.tree-row__check.is-checked {
  color: #1989fa;
}
.tree-row__check.is-unchecked {
  color: #c8c9cc;
}
.tree-row__check.is-disabled {
  opacity: 0.4;
}
.tree-row__label {
  font-size: 14px;
  color: #323233;
  flex: 1;
}
.tree-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
  border-top: 1px solid #f2f3f5;
}
.tree-footer__count {
  font-size: 13px;
  color: #969799;
}
.tree-footer__btns {
  display: flex;
  gap: 10px;
}
</style>
