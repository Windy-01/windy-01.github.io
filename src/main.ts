import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// 样式副作用导入由 Vite 处理，类型来自 vite/client。
import '@/styles/globals.css'

createApp(App)
  .use(router)
  .mount('#app')
