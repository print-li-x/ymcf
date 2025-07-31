import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import naive from 'naive-ui'
import { initTheme } from '@/utils/theme'
import axios from 'axios'

// 🌐 设置默认后端地址（FastAPI）
axios.defaults.baseURL = 'http://localhost:8000'

// ⚙️ 初始化主题（用于设置 CSS 变量）
initTheme()

// 🚀 启动 Vue 应用
const app = createApp(App)
app.use(router)
app.use(createPinia())
app.use(naive)
app.mount('#app')
