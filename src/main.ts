import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// @ts-expect-error Vite resolves CSS side-effect imports at runtime.
import '@/styles/globals.css'

createApp(App)
  .use(router)
  .mount('#app')
