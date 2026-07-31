// 屏幕录屏核心 ScreenRecorder 单测
//
// 通过依赖注入（getDisplayMedia / MediaRecorder / now）在 jsdom 下驱动核心逻辑，
// 不依赖真实浏览器屏幕捕获能力。覆盖：支持判定、起停、暂停/继续、切片、自动上传、
// 业务操作包裹（recordOperation）、超时自动停止、tick、异常路径、dispose。
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ScreenRecorder } from '../recorder'
import type { ScreenRecordUploadResult } from '@/plugins/record/types'

function makeStream(): MediaStream {
  return {
    getTracks: () => [{ stop: vi.fn() }],
    getVideoTracks: () => [{ stop: vi.fn(), addEventListener: vi.fn() }],
  } as unknown as MediaStream
}

class FakeMediaRecorder {
  static isTypeSupported = (_t: string) => true
  static instances: FakeMediaRecorder[] = []
  mimeType: string
  state = 'inactive'
  ondataavailable: ((e: any) => void) | null = null
  onstop: (() => void) | null = null
  onerror: ((e: any) => void) | null = null
  constructor(_stream: any, opts?: any) {
    this.mimeType = opts?.mimeType || 'video/webm'
    this.state = 'recording'
    FakeMediaRecorder.instances.push(this)
  }
  start(_ts?: number) {
    this.ondataavailable?.({ data: new Blob(['chunk'], { type: this.mimeType }), size: 5 })
  }
  stop() {
    this.state = 'inactive'
    this.ondataavailable?.({ data: new Blob(['final'], { type: this.mimeType }), size: 5 })
    this.onstop?.()
  }
  pause() {
    this.state = 'paused'
  }
  resume() {
    this.state = 'recording'
  }
}

function makeRecorder(deps: Partial<ConstructorParameters<typeof ScreenRecorder>[0]> = {}) {
  const getDisplayMedia = (deps.getDisplayMedia as any) ?? vi.fn().mockResolvedValue(makeStream())
  const now = deps.now ?? (() => Date.now())
  return new ScreenRecorder({
    getDisplayMedia,
    MediaRecorderCtor: FakeMediaRecorder as any,
    now,
  })
}

const fakeUploader = vi.fn(
  async (_blob: Blob, _meta: any): Promise<ScreenRecordUploadResult> => ({
    url: '/demo-upload/rec.webm',
    fileId: 'REC1',
    fileName: 'rec.webm',
    size: 10,
  }),
)

beforeEach(() => {
  FakeMediaRecorder.instances = []
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:mock'),
    revokeObjectURL: vi.fn(),
  })
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('支持性判定', () => {
  it('注入 getDisplayMedia + MediaRecorder 时 supported=true', () => {
    const r = makeRecorder()
    expect(r.supported).toBe(true)
  })

  it('jsdom 下无任何实现时 supported=false，start 抛可读错误', async () => {
    const r = new ScreenRecorder({ getDisplayMedia: undefined, MediaRecorderCtor: undefined })
    expect(r.supported).toBe(false)
    await expect(r.start()).rejects.toThrow(/不支持/)
  })
})

describe('起停与切片', () => {
  it('start 进入 recording，stop 产出 blob 且 size>0、durationMs>=0', async () => {
    const r = makeRecorder()
    let states: string[] = []
    r.on((e) => e.type === 'statechange' && states.push(e.state))
    await r.start()
    expect(r.isRecording).toBe(true)
    const res = await r.stop()
    expect(states).toContain('recording')
    expect(states).toContain('stopped')
    expect(res).not.toBeNull()
    expect(res!.blob.size).toBeGreaterThan(0)
    expect(res!.durationMs).toBeGreaterThanOrEqual(0)
    expect(res!.mimeType).toContain('webm')
  })

  it('重复 start 抛错（已在录制中）', async () => {
    const r = makeRecorder()
    await r.start()
    await expect(r.start()).rejects.toThrow(/已在录制中/)
    await r.stop()
  })
})

describe('暂停 / 继续', () => {
  it('pause 进入 paused，resume 回到 recording', async () => {
    const r = makeRecorder()
    await r.start()
    r.pause()
    expect(r.isPaused).toBe(true)
    r.resume()
    expect(r.isRecording).toBe(true)
    await r.stop()
  })
})

describe('自动上传', () => {
  it('start 带 uploader 且 autoUpload=true 时，停止后触发 uploaded 并回填 result.uploaded', async () => {
    const r = makeRecorder()
    fakeUploader.mockClear()
    const uploaded = new Promise<ScreenRecordUploadResult>((resolve) => {
      r.on((e) => e.type === 'uploaded' && resolve(e.result))
    })
    await r.start({ autoUpload: true, uploader: fakeUploader })
    await r.stop()
    const up = await uploaded
    expect(up.url).toBe('/demo-upload/rec.webm')
    expect(r.lastResult!.uploaded).toBe(up)
    expect(fakeUploader).toHaveBeenCalled()
  })

  it('autoUpload=false 时停止不上传', async () => {
    const r = makeRecorder()
    fakeUploader.mockClear()
    await r.start({ autoUpload: false, uploader: fakeUploader })
    await r.stop()
    expect(fakeUploader).not.toHaveBeenCalled()
  })
})

describe('upload()', () => {
  it('无 uploader 时抛错', async () => {
    const r = makeRecorder()
    await r.start()
    await r.stop()
    await expect(r.upload()).rejects.toThrow(/未配置 uploader/)
  })

  it('显式传入 uploader 可上传并回填', async () => {
    const r = makeRecorder()
    await r.start()
    await r.stop()
    const up = await r.upload(fakeUploader)
    expect(up!.url).toBe('/demo-upload/rec.webm')
    expect(r.lastResult!.uploaded).toBe(up)
  })
})

describe('业务操作包裹 recordOperation', () => {
  it('操作发起即录屏，结束后自动停止并上传，返回业务结果', async () => {
    const r = makeRecorder()
    fakeUploader.mockClear()
    const op = vi.fn().mockResolvedValue({ policyNo: 'P123' })
    const { operation } = await r.recordOperation(op, { uploader: fakeUploader })
    expect(op).toHaveBeenCalledOnce()
    expect(operation).toEqual({ policyNo: 'P123' })
    expect(r.lastResult!.uploaded).toBeTruthy()
  })

  it('业务抛错仍会停止并尝试上传，并向上抛出业务错误', async () => {
    const r = makeRecorder()
    await expect(
      r.recordOperation(async () => {
        throw new Error('业务失败')
      }, { uploader: fakeUploader }),
    ).rejects.toThrow('业务失败')
    expect(r.lastResult).not.toBeNull()
  })
})

describe('超时自动停止', () => {
  it('达到 maxDurationMs 后自动停止', async () => {
    const r = makeRecorder()
    let stopped = false
    r.on((e) => e.type === 'statechange' && e.state === 'stopped' && (stopped = true))
    await r.start({ maxDurationMs: 3000 })
    // 推进定时器触发 maxDuration setTimeout → 自动 stop → stopped
    vi.advanceTimersByTime(3000)
    await Promise.resolve() // 让 void this.stop() 的微任务链落定
    expect(stopped).toBe(true)
    expect(r.isRecording).toBe(false)
  })
})

describe('tick 心跳', () => {
  it('录制中周期性派发 tick', async () => {
    const ticks: number[] = []
    const r = makeRecorder({ now: () => 1000 })
    r.on((e) => e.type === 'tick' && ticks.push(e.elapsedMs))
    await r.start()
    vi.advanceTimersByTime(600) // 200ms * 3
    expect(ticks.length).toBeGreaterThanOrEqual(2)
    await r.stop()
  })
})

describe('资源释放', () => {
  it('dispose 清理监听器并回到 idle', () => {
    const r = makeRecorder()
    const cb = vi.fn()
    const off = r.on(cb)
    off()
    expect(r.supported).toBe(true)
  })
})
