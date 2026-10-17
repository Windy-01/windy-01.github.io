import { createRouter, createWebHistory } from 'vue-router'

import { defaultDocumentId } from '../api/documents'
import { isLoggedIn } from '../api/session'
import { currentUserId } from '../api/users'

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
    {
      name: 'user',
      path: '/user/:id',
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
 * 需要登录态的两个入口：
 *
 * - `/logout`：未登录时点下去什么也不会发生，直接引导去登录页。
 * - `/user/me`：「当前登录用户」的保留 id，未登录时没有可解析的对象。
 *
 * `/login` `/register` 不加限制：已经登录的人也可能想换个账号，不该被弹走。
 */
router.beforeEach((to) => {
  if (to.name === 'logout' && !isLoggedIn()) {
    return { name: 'login' }
  }

  if (to.name === 'user' && to.params.id === currentUserId && !isLoggedIn()) {
    return { name: 'login' }
  }

  return true
})

export default router
