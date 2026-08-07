/** 屏幕录屏插件 - Vue 插件入口
 *
 * ## 安装（main.ts）
 * ```ts
 * import { createScreenRecordPlugin } from '@/plugins/record'
 * app.use(createScreenRecordPlugin({ autoUpload: true }))
 * ```
 *
 * ## 使用
 * ```ts
 * import { useScreenRecord } from '@/plugins/record'
 * const record = useScreenRecord()
 *
 * // 方式一：手动控制
 * await record.start({ meta: { bizType: 'insurance-claim' } })
 * // ... 业务操作 ...
 * const result = await record.stop()
 *
 * // 方式二：自动包裹
 * const { result, operation } = await record.recordOperation(
 *   () => submitClaim(),
 *   { meta: { bizType: 'insurance-claim' } },
 * )
 * ```
 *
 * ## 核心概念
 * - 内部维护模块级单例，`useScreenRecord()` 在任意组件中拿到同一实例
 * - 基于 `navigator.mediaDevices.getDisplayMedia()` + `MediaRecorder` 实现
 * - 需要 HTTPS 或 localhost 环境
 *
 * @module @/plugins/record
 */
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

/** Vue provide/inject 的 InjectionKey */
const ScreenRecordKey: InjectionKey<ScreenRecordPlugin> = Symbol('screen-record')

/**
 * 插件对外暴露的公共接口
 *
 * 通过 `useScreenRecord()` 获取该接口的实例，然后调用其中的方法进行录屏操作。
 */
export interface ScreenRecordPlugin {
  /** 底层 ScreenRecorder 实例（可访问 state、stream、lastResult 等） */
  recorder: ScreenRecorder
  /** 当前环境是否支持屏幕录制 */
  isSupported: () => boolean
  /** 发起录屏，弹出浏览器屏幕选择框 */
  start: (opts?: ScreenRecordOptions) => Promise<void>
  /** 停止录制，返回录制产物 */
  stop: () => Promise<ScreenRecordResult | null>
  /** 暂停录制 */
  pause: () => void
  /** 恢复录制 */
  resume: () => void
  /** 包裹一次业务操作：自动开始录屏→执行业务→停止→上传 */
  recordOperation: <T>(
    operation: () => Promise<T> | T,
    opts?: ScreenRecordOptions,
  ) => Promise<{ result: ScreenRecordResult | null; operation: T }>
  /** 手动上传最后一次录制产物 */
  upload: (uploader?: ScreenRecordUploader) => Promise<ScreenRecordUploadResult | null>
  /** 订阅录制事件，返回取消订阅函数 */
  on: (cb: (e: ScreenRecordEvent) => void) => () => void
}

/**
 * `createScreenRecordPlugin()` 的配置项
 */
export interface ScreenRecordPluginOptions {
  /** 停止录制后是否自动上传后端，默认 `true` */
  autoUpload?: boolean
  /** 自定义默认上传器，缺省使用内置 demo 上传器（base64 + JSON） */
  uploader?: ScreenRecordUploader
  /** 底层依赖注入（仅测试用），可注入 getDisplayMedia / MediaRecorder / 时间函数 */
  deps?: ScreenRecorderDeps
  /** 默认附带的业务元数据（如统一 `userId`），会与每次 `start()` 传入的 meta 浅合并 */
  defaultMeta?: ScreenRecordMeta
}

/** 模块级单例，供 `useScreenRecord()` 在任意组件/脚本中获取同一实例 */
let globalPlugin: ScreenRecordPlugin | null = null

/**
 * 内置默认上传器：base64（JSON）方式，兼容本仓库 mock 后端与真实 JSON 后端
 *
 * 流程：blob → base64 → 调用 `uploadScreenRecord()` → 后端存盘 + 写数据库。
 * 自动从 token 中提取 userId/userName 填入元数据。
 *
 * @param blob 录制视频 Blob
 * @param meta 上传元数据
 * @returns 后端上传结果
 */
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

/**
 * 构建 ScreenRecordPlugin 实例
 *
 * 将插件配置（autoUpload、uploader、defaultMeta）固化到实例的每个方法调用中，
 * 使得组件侧调用 `record.start()` 时自动携带这些默认配置。
 *
 * @param options 插件配置
 * @returns ScreenRecordPlugin 实例
 * @internal
 */
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

/**
 * 创建屏幕录屏 Vue 插件
 *
 * 安装后会同时注册三套访问方式：
 * 1. `useScreenRecord()` composable（推荐）
 * 2. `this.$screenRecord`（Options API）
 * 3. `window.__screenRecord`（调试用）
 *
 * ## 示例
 * ```ts
 * // main.ts
 * import { createScreenRecordPlugin } from '@/plugins/record'
 * const app = createApp(App)
 * app.use(createScreenRecordPlugin({
 *   autoUpload: true,
 *   uploader: customUploader,        // 可选：自定义上传函数
 *   defaultMeta: { bizType: 'default' },  // 可选：默认业务元数据
 * }))
 * ```
 *
 * @param options 插件配置
 * @returns Vue Plugin 对象
 */
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

/**
 * 获取屏幕录屏插件实例
 *
 * 组件内优先从 Vue 的 provide/inject 获取，组件外（setup 执行前、测试、脚本）
 * 回退到模块级单例 `globalPlugin`。若两者都未找到（未安装插件），则自动
 * `buildPlugin()` 兜底创建，方便测试和临时使用场景。
 *
 * ## 示例
 * ```ts
 * import { useScreenRecord } from '@/plugins/record'
 *
 * const record = useScreenRecord()
 *
 * // 订阅状态变化
 * const off = record.on((e) => {
 *   if (e.type === 'statechange') console.log(e.prev, '→', e.state)
 * })
 *
 * // 开始录制
 * await record.start({ meta: { bizType: 'form', bizId: '123' } })
 *
 * // 停止并获取产物
 * const result = await record.stop()
 * console.log(result?.durationMs, result?.blob.size)
 * ```
 *
 * @returns ScreenRecordPlugin 插件实例
 */
export function useScreenRecord(): ScreenRecordPlugin {
  const injected = getCurrentInstance() && inject(ScreenRecordKey)
  if (injected) return injected
  if (globalPlugin) return globalPlugin
  // 兜底：未安装插件时也能用（脚本/测试场景），但不会携带插件级配置
  return buildPlugin()
}

export { ScreenRecorder }
export type { ScreenRecorderDeps } from './recorder'
export * from './types'
