import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import VueRouter from 'vue-router/vite'
import vueJsx from '@vitejs/plugin-vue-jsx'
import Components from 'unplugin-vue-components/vite'
import {
  AntDesignVueResolver,
  ElementPlusResolver,
  VantResolver,
} from 'unplugin-vue-components/resolvers'
import vueDevTools from 'vite-plugin-vue-devtools'
import { visualizer } from 'rollup-plugin-visualizer'
import { mockPlugin } from './src/mock'

/**
 * 从 VITE_API_BASE_URL 解析代理配置
 * 例: http://127.0.0.1:3000/api → { prefix: '/api', target: 'http://127.0.0.1:3000' }
 */
function parseProxyFromBaseURL(baseURL: string): { prefix: string; target: string } | null {
  if (!baseURL) return null
  try {
    // 补全协议: //host/path → https://host/path
    const normalized = baseURL.startsWith('//') ? `https:${baseURL}` : baseURL
    const url = new URL(normalized)
    const prefix = url.pathname.replace(/\/+$/, '') || '/'
    const target = `${url.protocol}//${url.host}`
    return { prefix, target }
  } catch {
    return null
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode, command }) => {
  const isMock = mode === 'mock'
  const env = loadEnv(mode, __dirname)
  const isDev = command === 'serve'

  // 动态代理配置: 从 VITE_API_BASE_URL 自动提取前缀和目标
  const proxyConfig = parseProxyFromBaseURL(env.VITE_API_BASE_URL || '')
  const proxy: Record<string, any> = {}

  // 用于 define 覆盖的环境变量
  const defineEnv: Record<string, string> = {
    'process.env': '{}',
  }

  if (proxyConfig) {
    proxy[proxyConfig.prefix] = {
      target: proxyConfig.target,
      changeOrigin: true,
    }
    console.log(`[vite] proxy: ${proxyConfig.prefix} → ${proxyConfig.target}`)

    // 开发模式下：VITE_API_BASE_URL 是绝对地址（含 // 协议相对地址）时，
    // 覆盖为相对路径，让 Axios 请求走 Vite 代理，解决跨域
    if (isDev && (env.VITE_API_BASE_URL || '').match(/^(https?:)?\/\//)) {
      defineEnv['import.meta.env.VITE_API_BASE_URL'] = JSON.stringify(proxyConfig.prefix)
      console.log(
        `[vite] dev: override VITE_API_BASE_URL → "${proxyConfig.prefix}" (relative, uses proxy)`,
      )
    }
  }

  return {
    plugins: [
      // 自由路由（约定式/文件路由）：vue-router 5 原生插件扫描 src/views/test
      // 自动生成路由表，导出为 vue-router/auto-routes（与手写路由并存）。
      VueRouter({
        routesFolder: 'src/views/test',
        dts: 'typed-router.d.ts',
      }),
      vue(),
      vueJsx(),
      Components({
        resolvers: [
          AntDesignVueResolver({ importStyle: false }),
          ElementPlusResolver(),
          VantResolver(),
        ],
      }),
      vueDevTools(),
      visualizer({
        open: false, // 打包后不自动打开浏览器（避免无头环境报错）
        filename: 'stats.html',
        gzipSize: true,
        brotliSize: true,
      }),
      ...(isMock ? [mockPlugin()] : []), // ★ 无后端时使用 Mock，有后端时启用 proxy
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    define: defineEnv,
    // 有后端时启用
    server: {
      host: '0.0.0.0', // 允许通过本机 IP 访问

      ...(isMock ? {} : { proxy }),
    },
  }
})
