// 屏幕录屏插件 - 类型定义
//
// 「页面操作发起录屏并上传后端」插件的核心契约：
//   - ScreenRecorder：基于 getDisplayMedia + MediaRecorder 的录制器
//   - ScreenRecordUploader：把录制 Blob 上传到后端的函数（可替换）
//   - ScreenRecordOptions：每次录制的参数（清晰度 / 是否带音频 / 是否自动上传 / 业务元数据）

/** 录制生命周期状态 */
export type RecordState = 'idle' | 'recording' | 'paused' | 'stopped' | 'error'

/** 录制时附带的业务元数据（用于后端归类检索） */
export interface ScreenRecordMeta {
  /** 业务类型，如 'insurance-claim' */
  bizType?: string
  /** 业务单据 id，便于后端关联到具体单据 */
  bizId?: string
  /** 录屏标题 */
  title?: string
  /** 操作人 id（缺省时由插件从 token 注入） */
  userId?: string
  /** 操作人姓名 */
  userName?: string
  /** 外部传入的会话 id（缺省自动生成） */
  sessionId?: string
}

/** 已上传录屏的列表项（后端列表接口返回） */
export interface ScreenRecordListItem {
  fileId: string
  fileName: string
  /** 后端可访问的文件地址 */
  url: string
  size: number
  mimeType: string
  durationMs: number
  createdAt: number
  sessionId: string
  title?: string
  bizType?: string
  userId?: string
}

/** 后端返回的上传结果 */
export interface ScreenRecordUploadResult {
  /** 后端可访问的文件地址 */
  url: string
  /** 后端文件 id */
  fileId: string
  /** 文件名 */
  fileName: string
  /** 大小（字节） */
  size: number
}

/** 一次录制的最终产物 */
export interface ScreenRecordResult {
  sessionId: string
  title?: string
  /** 录制产生的视频 Blob */
  blob: Blob
  /** 本地预览可用的 object URL（页面卸载前有效） */
  url: string
  mimeType: string
  size: number
  durationMs: number
  startedAt: number
  endedAt: number
  /** 已上传时回填后端结果 */
  uploaded?: ScreenRecordUploadResult
}

/** 传给上传器的元数据（在 ScreenRecordMeta 基础上补全录制技术参数） */
export interface ScreenRecordUploadMeta extends ScreenRecordMeta {
  sessionId: string
  mimeType: string
  size: number
  durationMs: number
}

/** 上传函数签名：接收 Blob 与元数据，返回后端结果 */
export type ScreenRecordUploader = (
  blob: Blob,
  meta: ScreenRecordUploadMeta,
) => Promise<ScreenRecordUploadResult>

/** 单次录制的参数 */
export interface ScreenRecordOptions {
  /** 视频清晰度约束，默认 1280x720@15fps */
  videoConstraints?: DisplayMediaStreamOptions['video']
  /** 是否录制系统/麦克风音频，默认 false */
  audio?: boolean
  /** 期望编码，如 'video/webm;codecs=vp9'，浏览器不支持时自动回退 */
  mimeType?: string
  /** 单次最长录制时长(ms)，超时自动停止，默认 0（不限） */
  maxDurationMs?: number
  /** MediaRecorder 数据切片间隔(ms)，默认 1000，用于周期产出分片 */
  timesliceMs?: number
  /** 停止录制后是否自动上传（缺省取插件级别配置） */
  autoUpload?: boolean
  /** 自定义上传函数（缺省使用插件注入的默认上传器） */
  uploader?: ScreenRecordUploader
  /** 附带的业务元数据 */
  meta?: ScreenRecordMeta
}

/** 录制器对外派发的事件 */
export type ScreenRecordEvent =
  | { type: 'statechange'; state: RecordState; prev: RecordState }
  | { type: 'tick'; elapsedMs: number }
  | { type: 'complete'; result: ScreenRecordResult }
  | { type: 'uploading' }
  | { type: 'uploaded'; result: ScreenRecordUploadResult }
  | { type: 'error'; error: Error }
