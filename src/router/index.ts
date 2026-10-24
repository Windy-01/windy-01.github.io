import { createRouter, createWebHistory } from 'vue-router'

import { defaultDocumentId } from '../api/documents'
import { isLoggedIn } from '../api/session'

/**
 * 页面组件一律用**动态 `import()`**：每个页面单独打成一个 chunk，
 * 只有真正访问该路由时才下载它的 JS 与 CSS。
 *
 * ⚠️ 不要改回 `import Home from '../views/home.vue'` 这种静态写法 —— 静态 import
 * 会把所有页面（连同它们依赖的 `marked` / `dompurify`、聊天组件、文档正文）
 * 全部塞进首屏 bundle，等于没拆。
 *
 * ⚠️ 也不用加 webpackChunkName 这类注释：Vite 按文件路径自动命名，那个是 webpack 的写法。
 */
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      name: 'home',
      path: '/',
      component: () => import('../views/home.vue'),
    },
    {
      name: 'community',
      path: '/community',
      component: () => import('../views/community.vue'),
    },
    // 文档正文由路由参数指定；`/document` 不带 id 时跳到默认文档。
    {
      name: 'document',
      path: '/document/:id',
      component: () => import('../views/document.vue'),
    },
    {
      path: '/document',
      redirect: { name: 'document', params: { id: defaultDocumentId } },
    },
    // 关于页的内容是仓库里的 README，静态资源，不经过后端。
    {
      name: 'about',
      path: '/about',
      component: () => import('../views/about.vue'),
    },
    {
      name: 'chat',
      path: '/chat',
      component: () => import('../views/chat.vue'),
    },
    // `/user` 是**作者展示页**（本地静态资料，不联网）；`/user/{account}` 才是某个用户的主页。
    // ⚠️ 用登录账号当路径参数：它不可改、唯一；username 可改，改完 URL 不该跟着变。
    {
      name: 'user',
      path: '/user',
      component: () => import('../views/user.vue'),
    },
    {
      name: 'user-profile',
      path: '/user/:account',
      component: () => import('../views/user.vue'),
    },
    // 认证相关：目前只有界面，接口见 `src/api/auth.ts`（占位，尚未接入后端）。
    {
      name: 'login',
      path: '/login',
      component: () => import('../views/login.vue'),
    },
    {
      name: 'register',
      path: '/register',
      component: () => import('../views/register.vue'),
    },
    {
      name: 'logout',
      path: '/logout',
      component: () => import('../views/logout.vue'),
    },
  ],
})

/**
 * 需要登录态的入口：只有 `/logout`（未登录时点下去什么也不会发生，直接引导去登录页）。
 *
 * ⚠️ **`/user` 与 `/user/{account}` 都不拦**：作者页本来就给未登录的人看，
 * 别人的主页也不需要登录（和 GitHub 一致）。
 * `/login` `/register` 同样不加限制：已经登录的人也可能想换个账号。
 */
router.beforeEach((to) => {
  if (to.name === 'logout' && !isLoggedIn()) {
    return { name: 'login' }
  }

  return true
})

export default router
