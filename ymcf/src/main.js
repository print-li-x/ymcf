import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import naive from 'naive-ui'
import { initTheme } from '@/utils/theme'
import axios from 'axios'

axios.defaults.baseURL = 'http://localhost:8000';
initTheme()

const app = createApp(App)
app.use(router)
app.use(createPinia())
app.use(naive)
app.mount('#app')
