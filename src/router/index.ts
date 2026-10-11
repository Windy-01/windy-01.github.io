import { createRouter, createWebHistory } from 'vue-router'

import Document from '../views/document.vue'
import Home from '../views/home.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: Home,
    },
    {
      path: '/document',
      component: Document,
    },
  ],
})

export default router
