// 屏幕录屏插件 - Vue 插件入口
//
// 用法：
//   // main.ts（默认开启自动上传；录屏需用户手势触发，插件不自动录制）
//   import { createScreenRecordPlugin } from '@/plugins/record'
//   app.use(createScreenRecordPlugin({ autoUpload: true }))
//
//   // 任意组件
//   import { useScreenRecord } from '@/plugins/record'
//   const record = useScreenRecord()
//   await record.start({ meta: { bizType: 'insurance-claim' } })  // 页面操作发起录屏
//   // ... 业务进行 ...
//   await record.stop()                                            // 停止并（自动）上传后端
//
//   // 或一步到位：包裹一次业务操作，自动录屏->上传
//   await record.recordOperation(() => submitClaim(), { meta: { bizType: 'insurance-claim' } })
import type { App, InjectionKey, Plugin } from 'vue'
import { getCurrentInstance, inject } from 'vue'
import { ScreenRecorder, type ScreenRecorderDeps } from './recorder'
import { uploadScreenRecord, blobToBase64 } from '@/api/modules/demo-record'
import { getUserInfo } from '@/api/core/token'
import type {
  ScreenRecordMeta,
  ScreenRecordOptions,
  ScreenRecordResult,
  ScreenRecordUploader,
  ScreenRecordEvent,
  ScreenRecordUploadResult,
} from './types'

const ScreenRecordKey: InjectionKey<ScreenRecordPlugin> = Symbol('screen-record')

export interface ScreenRecordPlugin {
  recorder: ScreenRecorder
  isSupported: () => boolean
  start: (opts?: ScreenRecordOptions) => Promise<void>
  stop: () => Promise<ScreenRecordResult | null>
  pause: () => void
  resume: () => void
  recordOperation: <T>(
    operation: () => Promise<T> | T,
    opts?: ScreenRecordOptions,
  ) => Promise<{ result: ScreenRecordResult | null; operation: T }>
  upload: (uploader?: ScreenRecordUploader) => Promise<ScreenRecordUploadResult | null>
  on: (cb: (e: ScreenRecordEvent) => void) => () => void
}

export interface ScreenRecordPluginOptions {
  /** 停止录制后是否自动上传，默认 true */
  autoUpload?: boolean
  /** 自定义默认上传器，缺省使用本插件内置的 demo 上传（base64 + JSON，兼容 mock 后端） */
  uploader?: ScreenRecordUploader
  /** 底层依赖注入（测试用） */
  deps?: ScreenRecorderDeps
  /** 默认附带的业务元数据（如统一 userId） */
  defaultMeta?: ScreenRecordMeta
}

// 模块级单例，供 useScreenRecord() 在任意组件/脚本中获取同一实例
let globalPlugin: ScreenRecordPlugin | null = null

/** 内置默认上传器：base64（JSON）方式，兼容本仓库 mock 后端与真实 JSON 后端 */
const defaultDemoUploader: ScreenRecordUploader = async (blob, meta) => {
  const base64 = await blobToBase64(blob)
  const info = getUserInfo()
  const ext = (meta.mimeType || '').includes('mp4') ? '.mp4' : '.webm'
  const title = meta.title || 'screen-record'
  const fileName = `${title}-${meta.sessionId}${ext}`
  return uploadScreenRecord({
    fileName,
    base64,
    mimeType: meta.mimeType,
    size: meta.size,
    durationMs: meta.durationMs,
    sessionId: meta.sessionId,
    title: meta.title,
    bizType: meta.bizType,
    bizId: meta.bizId,
    userId: meta.userId ?? info?.userId,
    userName: meta.userName ?? info?.name,
  })
}

function buildPlugin(options: ScreenRecordPluginOptions = {}): ScreenRecordPlugin {
  const recorder = new ScreenRecorder(options.deps)
  const defaultUploader = options.uploader ?? defaultDemoUploader
  const baseMeta = options.defaultMeta ?? {}

  const plugin: ScreenRecordPlugin = {
    recorder,
    isSupported: () => recorder.supported,
    start: (opts) =>
      recorder.start({
        autoUpload: options.autoUpload ?? true,
        ...opts,
        uploader: opts?.uploader ?? defaultUploader,
        meta: { ...baseMeta, ...opts?.meta },
      }),
    stop: () => recorder.stop(),
    pause: () => recorder.pause(),
    resume: () => recorder.resume(),
    recordOperation: (operation, opts) =>
      recorder.recordOperation(operation, {
        autoUpload: options.autoUpload ?? true,
        ...opts,
        uploader: opts?.uploader ?? defaultUploader,
        meta: { ...baseMeta, ...opts?.meta },
      }),
    upload: (uploader) => recorder.upload(uploader ?? defaultUploader),
    on: (cb) => recorder.on(cb),
  }
  return plugin
}

export function createScreenRecordPlugin(options: ScreenRecordPluginOptions = {}): Plugin {
  return {
    install(app: App) {
      const plugin = buildPlugin(options)
      globalPlugin = plugin
      app.provide(ScreenRecordKey, plugin)
      ;(app.config.globalProperties as any).$screenRecord = plugin
      ;(window as any).__screenRecord = plugin
    },
  }
}

export function useScreenRecord(): ScreenRecordPlugin {
  const injected = getCurrentInstance() && inject(ScreenRecordKey)
  if (injected) return injected
  if (globalPlugin) return globalPlugin
  // 兜底：未安装插件时也能用（脚本/测试场景）
  return buildPlugin()
}

export { ScreenRecorder }
export type { ScreenRecorderDeps } from './recorder'
export * from './types'
