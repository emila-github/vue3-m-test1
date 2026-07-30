// 页面操作记录 - 接口模块
import { get, post } from '../request'
import type { TrackBatchPayload, TrackEvent, TrackSession } from '@/plugins/track/types'

/** 批量上报操作记录 */
export function sendTrackEvents(payload: TrackBatchPayload) {
  return post<{ ok: boolean; received: number }>('/track/events', payload)
}

/** 查询会话列表（可按 userId 过滤） */
export function listTrackSessions(params?: { userId?: string }) {
  return get<{ list: TrackSession[] }>('/track/sessions', params)
}

/** 获取单个会话的完整操作序列，用于回放 */
export function getTrackSessionEvents(sessionId: string) {
  return get<{ session: TrackSession; events: TrackEvent[] }>(
    `/track/sessions/${sessionId}/events`,
  )
}
