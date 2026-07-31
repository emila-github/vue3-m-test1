// 页面操作记录 - mock 后端
//
// 仅用于本地无后端联调（npm run dev:mock）。真实环境由后端落盘并提供查询接口。
import type { IncomingMessage } from 'node:http'
import type { TrackBatchPayload, TrackEvent, TrackSession } from '@/plugins/track/types'
import type { MockRoute } from './types'

interface StoredSession {
  session: TrackSession
  events: TrackEvent[]
}

const sessions = new Map<string, StoredSession>()

function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (chunk) => (data += chunk))
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {})
      } catch {
        resolve({})
      }
    })
  })
}

export const trackMockRoutes: MockRoute[] = [
  // 批量上报：写入内存存储
  {
    method: 'POST',
    url: '/track/events',
    response: async (req: IncomingMessage) => {
      const body = (await parseBody(req)) as TrackBatchPayload
      const { session, events } = body
      if (!session?.sessionId) {
        return { code: 400, msg: 'sessionId 缺失', data: null }
      }
      const prev = sessions.get(session.sessionId)
      if (prev) {
        prev.events.push(...events)
        prev.session.eventCount = prev.events.length
        prev.session.endedAt = session.endedAt
        prev.session.userName = session.userName
        prev.session.userId = session.userId
      } else {
        sessions.set(session.sessionId, {
          session: { ...session, eventCount: events.length },
          events: [...events],
        })
      }
      return { code: 200, msg: 'ok', data: { ok: true, received: events.length } }
    },
  },
  // 会话列表
  {
    method: 'GET',
    url: '/track/sessions',
    response: (req: IncomingMessage) => {
      const url = new URL(req.url ?? '', 'http://localhost')
      const userId = url.searchParams.get('userId') || ''
      const list = Array.from(sessions.values())
        .map((s) => s.session)
        .filter((s) => (userId ? s.userId === userId : true))
        .sort((a, b) => b.startedAt - a.startedAt)
      return { code: 200, msg: 'ok', data: { list } }
    },
  },
  // 会话详情（含完整操作序列），用于回放
  {
    method: 'GET',
    url: '/track/sessions/',
    response: (req: IncomingMessage) => {
      const m = (req.url ?? '').match(/\/track\/sessions\/([^/]+)\/events/)
      const id = m?.[1]
      const stored = id ? sessions.get(id) : undefined
      if (!stored) {
        return { code: 404, msg: '会话不存在', data: null }
      }
      return { code: 200, msg: 'ok', data: stored }
    },
  },
]
