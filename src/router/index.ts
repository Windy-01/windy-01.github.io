import { createRouter, createWebHistory } from 'vue-router'

import { defaultDocumentId } from '../api/documents'
import About from '../views/about.vue'
import Chat from '../views/chat.vue'
import Community from '../views/community.vue'
import Document from '../views/document.vue'
import Home from '../views/home.vue'
import Login from '../views/login.vue'
import Logout from '../views/logout.vue'
import Register from '../views/register.vue'
import User from '../views/user.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      name: 'home',
      path: '/',
      component: Home,
    },
    {
      name: 'community',
      path: '/community',
      component: Community,
    },
    // 文档正文由路由参数指定；`/document` 不带 id 时跳到默认文档。
    {
      name: 'document',
      path: '/document/:id',
      component: Document,
    },
    {
      path: '/document',
      redirect: { name: 'document', params: { id: defaultDocumentId } },
    },
    // 关于页的内容是仓库里的 README，静态资源，不经过后端。
    {
      name: 'about',
      path: '/about',
      component: About,
    },
    {
      name: 'chat',
      path: '/chat',
      component: Chat,
    },
    {
      name: 'user',
      path: '/user/:id',
      component: User,
    },
    // 认证相关：目前只有界面，接口见 `src/api/auth.ts`（占位，尚未接入后端）。
    {
      name: 'login',
      path: '/login',
      component: Login,
    },
    {
      name: 'register',
      path: '/register',
      component: Register,
    },
    {
      name: 'logout',
      path: '/logout',
      component: Logout,
    },
  ],
})

export default router
