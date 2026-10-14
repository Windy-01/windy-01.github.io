import { createRouter, createWebHistory } from 'vue-router'

import Chat from '../views/chat.vue'
import Community from '../views/community.vue'
import Document from '../views/document.vue'
import Home from '../views/home.vue'
import User from '../views/user.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: Home,
    },
    {
      path: '/community',
      component: Community,
    },
    {
      path: '/document',
      component: Document,
    },
    {
      path: '/chat',
      component: Chat,
    },
    {
      path: '/user/:id',
      component: User,
    },
  ],
})

export default router
