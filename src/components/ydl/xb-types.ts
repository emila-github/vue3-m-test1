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
