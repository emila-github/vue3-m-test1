/**
 * 续保管理（非车）看板查询条件声明式配置类型（§6 我的续保 / 问题项目 / 项目终止 共用）
 * 不同类型对应不同控件与参数名，详见 YdlXbBoard 渲染逻辑。
 */
export interface XbQueryField {
  /** org：分支公司树；dateRange：到期时间(数组→{key}_begin/{key}_end)；dict：字典下拉；text：文本输入；status：状态(复用 statusDict) */
  type: 'org' | 'dateRange' | 'dict' | 'text' | 'status'
  /** query 绑定字段；dateRange 用此 key 存 [起,止] 数组，提交时自动拆为 `${key}_begin`/`${key}_end`（如 enddate→enddate_begin/enddate_end） */
  key: string
  /** 展示标签 */
  label: string
  /** dict 类型：字典编码（如 FEE_RANGE）；其余类型忽略 */
  dict?: string
}

/**
 * 续保管理（非车）看板列表项字段声明式配置（§6 三类共用，对齐需求「列表字段」）。
 * 通过 listFields prop 传入后，列表卡片按配置渲染；不传则使用默认卡片布局。
 */
export type XbListField =
  /** 主标题（如投保人名称） */
  | { kind: 'title'; key: string }
  /** 状态 tag：用 statusColor 上色 + dict 映射文案（如 questionStatus→QUESTION_STATUS） */
  | { kind: 'status'; key: string; dict: string }
  /** 普通字典 tag：蓝色 + dict 映射文案（如 questionType→QUESTION_TYPE） */
  | { kind: 'tag'; key: string; dict: string }
  /** 金额：自动前缀 ¥ 并千分位 */
  | { kind: 'money'; key: string; label?: string }
  /** 普通文本：label：value */
  | { kind: 'text'; key: string; label?: string }
