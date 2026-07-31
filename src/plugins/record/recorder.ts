// 屏幕录屏核心 - ScreenRecorder
//
// 封装浏览器原生「屏幕录制」能力：
//   1. navigator.mediaDevices.getDisplayMedia() 获取屏幕/标签页媒体流
//   2. MediaRecorder 把媒体流录制成 Blob（webm / mp4）
//   3. 停止后产出 ScreenRecordResult（含本地预览 objectURL），并经 uploader 上传后端
//
// 设计要点：
//   - 依赖注入（getDisplayMedia / MediaRecorder / now）使核心逻辑可在 jsdom 下单测；
//   - 支持「页面操作发起录屏」语义：recordOperation() 包裹一次业务动作，
//     动作发起即开始录屏，动作结束（成败均）自动停止并上传；
//   - 跨 realm / 不支持环境下 isSupported() 返回 false，start() 抛可读错误而非静默崩溃。
import type {
  RecordState,
  ScreenRecordEvent,
  ScreenRecordOptions,
  ScreenRecordResult,
  ScreenRecordUploader,
  ScreenRecordUploadMeta,
  ScreenRecordUploadResult,
} from './types'

export interface ScreenRecorderDeps {
  getDisplayMedia?: (constraints?: DisplayMediaStreamOptions) => Promise<MediaStream>
  MediaRecorderCtor?: typeof MediaRecorder
  now?: () => number
}

const DEFAULT_VIDEO: DisplayMediaStreamOptions['video'] = { width: 1280, height: 720, frameRate: 15 }

// 编码优先级：优先 vp9/vp8（体积更小），回退到通用 webm / mp4
const MIME_CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4',
]

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

function genSessionId(): string {
  const t = Date.now().toString(36)
  const r = Math.random().toString(36).slice(2, 8)
  return `rec-${t}-${r}`
}

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
  get supported(): boolean {
    return this._supported
  }
  get state(): RecordState {
    return this._state
  }
  get isRecording(): boolean {
    return this._state === 'recording'
  }
  get isPaused(): boolean {
    return this._state === 'paused'
  }
  get lastResult(): ScreenRecordResult | null {
    return this._lastResult
  }
  /** 当前录制流，供 Demo 做实时预览（video.srcObject） */
  get stream(): MediaStream | null {
    return this._stream
  }

  // ==================== 事件 ====================
  on(cb: (e: ScreenRecordEvent) => void): () => void {
    this._listeners.add(cb)
    return () => {
      this._listeners.delete(cb)
    }
  }
  private _emit(e: ScreenRecordEvent) {
    this._listeners.forEach((l) => l(e))
  }
  private _setState(next: RecordState) {
    const prev = this._state
    if (prev === next) return
    this._state = next
    this._emit({ type: 'statechange', state: next, prev })
  }

  // ==================== 开始录制 ====================
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

  pause(): void {
    if (this._state !== 'recording') return
    this._recorder?.pause?.()
    this._stopTick()
    this._setState('paused')
  }

  resume(): void {
    if (this._state !== 'paused') return
    this._recorder?.resume?.()
    this._setState('recording')
    this._startTick()
  }

  /** 停止录制。返回的 Promise 在「录制完成」(complete) 时 resolve 出结果（不等待上传）。 */
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
   * 包裹一次「业务操作」：操作发起时自动开始录屏，操作结束（无论成败）自动停止并上传。
   * 适用于「页面操作发起录屏」场景：把用户的一次业务动作（如提交投保）整体录制上传。
   * 内部强制 autoUpload=false，统一在 finally 后显式 upload()，便于 await 上传完成。
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

  private _startTick() {
    this._stopTick()
    this._tickTimer = setInterval(() => {
      const elapsed = this._now() - this._startedAt
      this._emit({ type: 'tick', elapsedMs: elapsed })
    }, 200)
  }
  private _stopTick() {
    if (this._tickTimer) {
      clearInterval(this._tickTimer)
      this._tickTimer = null
    }
  }
  private _cleanupStream() {
    this._stream?.getTracks().forEach((t) => t.stop())
    this._stream = null
  }

  /** 释放资源：停止录制、清理流与定时器、回收 objectURL */
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
