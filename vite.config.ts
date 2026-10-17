import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
  base: '/',
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        /**
         * 手动分包：把「很少变化」的第三方库拆成独立 chunk。
         *
         * - `vue`：Vue 运行时 + 路由，只有升级框架才变，缓存命中率最高；
         * - `markdown`：`marked` + `dompurify` 体积不小，但只有文档 / 关于 / 用户页
         *   需要渲染 Markdown —— 拆出去后首页、聊天、登录页都不会下载它；
         * - 其余第三方库统一进 `vendor`。
         *
         * 页面级的拆分由 `src/router/index.ts` 里的动态 `import()` 负责，
         * 这里只管第三方库。⚠️ 别把业务代码也塞进 manualChunks：
         * 那样「改一行业务代码就换掉整个 chunk 的 hash」，缓存反而更差。
         */
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return
          }

          // Rollup 给的 id 在 Windows 上也是正斜杠，这里仍规整一次，免得分隔符影响匹配。
          const path = id.replace(/\\/g, '/')

          if (path.includes('/marked/') || path.includes('/dompurify/')) {
            return 'markdown'
          }

          if (
            path.includes('/vue/')
            || path.includes('/@vue/')
            || path.includes('/vue-router/')
          ) {
            return 'vue'
          }

          return 'vendor'
        },
      },
    },
  },
})
