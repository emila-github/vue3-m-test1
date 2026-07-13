import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import VueRouter from 'vue-router/vite'
import vueJsx from '@vitejs/plugin-vue-jsx'
import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver, ElementPlusResolver, VantResolver } from 'unplugin-vue-components/resolvers'
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
  console.log('mode:', mode)
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
      console.log(`[vite] dev: override VITE_API_BASE_URL → "${proxyConfig.prefix}" (relative, uses proxy)`)
    }
  }

  console.log('isMock:', isMock, 'isDev:', isDev, 'proxy:', proxy)

  return {
    plugins: [
      VueRouter({
        // ⚠️ Vue 插件必须放在 VueRouter() 之后
        routesFolder: 'src/views/test', // 指定 src/views/test 目录为自动路由目录
        dts: 'typed-router.d.ts', // 生成类型提示文件（可选但推荐）
      }),
      vue(),
      vueJsx(),
      Components({
        resolvers: [AntDesignVueResolver({ importStyle: false }), ElementPlusResolver(), VantResolver()],
      }),
      vueDevTools(),
      visualizer({
        open: true, // 打包完成后自动在浏览器打开分析页面
        filename: 'stats.html', // 指定生成的分析文件名
        gzipSize: true, // 显示 gzip 压缩后的体积
        brotliSize: true, // 显示 brotli 压缩后的体积
      }),
      ...(isMock ? [mockPlugin()] : []), // ★ 无后端时使用 Mock，有后端时启用下方 proxy
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    define: defineEnv,
    // 有后端时启用
    server: {
      host: '0.0.0.0', // 允许通过本机 IP 访问（默认仅 localhost）
      ...(isMock ? {} : { proxy }),
    },
  }
})
