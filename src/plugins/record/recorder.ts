/** 屏幕录屏核心 - ScreenRecorder
 *
 * 封装浏览器原生「屏幕录制」能力：
 * 1. `navigator.mediaDevices.getDisplayMedia()` 获取屏幕/标签页媒体流
 * 2. `MediaRecorder` 把媒体流录制成 Blob（webm / mp4）
 * 3. 停止后产出 `ScreenRecordResult`（含本地预览 objectURL），并经 uploader 上传后端
 *
 * ## 设计要点
 * - **依赖注入**：`getDisplayMedia` / `MediaRecorder` / `now` 可注入，使核心逻辑可在 jsdom 下单测
 * - **业务包裹模式**：`recordOperation()` 包裹一次业务动作，动作发起即开始录屏，动作结束（成败均）自动停止并上传
 * - **优雅降级**：不支持环境下 `supported === false`，`start()` 抛可读错误而非静默崩溃
 * - **生命周期**：`idle → recording ⇄ paused → stopped | error`，每次状态变更均派发 `statechange` 事件
 *
 * @example
 * ```ts
 * const recorder = new ScreenRecorder()
 *
 * // 开始录制
 * await recorder.start({
 *   videoConstraints: { width: 1920, height: 1080, frameRate: 30 },
 *   audio: false,
 *   maxDurationMs: 5 * 60 * 1000,
 *   meta: { bizType: 'form-operation' },
 * })
 *
 * // 暂停 / 恢复
 * recorder.pause()
 * recorder.resume()
 *
 * // 停止录制
 * const result = await recorder.stop()
 * console.log(result.url, result.durationMs)
 *
 * // 上传
 * const uploaded = await recorder.upload(customUploader)
 * ```
 */
import type {
  RecordState,
  ScreenRecordEvent,
  ScreenRecordOptions,
  ScreenRecordResult,
  ScreenRecordUploader,
  ScreenRecordUploadMeta,
  ScreenRecordUploadResult,
} from './types'

/**
 * ScreenRecorder 的依赖注入接口（用于单元测试）
 *
 * 注入 fake/mock 实现即可在 jsdom 等非浏览器环境下验证录制逻辑。
 * 不注入时自动使用浏览器原生 API。
 */
export interface ScreenRecorderDeps {
  /** `navigator.mediaDevices.getDisplayMedia()` 的替代实现 */
  getDisplayMedia?: (constraints?: DisplayMediaStreamOptions) => Promise<MediaStream>
  /** `MediaRecorder` 构造函数的替代实现 */
  MediaRecorderCtor?: typeof MediaRecorder
  /** 获取当前时间戳的函数替代（如 `Date.now`），返回毫秒数 */
  now?: () => number
}

/** 默认视频约束：1280x720 @ 15fps */
const DEFAULT_VIDEO: DisplayMediaStreamOptions['video'] = { width: 1280, height: 720, frameRate: 15 }

/**
 * 编码优先级列表
 *
 * 优先 vp9/vp8（WebM 容器，体积更小），回退到通用 webm / mp4。
 * 最终选用第一个 `MediaRecorder.isTypeSupported()` 返回 `true` 的格式。
 */
const MIME_CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4',
]

/**
 * 从编码候选列表中选取最优 MIME 类型
 *
 * 按 `MIME_CANDIDATES` 顺序遍历，返回第一个浏览器支持的编码格式。
 * `isTypeSupported` 异常时跳过该候选，全部失败时兜底返回 `'video/webm'`。
 *
 * @param ctor MediaRecorder 构造函数（注入的或浏览器原生）
 * @returns 选定的 MIME 类型字符串
 * @internal
 */
function pickMimeType(ctor: typeof MediaRecorder | undefined): string {
  if (ctor && typeof (ctor as any).isTypeSupported === 'function') {
    for (const c of MIME_CANDIDATES) {
      try {
        if ((ctor as any).isTypeSupported(c)) return c
      } catch {
        /* 个别浏览器 isTypeSupported 抛错，跳过 */
      }
    }
  }
  return 'video/webm'
}

/**
 * 生成录制会话 ID
 *
 * 格式：`rec-{timestamp36}-{random6}`，如 `rec-lt3k8x-a3f2q1`
 *
 * @returns 会话 ID 字符串
 * @internal
 */
function genSessionId(): string {
  const t = Date.now().toString(36)
  const r = Math.random().toString(36).slice(2, 8)
  return `rec-${t}-${r}`
}

/**
 * 屏幕录制核心类
 *
 * ## 状态模型
 * ```
 * idle → (start) → recording ⇄ (pause/resume) ⇄ paused
 *                               → (stop) → stopped
 *                               → (异常) → error
 * ```
 *
 * ## 关键字段
 * - `state`：当前生命周期状态
 * - `lastResult`：最后一次停止后产出的录制结果
 * - `stream`：当前媒体流（可用于 `<video>` 实时预览）
 * - `supported`：当前环境是否支持录制
 */
export class ScreenRecorder {
  private _supported: boolean
  private _getDisplayMedia?: (c?: DisplayMediaStreamOptions) => Promise<MediaStream>
  private _MediaRecorder?: typeof MediaRecorder
  private _now: () => number

  private _state: RecordState = 'idle'
  private _stream: MediaStream | null = null
  private _recorder: MediaRecorder | null = null
  private _chunks: BlobPart[] = []
  private _startedAt = 0
  private _endedAt = 0
  private _maxTimer: ReturnType<typeof setTimeout> | null = null
  private _tickTimer: ReturnType<typeof setInterval> | null = null
  private _options: ScreenRecordOptions = {}
  private _listeners = new Set<(e: ScreenRecordEvent) => void>()
  private _objectUrl: string | null = null
  private _lastResult: ScreenRecordResult | null = null

  /**
   * 创建 ScreenRecorder 实例
   *
   * 构造函数内部会自动检测浏览器兼容性：
   * - `navigator.mediaDevices.getDisplayMedia` 是否存在
   * - `MediaRecorder` 构造函数是否可用
   * - 不满足时将 `_supported` 置为 `false`，后续 `start()` 会抛出可读错误
   *
   * @param deps 依赖注入（用于测试），不传则使用浏览器原生 API
   */
  constructor(deps: ScreenRecorderDeps = {}) {
    const native =
      typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getDisplayMedia === 'function'
        ? (c?: DisplayMediaStreamOptions) => navigator.mediaDevices!.getDisplayMedia(c ?? { video: true })
        : undefined
    this._getDisplayMedia = deps.getDisplayMedia ?? native
    this._MediaRecorder =
      deps.MediaRecorderCtor ?? (typeof MediaRecorder !== 'undefined' ? MediaRecorder : undefined)
    this._now = deps.now ?? (() => Date.now())
    this._supported = !!this._getDisplayMedia && !!this._MediaRecorder
  }

  // ==================== 只读访问 ====================

  /** 当前环境是否支持屏幕录制（需 `getDisplayMedia` + `MediaRecorder`） */
  get supported(): boolean {
    return this._supported
  }
  /** 当前录制生命周期状态 */
  get state(): RecordState {
    return this._state
  }
  /** 是否正在录制中（`state === 'recording'`） */
  get isRecording(): boolean {
    return this._state === 'recording'
  }
  /** 是否已暂停（`state === 'paused'`） */
  get isPaused(): boolean {
    return this._state === 'paused'
  }
  /** 最后一次录制产物，未录制过则为 `null` */
  get lastResult(): ScreenRecordResult | null {
    return this._lastResult
  }
  /** 当前录制流，可用作 `<video>` 的 `srcObject` 实现实时预览 */
  get stream(): MediaStream | null {
    return this._stream
  }

  // ==================== 事件 ====================

  /**
   * 订阅录制事件
   *
   * 可订阅的事件类型见 `ScreenRecordEvent`：
   * - `statechange`：状态变化（含新旧状态）
   * - `tick`：录制中每 200ms 触发（elapsedMs）
   * - `complete`：录制完成，Blob 已产出
   * - `uploading`：开始上传
   * - `uploaded`：上传成功
   * - `error`：录制或上传异常
   *
   * @param cb 事件回调
   * @returns 取消订阅函数，调用即移除该回调
   *
   * @example
   * ```ts
   * const off = recorder.on((e) => {
   *   if (e.type === 'tick') elapsed.value = e.elapsedMs
   *   if (e.type === 'statechange') console.log(e.prev, '→', e.state)
   * })
   * // 组件卸载时取消订阅
   * onBeforeUnmount(off)
   * ```
   */
  on(cb: (e: ScreenRecordEvent) => void): () => void {
    this._listeners.add(cb)
    return () => {
      this._listeners.delete(cb)
    }
  }

  /**
   * 向所有订阅者派发事件
   * @internal
   */
  private _emit(e: ScreenRecordEvent) {
    this._listeners.forEach((l) => l(e))
  }

  /**
   * 设置状态并派发 `statechange` 事件
   *
   * 相同状态不重复派发。
   *
   * @param next 目标状态
   * @internal
   */
  private _setState(next: RecordState) {
    const prev = this._state
    if (prev === next) return
    this._state = next
    this._emit({ type: 'statechange', state: next, prev })
  }

  // ==================== 开始录制 ====================

  /**
   * 发起屏幕录制（弹出浏览器屏幕选择框）
   *
   * ## 执行流程
   * 1. 检查浏览器兼容性，不支持则抛错并派发 `error` 事件
   * 2. 检查当前状态，`recording` / `paused` 时抛错
   * 3. 调用 `getDisplayMedia(constraints)` 弹出屏幕选择框（用户需手动选择窗口/标签页）
   * 4. 创建 `MediaRecorder` 并开始录制
   * 5. 启动 tick 计时器（每 200ms 派发 `elapsedMs`）
   * 6. 启动 `maxDurationMs` 超时定时器（若配置）
   * 7. 监听视频轨道 `ended` 事件（用户关闭共享标签页时自动 stop）
   *
   * ## MediaRecorder 降级
   * 若指定 `mimeType` 不被浏览器支持，自动从 `MIME_CANDIDATES` 选取回退编码。
   * 旧 Safari 不支持 `new MediaRecorder(stream, { mimeType })`，此时降级为无参构造。
   *
   * ## 注意事项
   * - **必须在用户手势（点击/触摸）的微任务链中调用**，否则浏览器会拒绝 `getDisplayMedia`
   * - 录制中的视频轨道意外结束时（用户点"停止共享"），会自动调用 `stop()` 收尾
   *
   * @param opts 录制参数（视频约束、音频、时长限制、自动上传、元数据等）
   * @throws {Error} 环境不支持或已在录制中
   *
   * @example
   * ```ts
   * // 基础用法
   * await recorder.start()
   *
   * // 高清视频 + 最长 5 分钟
   * await recorder.start({
   *   videoConstraints: { width: 1920, height: 1080, frameRate: 30 },
   *   maxDurationMs: 5 * 60 * 1000,
   *   meta: { bizType: 'claim', bizId: 'CLM-001' },
   * })
   *
   * // 带音频录制
   * await recorder.start({ audio: true })
   * ```
   */
  async start(opts: ScreenRecordOptions = {}): Promise<void> {
    if (!this._supported) {
      const err = new Error(
        '当前环境不支持屏幕录制：需要 HTTPS 或 localhost，且浏览器实现 getDisplayMedia + MediaRecorder',
      )
      this._emit({ type: 'error', error: err })
      throw err
    }
    if (this._state === 'recording' || this._state === 'paused') {
      throw new Error('已在录制中，请先停止')
    }
    this._options = opts
    this._chunks = []
    const constraints: DisplayMediaStreamOptions = {
      video: opts.videoConstraints ?? DEFAULT_VIDEO,
      audio: opts.audio ?? false,
    }
    const stream = await this._getDisplayMedia!(constraints)
    this._stream = stream
    const Ctor = this._MediaRecorder!
    const mimeType = this._resolveMime(opts.mimeType)
    let recorder: MediaRecorder
    try {
      recorder = new Ctor(stream, mimeType ? { mimeType } : undefined)
    } catch {
      // 部分浏览器（如旧 Safari）不接受带 options 的构造，降级为无 options
      recorder = new Ctor(stream)
    }
    this._recorder = recorder
    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) this._chunks.push(e.data)
    }
    recorder.onstop = () => {
      void this._finalize()
    }
    recorder.onerror = (e: any) => {
      const error = (e && e.error) || new Error('MediaRecorder 录制失败')
      this._emit({ type: 'error', error })
      this._stopTick()
      this._cleanupStream()
      this._setState('error')
    }
    this._startedAt = this._now()
    recorder.start(opts.timesliceMs ?? 1000)
    this._setState('recording')
    this._startTick()
    if (opts.maxDurationMs && opts.maxDurationMs > 0) {
      this._maxTimer = setTimeout(() => {
        if (this._state === 'recording' || this._state === 'paused') void this.stop()
      }, opts.maxDurationMs)
    }
    // 浏览器里用户点「停止共享」会结束视频轨，这里自动收尾
    stream.getVideoTracks().forEach((track) => {
      track.addEventListener('ended', () => {
        if (this._state === 'recording') void this.stop()
      })
    })
  }

  /**
   * 解析录制的 MIME 类型
   *
   * 如果用户指定了 `preferred` 且浏览器支持，直接使用；
   * 否则从 `MIME_CANDIDATES` 自动选取最优编码。
   *
   * @param preferred 用户期望的编码格式
   * @returns 实际使用的 MIME 类型
   * @internal
   */
  private _resolveMime(preferred?: string): string {
    const Ctor = this._MediaRecorder
    if (preferred && Ctor && typeof (Ctor as any).isTypeSupported === 'function') {
      try {
        if ((Ctor as any).isTypeSupported(preferred)) return preferred
      } catch {
        /* noop */
      }
    }
    return pickMimeType(Ctor)
  }

  /**
   * 暂停录制
   *
   * 调用 `MediaRecorder.pause()` 暂停录制，停止 tick 计时器，
   * 媒体流保持连接（不会断开，可恢复）。状态变为 `paused`。
   *
   * 仅在 `recording` 状态下有效，其他状态调用无效果。
   */
  pause(): void {
    if (this._state !== 'recording') return
    this._recorder?.pause?.()
    this._stopTick()
    this._setState('paused')
  }

  /**
   * 恢复录制
   *
   * 调用 `MediaRecorder.resume()` 继续录制，重启 tick 计时器。
   * 状态由 `paused` 恢复为 `recording`。
   *
   * 仅在 `paused` 状态下有效，其他状态调用无效果。
   */
  resume(): void {
    if (this._state !== 'paused') return
    this._recorder?.resume?.()
    this._setState('recording')
    this._startTick()
  }

  /**
   * 停止录制
   *
   * ## 行为
   * 1. 若当前为 `idle` / `error`，直接返回 `lastResult`（上次产物）
   * 2. 调用 `MediaRecorder.stop()` 停止录制器
   * 3. 异步等待 `onstop` 回调中的 `_finalize()` 完成
   * 4. `_finalize()` 负责合并分片 → 生成 Blob → 创建 objectURL → 产出 `ScreenRecordResult`
   * 5. 若配置 `autoUpload = true`，`_finalize()` 中会自动调用 `upload()`
   *
   * ## 返回值
   * 返回 `Promise<ScreenRecordResult | null>`：
   * - 正常结束：返回包含 blob、url、durationMs 等完整信息的 `ScreenRecordResult`
   * - 无录制内容（从未 start）：返回 `null` 或上次 `lastResult`
   * - 同步假实现（单测）：Promise 直接 resolved
   * - 真实浏览器：等待 `complete` 事件
   *
   * @returns 录制产物（包含视频 Blob 和本地预览 URL）
   */
  stop(): Promise<ScreenRecordResult | null> {
    if (this._state === 'idle' || this._state === 'error') {
      return Promise.resolve(this._lastResult)
    }
    // 触发 onstop → _finalize。对于同步假 recorder，_finalize 在此刻已同步跑完并产生结果；
    // 对于真实 MediaRecorder，onstop 是异步的，complete 事件稍后派发。
    this._recorder?.stop()
    // _finalize 已同步完成（常见于单测假实现）：直接返回
    if (this._state === 'stopped' && this._lastResult) {
      return Promise.resolve(this._lastResult)
    }
    // 否则等待异步的 complete 事件（真实 MediaRecorder）
    return new Promise((resolve) => {
      const off = this.on((e) => {
        if (e.type === 'complete') {
          off()
          resolve(this._lastResult)
        } else if (e.type === 'error') {
          off()
          resolve(this._lastResult)
        }
      })
    })
  }

  /**
   * 录制停止后的收尾处理（内部调用，不对外暴露）
   *
   * 执行顺序：
   * 1. 停止 tick 计时器
   * 2. 清除 `maxDurationMs` 超时定时器
   * 3. 将所有数据分片合并为一个 Blob
   * 4. 清理 MediaStream（停止所有轨道）
   * 5. 创建 `URL.createObjectURL(blob)` 用于本地预览
   * 6. 构建 `ScreenRecordResult` 并存入 `_lastResult`
   * 7. 状态设为 `stopped`，派发 `complete` 事件
   * 8. 若 `autoUpload = true`，自动调用 `upload()`
   *
   * @internal
   */
  private async _finalize(): Promise<void> {
    this._stopTick()
    if (this._maxTimer) {
      clearTimeout(this._maxTimer)
      this._maxTimer = null
    }
    const mimeType = this._recorder?.mimeType || pickMimeType(this._MediaRecorder)
    const blob = new Blob(this._chunks, { type: mimeType })
    this._endedAt = this._now()
    this._cleanupStream()
    if (this._objectUrl) {
      URL.revokeObjectURL(this._objectUrl)
    }
    const objectUrl = URL.createObjectURL(blob)
    this._objectUrl = objectUrl
    const result: ScreenRecordResult = {
      sessionId: this._options.meta?.sessionId ?? genSessionId(),
      title: this._options.meta?.title,
      blob,
      url: objectUrl,
      mimeType,
      size: blob.size,
      durationMs: Math.max(0, this._endedAt - this._startedAt),
      startedAt: this._startedAt,
      endedAt: this._endedAt,
    }
    this._lastResult = result
    this._setState('stopped')
    this._emit({ type: 'complete', result })

    // autoUpload 由调用方（插件/recordOperation）统一控制，这里不直接上传，
    // 避免「停止即上传」与「包裹业务操作再上传」两种路径重复上传。
    if (this._options.autoUpload) {
      try {
        await this.upload()
      } catch {
        /* error 已在 upload 内 emit */
      }
    }
  }

  /**
   * 上传最后一次录制产物到后端
   *
   * ## 执行流程
   * 1. 检查 `_lastResult` 是否存在，无内容则抛错
   * 2. 获取上传器（优先用参数传入的，其次用 `start()` 时配置的，否则抛错）
   * 3. 派发 `uploading` 事件
   * 4. 将 `lastResult` 的技术参数与 `start()` 传入的 meta 合并为 `ScreenRecordUploadMeta`
   * 5. 调用上传器 `fn(blob, meta)`，等待返回
   * 6. 成功：将结果回填到 `result.uploaded`，派发 `uploaded` 事件
   * 7. 失败：派发 `error` 事件并抛出异常
   *
   * ## 注意事项
   * - 上传成功后结果会回填到 `lastResult.uploaded`，可链式读取
   * - 同一份产物重复调用 `upload()` 会重复上传（不做去重）
   * - 上传失败时错误通过事件和抛出异常双通道通知
   *
   * @param uploader 可选的自定义上传器，不传则使用 `start()` 时配置的上传器
   * @returns 后端上传结果（url、fileId、fileName、size）
   * @throws {Error} 没有可上传的录制或未配置 uploader
   *
   * @example
   * ```ts
   * const uploaded = await recorder.upload(customUploader)
   * console.log(uploaded.fileId, uploaded.url)
   *
   * // 或从 lastResult 读取
   * console.log(recorder.lastResult?.uploaded?.url)
   * ```
   */
  async upload(uploader?: ScreenRecordUploader): Promise<ScreenRecordUploadResult | null> {
    const result = this._lastResult
    if (!result) {
      const err = new Error('没有可上传的录制，请先停止录制')
      this._emit({ type: 'error', error: err })
      throw err
    }
    const fn = uploader ?? this._options.uploader
    if (!fn) {
      const err = new Error('未配置 uploader，无法上传（请通过插件注入默认上传器或显式传入）')
      this._emit({ type: 'error', error: err })
      throw err
    }
    this._emit({ type: 'uploading' })
    const meta: ScreenRecordUploadMeta = {
      sessionId: result.sessionId,
      title: result.title,
      mimeType: result.mimeType,
      size: result.size,
      durationMs: result.durationMs,
      bizType: this._options.meta?.bizType,
      bizId: this._options.meta?.bizId,
      userId: this._options.meta?.userId,
      userName: this._options.meta?.userName,
    }
    try {
      const up = await fn(result.blob, meta)
      result.uploaded = up
      this._emit({ type: 'uploaded', result: up })
      return up
    } catch (e) {
      this._emit({ type: 'error', error: e as Error })
      throw e
    }
  }

  /**
   * 包裹一次业务操作：自动录屏 → 执行业务 → 停止录屏 → 上传
   *
   * ## 设计意图
   * 适用于「页面操作发起录屏」场景，将用户的一次完整业务动作（如提交投保单）
   * 整体录制并上传，事后可通过录屏回溯操作全过程。
   *
   * ## 执行顺序
   * 1. `start(opts)` → 弹出屏幕选择框，开始录制
   * 2. 执行 `operation()` 业务函数
   * 3. `stop()` → 停止录制，产出 Blob
   * 4. `upload()` → 将录屏上传后端
   * 5. 返回录制产物 + 业务结果
   *
   * ## 异常处理
   * - 业务操作 `operation()` 抛出异常：仍会停止录制并上传（便于回溯异常现场），最后重新抛出业务异常
   * - 录制上传失败：不影响业务结果返回（`result` 为 `null`），上传异常被吞掉
   * - 内部强制 `autoUpload = false`，统一在 finally 后显式 `upload()`，避免 await 钩子时序问题
   *
   * @param operation 需要录制的业务操作（同步或异步均可）
   * @param opts 录制参数
   * @returns `{ result, operation }`，`result` 为录制产物（上传失败时为 null），`operation` 为业务返回值
   * @throws 如果 `operation()` 抛出异常，会在录制上传完成后重新抛出
   *
   * @example
   * ```ts
   * const { result, operation } = await recorder.recordOperation(
   *   () => api.submitClaim(formData),
   *   {
   *     maxDurationMs: 3 * 60 * 1000,
   *     meta: { bizType: 'claim', bizId: formData.id },
   *   },
   * )
   * // operation: 业务返回值
   * // result: 录制产物（含 blob、url、uploaded 等）
   * ```
   */
  async recordOperation<T>(
    operation: () => Promise<T> | T,
    opts: ScreenRecordOptions = {},
  ): Promise<{ result: ScreenRecordResult | null; operation: T }> {
    const merged: ScreenRecordOptions = { ...opts, autoUpload: false }
    await this.start(merged)
    let opErr: unknown
    let opResult: T
    try {
      opResult = await operation()
    } catch (e) {
      opErr = e
    } finally {
      await this.stop()
    }
    // 无论业务成败，都尽量把已录制内容上传（便于事后回溯异常现场）
    try {
      if (!this._lastResult?.uploaded) await this.upload()
    } catch {
      /* 上传失败不影响业务结果返回 */
    }
    if (opErr) throw opErr
    return { result: this._lastResult, operation: opResult! }
  }

  /**
   * 启动 tick 计时器（每 200ms 派发一次 `tick` 事件）
   *
   * `start()` / `resume()` 时自动调用，重复调用前会先清除已有定时器。
   * tick 事件携带 `elapsedMs` 字段，表示从录制开始到当前的累计毫秒数。
   *
   * @internal
   */
  private _startTick() {
    this._stopTick()
    this._tickTimer = setInterval(() => {
      const elapsed = this._now() - this._startedAt
      this._emit({ type: 'tick', elapsedMs: elapsed })
    }, 200)
  }

  /**
   * 停止 tick 计时器
   *
   * `pause()` / `stop()` / `_finalize()` / `error` 时自动调用。
   * 清除 `setInterval` 句柄，停止派发 `tick` 事件。
   *
   * @internal
   */
  private _stopTick() {
    if (this._tickTimer) {
      clearInterval(this._tickTimer)
      this._tickTimer = null
    }
  }

  /**
   * 清理媒体流（停止所有轨道）
   *
   * 停止 MediaStream 中所有 `MediaStreamTrack`，释放摄像头/屏幕共享资源。
   * `_finalize()` / `error` / `dispose()` 中自动调用。
   *
   * @internal
   */
  private _cleanupStream() {
    this._stream?.getTracks().forEach((t) => t.stop())
    this._stream = null
  }

  /**
   * 释放所有资源：停止录制、清理流与定时器、回收 objectURL、清空监听器
   *
   * 通常在页面/组件卸载时调用，避免内存泄漏。调用后该实例不建议继续使用。
   *
   * ## 清理内容
   * - 若正在录制/暂停中，先 `MediaRecorder.stop()`
   * - 停止所有 MediaStreamTrack
   * - 清除 tick 定时器 + maxDurationMs 超时定时器
   * - `URL.revokeObjectURL()` 回收本地预览 URL
   * - 清空所有事件监听器
   *
   * @example
   * ```ts
   * onBeforeUnmount(() => {
   *   recorder.dispose()
   * })
   * ```
   */
  dispose(): void {
    if (this._state === 'recording' || this._state === 'paused') {
      this._recorder?.stop()
    }
    this._cleanupStream()
    this._stopTick()
    if (this._maxTimer) {
      clearTimeout(this._maxTimer)
      this._maxTimer = null
    }
    if (this._objectUrl) {
      URL.revokeObjectURL(this._objectUrl)
      this._objectUrl = null
    }
    this._listeners.clear()
  }
}
