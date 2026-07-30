// 页面操作记录插件 - Vue 插件入口
//
// 用法：
//   // main.ts（默认开启全站无感知记录；表单输入值默认记，密码明文默认不记）
//   import { createTrackPlugin } from '@/plugins/track'
//   app.use(createTrackPlugin({ enabled: true }))
//
//   // 任意组件
//   import { useTrack } from '@/plugins/track'
//   const track = useTrack()
//   track.enable()            // 开启无感知记录
//   track.disable()           // 关闭并落盘
//   track.setOptions({ captureValues: true }) // 运行时改配置，不重启、不上报
import type { App, Plugin } from 'vue'
import { TrackRecorder, type TrackRecorderOptions } from './recorder'

export interface TrackPluginOptions extends TrackRecorderOptions {
  /** 是否在安装后立即开启记录，默认 false（默认不开启） */
  enabled?: boolean
}

// 模块级单例，供 useTrack() 在任意组件中获取同一实例
let recorder: TrackRecorder | null = null

export function createTrackPlugin(options: TrackPluginOptions = {}): Plugin {
  return {
    install(app: App) {
      const router = (app.config.globalProperties as any).$router
      recorder = new TrackRecorder(options, router)
      // 暴露到全局属性与 window，便于运行时调试 / 远程开关
      ;(app.config.globalProperties as any).$track = recorder
      ;(window as any).__track = recorder
      if (options.enabled) recorder.enable()
    },
  }
}

/** 获取录制器单例（插件未安装时抛错） */
export function useTrack(): TrackRecorder {
  if (!recorder) {
    throw new Error('[track] 插件尚未安装，请先在 main.ts 中 app.use(createTrackPlugin())')
  }
  return recorder
}

export { TrackRecorder }
export type { TrackRecorderOptions }
export * from './types'
export { replayTrackEvents } from './replay'
export type { ReplayHandle, ReplayOptions } from './replay'
