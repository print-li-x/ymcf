import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { initTheme } from '@/utils/theme.js'

initTheme() // ← 这行是重点

createApp(App).use(router).mount('#app')