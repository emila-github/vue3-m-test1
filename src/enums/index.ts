/**
 * 公共枚举常量字典统一出口（需求文档 §1.6）
 *
 * 各业务域枚举收敛到 `src/enums/*.ts`，业务页面按需引用：
 *   import { YDL_VISIT_TYPE } from '@/enums'
 *   import { YDL_VISIT_TYPE } from '@/enums/ydl'
 */
export * from './ydl'
