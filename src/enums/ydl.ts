/**
 * 公共枚举常量字典（ydl 业务域）
 *
 * 对应需求文档 §1.6：原 vue2 散落在 `config/dataConfig.js` 等处的**公共枚举常量**，
 * Vue3 统一收敛到 `src/enums/*.ts` 并以 TS 类型化常量落地。
 *
 * ⚠️ 本文件**仅收录 §1.6 中明确列出的公共枚举**（id→name 映射）。
 *    其余「选项 / 树」类数据（承保公司、渠道、机构树、标签树、险种静态选项等）
 *    属 mock / 业务选项，不在此处重复定义，仍写在各自数据层。
 *
 * 命名沿用 `YDL_` 前缀，与 §1.6 各枚举一一对应；既支持 `YDL_XXX[id]` 回显，
 * 也支持 `Object.entries(YDL_XXX)` 生成下拉选项。
 */

// ==================== 销售归属（SALE_TYPE） ====================
/** 销售归属 SALE_TYPE：0=团险 1=个险 2=农险 */
export const YDL_SALE_TYPE: Record<number, string> = {
  0: '团险',
  1: '个险',
  2: '农险',
}

// ==================== 拜访（VISIT_*） ====================
/** 拜访类型 VISIT_TYPE：0=电话沟通 1=微信沟通 2=上门拜访 */
export const YDL_VISIT_TYPE: Record<number, string> = {
  0: '电话沟通',
  1: '微信沟通',
  2: '上门拜访',
}

/** 拜访进程 VISIT_PROCESS_STATUS：0=已签单 1=跟进中 2=同业投保 3=无意向 */
export const YDL_VISIT_PROCESS: Record<number, string> = {
  0: '已签单',
  1: '跟进中',
  2: '同业投保',
  3: '无意向',
}

/** 是否完成拜访 VISIT_FINISH_FLAG：Y=是 N=否 */
export const YDL_VISIT_FINISH_FLAG: Record<string, string> = {
  Y: '是',
  N: '否',
}

/** 是否上级支持 UP_FLAG：Y=是 N=否 */
export const YDL_UP_FLAG: Record<string, string> = {
  Y: '是',
  N: '否',
}

// ==================== 领导点评（LEADER_COMMENT_LEVEL） ====================
/** 领导点评等级 LEADER_COMMENT_LEVEL：1=差 2=良 3=优 */
export const YDL_COMMENT_LEVEL: Record<number, string> = {
  1: '差',
  2: '良',
  3: '优',
}

// ==================== 待点评标签（WAIT_COMMENTS） ====================
/** 待点评标签 WAIT_COMMENTS：1=待点评 2=新增 */
export const YDL_WAIT_COMMENTS: Record<number, string> = {
  1: '待点评',
  2: '新增',
}

// ==================== 成单 / 销售结果 ====================
/** 成单类型 ORDER_TYPE：NEW=新保 RENEWAL=续保 */
export const YDL_ORDER_TYPE: Record<string, string> = {
  NEW: '新保',
  RENEWAL: '续保',
}

/** 销售结果 SALES_RESULT_STATUS：Y=成功 N=失败 */
export const YDL_SALES_RESULT: Record<string, string> = {
  Y: '成功',
  N: '失败',
}

// ==================== 业务去向主体（BUSSINESS_BELONG_TYPE） ====================
/** 业务去向主体 BUSSINESS_BELONG_TYPE：0~9（id=name，文档口径） */
export const YDL_BUSSINESS_BELONG: Record<number, string> = {
  0: '平安',
  1: '保保',
  2: '国寿',
  3: '太保',
  4: '新华',
  5: '泰康',
  6: '太平',
  7: '阳光',
  8: '中华',
  9: '其他',
}

// ==================== 取值辅助函数（绑定 §1.6 枚举） ====================

/** 点评等级颜色（1=红 2=蓝 3=绿），用于列表 tag（对应 LEADER_COMMENT_LEVEL） */
export function ydlCommentColor(level: number | undefined | null): string {
  return level === 1 ? '#ee0a24' : level === 2 ? '#1989fa' : level === 3 ? '#07c160' : '#c8c9cc'
}

/** 取待点评文案（仅 1/2 有值，对应 WAIT_COMMENTS） */
export function ydlWaitCommentsText(v: number | undefined | null): string {
  return v != null ? (YDL_WAIT_COMMENTS[v] ?? '') : ''
}
