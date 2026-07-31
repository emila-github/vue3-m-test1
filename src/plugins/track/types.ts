// 页面操作记录插件 - 类型定义

/** 被记录的操作动作类型 */
export type TrackEventType =
  | 'page_view' // 路由/页面切换
  | 'click' // 点击
  | 'input' // 输入
  | 'change' // 值变更（select / checkbox 等）
  | 'submit' // 表单提交
  | 'scroll' // 页面/容器滚动
  | 'drag' // 拖拽（滑块验证等：pointerdown→move→up 序列）

/** 单条操作记录 */
export interface TrackEvent {
  /** 操作类型 */
  type: TrackEventType
  /** 事件发生时的绝对时间戳（ms） */
  ts: number
  /** 相对会话开始的偏移毫秒，用于回放时序还原 */
  t: number
  /** 页面路径（page_view 为路由 fullPath，其余为 location.pathname） */
  path: string
  /** 元素 CSS 选择器，回放时用于定位元素 */
  selector?: string
  /** 元素标签名 */
  tag?: string
  /** 元素可见文本（裁剪至 50 字） */
  text?: string
  /** 输入/变更后的值（仅 captureValues 时记录；默认及关闭时密码字段不记录，开启后含密码明文） */
  value?: string
  /** 是否为密码字段的值（仅当 captureValues 开启且为 password 输入时出现） */
  isPassword?: boolean
  /** 勾选框勾选态（checkbox / radio，仅 captureValues 时记录） */
  checked?: boolean
  /** 屏幕坐标 */
  x?: number
  y?: number
  /** 拖拽起点坐标（drag 事件，clientX/Y） */
  fromX?: number
  fromY?: number
  /** 拖拽终点坐标（drag 事件，clientX/Y） */
  toX?: number
  toY?: number
  /** 滚动位置（scroll 事件，仅记录节流后的关键帧） */
  scrollX?: number
  scrollY?: number
}

/** 一次用户会话（一次启用记录产生的完整操作序列） */
export interface TrackSession {
  /** 会话唯一标识 */
  sessionId: string
  /** 用户 ID */
  userId: string
  /** 用户姓名 */
  userName: string
  /** 浏览器 UA */
  userAgent: string
  /** 平台 / 系统 */
  platform: string
  /** 屏幕分辨率 */
  screen: string
  /** 会话开始时间 */
  startedAt: number
  /** 会话结束时间（关闭记录时写入） */
  endedAt?: number
  /** 累计事件数 */
  eventCount: number
}

/** 批量上报载荷 */
export interface TrackBatchPayload {
  session: TrackSession
  events: TrackEvent[]
}
