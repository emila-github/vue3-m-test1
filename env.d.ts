/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 全站无感知操作记录（track 插件）开关：'false'/'0'/'no' 关闭，未配置默认开启 */
  readonly VITE_TRACK_ENABLED?: string
}
