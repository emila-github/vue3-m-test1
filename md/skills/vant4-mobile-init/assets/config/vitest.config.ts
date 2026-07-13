import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

// vite.config 以「回调函数」形式导出，需先解析为普通对象才能 merge
// （Vite 8 的 mergeConfig 不支持直接合并回调形式的配置）
const resolvedVite =
  typeof viteConfig === 'function'
    ? viteConfig({ command: 'serve', mode: 'test' })
    : viteConfig

// 单元测试中移除 Components 插件：它会在编译期为 <van-*> 标签自动注入
// `import { X } from 'vant'`，进而把庞大的 vant 运行库（含 .css 副作用导入）拉入测试。
// 移除后，van-* 组件在测试中由 shallowMount 的 global.stubs 接管，无需加载 vant。
const componentsPluginName = 'components'
resolvedVite.plugins = (resolvedVite.plugins || [])
  .flat()
  .filter((p: any) => !new RegExp(componentsPluginName, 'i').test(p?.name || ''))

export default mergeConfig(
  resolvedVite,
  defineConfig({
    test: {
      // VantUpload 在脚本中 import { showToast } from 'vant'，全局 mock 即可
      setupFiles: [fileURLToPath(new URL('./src/test/setup.ts', import.meta.url))],
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  }),
)
