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

  // 动态代理配置: 从 baseURL 环境变量自动提取前缀和目标（vant/ydl-is 用 VITE_API_BASE_URL，
  // ydl-wx 鉴权用 VITE_SITE_WX_API_BASE_URL）。任一为绝对地址时，dev 下覆盖为相对前缀走代理，解决跨域。
  // 两者在真实后端（zyn）同 host（40.33.32.20:8090），仅 /is ↔ /wx 前缀不同，
  // 故各自自动生成 /is、/wx 两条代理，无需手动再配置。
  const envBaseUrls: Record<string, string> = {
    'VITE_API_BASE_URL': env.VITE_API_BASE_URL || '',
    // ydl 站点（旧站 is 根路径：业务/登录/权限/验证码），独立 baseURL，dev 下覆盖为 /site-api 走 mock
    'VITE_SITE_API_BASE_URL': env.VITE_SITE_API_BASE_URL || '',
    // ydl 站点微信鉴权（/cp/...）走独立 wx 根路径（同 host，前缀 /wx）
    'VITE_SITE_WX_API_BASE_URL': env.VITE_SITE_WX_API_BASE_URL || '',
  }
  const proxy: Record<string, any> = {}

  // 用于 define 覆盖的环境变量
  const defineEnv: Record<string, string> = {
    'process.env': '{}',
  }

  Object.entries(envBaseUrls).forEach(([envKey, baseURL]) => {
    const pc = parseProxyFromBaseURL(baseURL)
    if (!pc) return
    proxy[pc.prefix] = {
      target: pc.target,
      changeOrigin: true,
      // 后端（JeecgBoot）CORS 过滤器会拒绝带「未白名单 Origin」的请求。
      // 经 cpolar / 外部域名访问 dev server 时，浏览器会把 Origin 带上，
      // 代理原样转发给后端 → 403 "Invalid CORS request"。
      // dev 下前端与后端经同源代理通信，无需 CORS，故剥掉 Origin/Referer，
      // 让后端按同源处理。后端直连联调仍可在后端白名单配置域名。
      configure: (p: any) => {
        p.on('proxyReq', (proxyReq: any) => {
          proxyReq.removeHeader('origin')
          proxyReq.removeHeader('referer')
        })
      },
    }
    console.log(`[vite] proxy: ${pc.prefix} → ${pc.target}`)

    // 开发模式下：baseURL 是绝对地址（含 // 协议相对地址）时，覆盖为相对路径，
    // 让 Axios 请求走 Vite 代理（同源），解决跨域。
    if (isDev && baseURL.match(/^(https?:)?\/\//)) {
      defineEnv[`import.meta.env.${envKey}`] = JSON.stringify(pc.prefix)
      console.log(
        `[vite] dev: override ${envKey} → "${pc.prefix}" (relative, uses proxy)`,
      )
    }
  })

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
      // 允许通过内网穿透（cpolar 等）域名访问 dev server；
      // true = 放行所有 host（仅开发期使用，生产勿开）
      allowedHosts: true,

      ...(isMock ? {} : { proxy }),
    },
  }
})
