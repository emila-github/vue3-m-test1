<script setup lang="ts">
/**
 * VantTreeSelectField —— 通用 Vant4 下拉树型（级联）选择组件
 *
 * 基于 van-field（只读触发）+ van-popup（底部弹出）+ van-cascader（树型滚轮）封装。
 * 数据格式可配置：
 *   1) Vant 默认树：[{ text: '浙江', value: 'zj', children: [...] }]
 *   2) 自定义字段：通过 valueKey / labelKey / childrenKey 指定取值字段
 *
 * 选中节点后，回显完整路径文本（如「浙江 / 杭州 / 西湖区」）。
 * 支持树型特性：
 *   - 树型深度不一致时，没有子级的「浅叶节点」可直接选中（van-cascader 原生行为）
 *   - max-depth：限制最多可选层级，超过该层的节点会被裁为可选叶子
 *   - select-parent：父节点（含子级）也可直接选中，级联面板内为每级父节点追加「选择本级」虚拟项
 *
 * 用法：
 *   <VantTreeSelectField v-model="region" :options="regionTree" label="地区" title="选择地区" />
 *   <VantTreeSelectField v-model="org" :options="orgTree" value-key="id" label-key="name" children-key="subs" />
 *   <VantTreeSelectField v-model="area" :options="tree" :max-depth="2" />
 *   <VantTreeSelectField v-model="area" :options="tree" select-parent />
 */
import { ref, computed } from 'vue'

type TreeNode = Record<string, any>

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null
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
    /** 最大可选层级（从 1 起；0 或不传表示不限制）。超过该层的节点会被裁为可选叶子 */
    maxDepth?: number
    /** 父节点（含子级）是否可直接选中。开启后为每级父节点追加「选择本级」虚拟项 */
    selectParent?: boolean
    disabled?: boolean
    readonly?: boolean
    clearable?: boolean
    leftIcon?: string
    required?: boolean
    /** 路径文本分隔符 */
    separator?: string
  }>(),
  {
    modelValue: '',
    options: () => [],
    label: '',
    placeholder: '请选择',
    title: '请选择',
    valueKey: 'value',
    labelKey: 'text',
    childrenKey: 'children',
    maxDepth: 0,
    selectParent: false,
    disabled: false,
    readonly: false,
    clearable: false,
    leftIcon: '',
    required: false,
    separator: ' / ',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  /** 选中叶子时回传：选中值 + 完整路径节点数组 */
  change: [value: string | number, path: TreeNode[]]
}>()

const show = ref(false)
// van-cascader 的 v-model 为叶子节点 value，用于打开时定位当前路径
const cascaderValue = ref<string | number | ''>('')

// 透传给 van-cascader 的字段映射
const fieldNames = computed(() => ({
  text: props.labelKey,
  value: props.valueKey,
  children: props.childrenKey,
}))

// 根据 maxDepth 裁剪树：超过最大层级的节点移除子级，使其成为可直接选中的叶子。
// 树型深度不一致时，原本没有子级的「浅叶节点」保持为叶子，van-cascader 点击即 finish（原生可选）。
// 若开启 selectParent：为每个仍含子级的父节点追加一个「选择本级」虚拟子项，其 value 与父级相同，
// 点击它即等同于选中该父节点（级联面板原生只有无 children 的节点才触发 finish）。
const processedOptions = computed<TreeNode[]>(() => {
  let tree: TreeNode[] = props.options

  if (props.maxDepth && props.maxDepth > 0) {
    const prune = (nodes: TreeNode[], depth: number): TreeNode[] =>
      nodes.map((node) => {
        const children = node[props.childrenKey]
        const hasChildren = Array.isArray(children) && children.length > 0
        // 已达最大可选层级且仍有子级：裁掉子级，变为可选叶子
        if (hasChildren && depth >= props.maxDepth) {
          const clone = { ...node }
          delete clone[props.childrenKey]
          return clone
        }
        if (hasChildren) {
          return { ...node, [props.childrenKey]: prune(children as TreeNode[], depth + 1) }
        }
        return node
      })
    tree = prune(tree, 1)
  }

  if (props.selectParent) {
    // 递归为每一层含子级的父节点追加「选择本级」虚拟项
    const addParentSelect = (nodes: TreeNode[]): TreeNode[] =>
      nodes.map((node) => {
        const children = node[props.childrenKey]
        const hasChildren = Array.isArray(children) && children.length > 0
        if (!hasChildren) return node
        const virtualChild: TreeNode = {
          [props.labelKey]: `选择「${node[props.labelKey]}」`,
          [props.valueKey]: node[props.valueKey],
        }
        return {
          ...node,
          [props.childrenKey]: [...addParentSelect(children as TreeNode[]), virtualChild],
        }
      })
    tree = addParentSelect(tree)
  }

  return tree
})

// 根据 value 在原始树中找到完整路径节点数组（不依赖级联面板返回的 selectedOptions，
// 因此选中「选择本级」虚拟项时也能正确回显纯父级路径）
function findPathByValue(
  value: string | number | null | undefined,
  nodes: TreeNode[] = props.options,
): TreeNode[] {
  if (value === '' || value == null) return []
  for (const node of nodes) {
    if (node[props.valueKey] === value) return [node]
    const children = node[props.childrenKey]
    if (Array.isArray(children) && children.length > 0) {
      const sub = findPathByValue(value, children as TreeNode[])
      if (sub.length) return [node, ...sub]
    }
  }
  return []
}

// 根据 modelValue 在树中找到完整路径节点数组（用于回显文本）
const pathOptions = computed<TreeNode[]>(() => findPathByValue(props.modelValue))

const displayText = computed(() => {
  if (!pathOptions.value.length) return ''
  return pathOptions.value.map((n) => n[props.labelKey]).join(props.separator)
})

const showClear = computed(
  () => props.clearable && props.modelValue !== '' && props.modelValue != null,
)

function open() {
  if (props.disabled || props.readonly) return
  cascaderValue.value =
    props.modelValue === '' || props.modelValue == null ? '' : (props.modelValue as string | number)
  show.value = true
}

// 选中节点（finish 在叶子或「选择本级」虚拟项触发）
function onFinish(params: { value: string | number; selectedOptions: TreeNode[] }) {
  // 用原始树按 value 反查路径，避免虚拟「选择本级」子项污染 path
  const path = findPathByValue(params.value)
  emit('update:modelValue', params.value)
  emit('change', params.value, path)
  show.value = false
}

function onClear() {
  emit('update:modelValue', '')
  emit('change', '', [])
}
</script>

<template>
  <van-field
    :model-value="displayText"
    :label="label"
    :placeholder="placeholder"
    :left-icon="leftIcon"
    :required="required"
    :disabled="disabled"
    is-link
    readonly
    class="vant-tree-select"
    @click="open"
  >
    <template v-if="showClear" #right-icon>
      <van-icon name="clear" class="vant-tree-select__clear" @click.stop="onClear" />
    </template>
  </van-field>

  <van-popup v-model:show="show" position="bottom" round>
    <van-cascader
      v-model="cascaderValue"
      :options="processedOptions"
      :field-names="fieldNames"
      :title="title"
      @finish="onFinish"
      @close="show = false"
    />
  </van-popup>
</template>

<style scoped>
.vant-tree-select :deep(.van-field__control) {
  color: #1a1a1a;
}
.vant-tree-select__clear {
  color: #8a8a8a;
  font-size: 16px;
}
</style>
