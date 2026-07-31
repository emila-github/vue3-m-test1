/**
 * 回放请求网关（模块级单例）。
 *
 * 设计目标：回放过程中，被重演操作「再次触发」的接口请求，默认不要打到真实后端，
 * 而是「本地模拟」——优先复用录制阶段缓存的成功响应，命中即用；未命中返回安全兜底，
 * 避免回放对线上数据产生副作用。
 *
 * 仅当用户手动开启「真实回放」时，才放行到后端，并为这些再请求接口附加
 * te（track event）标记（query ?te=会话id + header X-Track-Replay），便于后端识别回放流量。
 *
 * 该模块刻意不依赖 track 插件，避免与 http 客户端形成循环依赖；
 * 由 http 拦截器（读）与回放 composable（写）共享。
 */
import type { AxiosResponse } from 'axios'

type CacheKey = string

/** 递归剔除缓存打散字段（t / _t），保证「录制」与「回放」时缓存 key 一致 */
function stripTs(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(stripTs)
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(v as Record<string, unknown>)) {
      if (k === 't' || k === '_t') continue
      out[k] = stripTs((v as Record<string, unknown>)[k])
    }
    return out
  }
  return v
}

function buildKey(method: string, url: string, params?: unknown, data?: unknown): CacheKey {
  const p = params !== undefined ? JSON.stringify(stripTs(params)) : ''
  const d = data !== undefined ? JSON.stringify(stripTs(data)) : ''
  return `${method.toUpperCase()} ${url} ${p} ${d}`
}

class ReplayGate {
  private replaying = false
  private realReplay = false
  private sessionId = ''
  private cache = new Map<CacheKey, unknown>()

  /** 回放开始 / 结束（由回放 composable 在 play / stop 时调用） */
  setReplaying(on: boolean): void {
    this.replaying = on
    if (!on) this.sessionId = ''
  }

  /** 手动开启 / 关闭「真实回放」 */
  setRealReplay(on: boolean): void {
    this.realReplay = on
  }

  isReplaying(): boolean {
    return this.replaying
  }

  isRealReplay(): boolean {
    return this.realReplay
  }

  /** 设置当前回放会话 id（用于 te 标记） */
  setSession(id: string): void {
    this.sessionId = id || ''
  }

  /** 正常请求成功时记录响应（供回放本地模拟）；回放中不记录，避免覆盖 */
  record(method: string, url: string, params: unknown, data: unknown, raw: unknown): void {
    if (this.replaying) return
    if (method.toUpperCase() !== 'GET') return
    this.cache.set(buildKey(method, url, params, data), raw)
  }

  /** 回放（非真实）时取本地模拟响应；未命中返回 undefined */
  private lookup(method: string, url: string, params: unknown, data: unknown): unknown | undefined {
    if (!this.replaying || this.realReplay) return undefined
    return this.cache.get(buildKey(method, url, params, data))
  }

  /** 真实回放时附加的 te 标记值（回放会话 id），非真实回放返回空串 */
  teMarker(): string {
    return this.realReplay ? this.sessionId || '1' : ''
  }

  /** 构造拦截用的本地模拟 Axios 响应（不走真实 adapter） */
  buildLocalResponse(config: any): AxiosResponse {
    const cached = this.lookup(config.method, config.url || '', config.params, config.data)
    // 命中录制缓存 → 原样返回（与后端包络结构一致，响应拦截器照常解析）；
    // 未命中 → 安全兜底，避免回放因缺数据而报错；GET 列表类接口返回空列表更友好
    const body = cached !== undefined ? cached : { code: 0, data: [], message: 'replay-local' }
    return {
      data: body,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    } as AxiosResponse
  }
}

export const replayGate = new ReplayGate()
export default replayGate
