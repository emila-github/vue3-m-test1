/** 屏幕录屏插件 - 类型定义
 *
 * 「页面操作发起录屏并上传后端」插件的核心契约：
 * - ScreenRecorder：基于 getDisplayMedia + MediaRecorder 的录制器
 * - ScreenRecordUploader：把录制 Blob 上传到后端的函数（可替换）
 * - ScreenRecordOptions：每次录制的参数（清晰度 / 是否带音频 / 是否自动上传 / 业务元数据）
 */

/**
 * 录制生命周期状态
 *
 * 状态流转图：
 * ```
 * idle → (start) → recording ⇄ (pause/resume) ⇄ paused
 *                               → (stop) → stopped → (start) → recording ...
 *                               → (异常) → error    → (start) → recording ...
 * ```
 *
 * - `idle`     空闲态，初始化完成但尚未开始录制，可调用 `start()` 发起录屏
 * - `recording` 正在录制中，MediaRecorder 处于 recording 状态，tick 计时器运行中
 * - `paused`    录制已暂停，MediaRecorder 暂停但媒体流保持连接，可 `resume()` 或 `stop()`
 * - `stopped`   录制已停止（正常结束/超时），Blob 已产出，`lastResult` 可读取，可重新 `start()`
 * - `error`     录制异常（MediaRecorder error、用户关闭共享标签页等），需重新 `start()` 恢复
 */
export type RecordState = 'idle' | 'recording' | 'paused' | 'stopped' | 'error'

/**
 * 录制时附带的业务元数据（用于后端归类检索）
 *
 * 通过 `start({ meta: { bizType, bizId, title, ... } })` 传入，
 * 会随上传请求一并发送给后端，便于按业务维度查询录屏列表。
 */
export interface ScreenRecordMeta {
  /** 业务类型，如 `'insurance-claim'`、`'form-operation'` */
  bizType?: string
  /** 业务单据 ID，后端可据此关联到具体单据 */
  bizId?: string
  /** 录屏标题，展示在列表和管理后台 */
  title?: string
  /** 操作人 ID（缺省时由插件从 token 自动注入） */
  userId?: string
  /** 操作人姓名（缺省时由插件从 token 自动注入） */
  userName?: string
  /** 外部传入的会话 ID（缺省时插件自动生成 `rec-{timestamp}-{random}` 格式） */
  sessionId?: string
}

/**
 * 已上传录屏的列表项（后端列表接口返回）
 *
 * 用于录屏管理页面展示历史录制记录，数据由 `/demo/screen-record/list` 等接口提供。
 */
export interface ScreenRecordListItem {
  /** 后端文件唯一标识 */
  fileId: string
  /** 文件名 */
  fileName: string
  /** 后端可访问的文件地址（用于播放/下载） */
  url: string
  /** 文件大小（字节） */
  size: number
  /** 视频 MIME 类型，如 `video/webm;codecs=vp9` */
  mimeType: string
  /** 录制时长（毫秒） */
  durationMs: number
  /** 创建时间戳 */
  createdAt: number
  /** 录制会话 ID */
  sessionId: string
  /** 录屏标题 */
  title?: string
  /** 业务类型 */
  bizType?: string
  /** 操作人 ID */
  userId?: string
}

/**
 * 后端返回的上传结果
 *
 * 上传接口成功返回的数据结构，同时会回填到 `ScreenRecordResult.uploaded` 字段。
 */
export interface ScreenRecordUploadResult {
  /** 后端可访问的文件地址（用于播放/下载） */
  url: string
  /** 后端文件 ID */
  fileId: string
  /** 文件名 */
  fileName: string
  /** 文件大小（字节） */
  size: number
}

/**
 * 一次录制的最终产物
 *
 * `stop()` 成功后的返回值，包含视频 Blob、本地预览 URL、录制时长等完整信息。
 * 其中 `blob` 可进一步上传或通过 `<a download>` 导出，`url` 是 `URL.createObjectURL(blob)` 产物。
 */
export interface ScreenRecordResult {
  /** 录制会话 ID */
  sessionId: string
  /** 录屏标题 */
  title?: string
  /** 录制产生的视频 Blob，可进一步上传或下载 */
  blob: Blob
  /** 本地预览可用的 object URL（页面卸载前有效，dispose() 时回收） */
  url: string
  /** 视频 MIME 类型，如 `video/webm;codecs=vp9` */
  mimeType: string
  /** 文件大小（字节） */
  size: number
  /** 实际录制时长（毫秒，从 start 到 stop） */
  durationMs: number
  /** 录制开始时间戳 */
  startedAt: number
  /** 录制结束时间戳 */
  endedAt: number
  /** 上传成功后自动回填的后端结果 */
  uploaded?: ScreenRecordUploadResult
}

/**
 * 传给上传器的元数据（`ScreenRecordMeta` + 录制技术参数）
 *
 * 当调用 `upload()` 时，录制器会自动将 `lastResult` 的技术参数与 `start()` 传入的业务元数据
 * 合并为 `ScreenRecordUploadMeta`，传给上传函数。
 */
export interface ScreenRecordUploadMeta extends ScreenRecordMeta {
  /** 录制会话 ID */
  sessionId: string
  /** 视频 MIME 类型 */
  mimeType: string
  /** 文件大小（字节） */
  size: number
  /** 录制时长（毫秒） */
  durationMs: number
}

/**
 * 上传函数签名
 *
 * 自定义上传器需满足此签名，接收录制产生的 Blob 与元数据，返回后端上传结果。
 * 可在插件初始化时注入全局默认上传器，也可在 `start()` 时按单次录制覆盖。
 *
 * @param blob 录制产生的视频 Blob
 * @param meta 合并后的上传元数据（业务 + 技术参数）
 * @returns 后端返回的上传结果（url、fileId、fileName、size）
 */
export type ScreenRecordUploader = (
  blob: Blob,
  meta: ScreenRecordUploadMeta,
) => Promise<ScreenRecordUploadResult>

/**
 * 单次录制的参数
 *
 * 通过 `start(opts)` 或 `recordOperation(operation, opts)` 传入，
 * 控制本次录制的技术参数、自动上传行为及关联的业务元数据。
 */
export interface ScreenRecordOptions {
  /** 视频清晰度约束，默认 `{ width: 1280, height: 720, frameRate: 15 }` */
  videoConstraints?: DisplayMediaStreamOptions['video']
  /** 是否录制系统/麦克风音频，默认 `false` */
  audio?: boolean
  /** 期望编码格式，如 `'video/webm;codecs=vp9'`，浏览器不支持时自动从候选中回退 */
  mimeType?: string
  /** 单次最长录制时长（毫秒），超时自动 `stop()`，默认 `0`（不限） */
  maxDurationMs?: number
  /** MediaRecorder 数据切片间隔（毫秒），默认 `1000`，影响 `ondataavailable` 回调频率 */
  timesliceMs?: number
  /** 停止录制后是否自动上传，缺省取插件级配置（`createScreenRecordPlugin({ autoUpload })`） */
  autoUpload?: boolean
  /** 自定义上传函数，缺省使用插件注入的默认上传器 */
  uploader?: ScreenRecordUploader
  /** 附带的业务元数据 */
  meta?: ScreenRecordMeta
}

/**
 * 录制器对外派发的事件（联合类型）
 *
 * 通过 `record.on(callback)` 订阅，回调接收该联合类型，
 * 可根据 `e.type` 区分不同类型并提取对应字段。
 */
export type ScreenRecordEvent =
  | { type: 'statechange'; state: RecordState; prev: RecordState }
  | { type: 'tick'; elapsedMs: number }
  | { type: 'complete'; result: ScreenRecordResult }
  | { type: 'uploading' }
  | { type: 'uploaded'; result: ScreenRecordUploadResult }
  | { type: 'error'; error: Error }
