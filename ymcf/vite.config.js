import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import cesium from 'vite-plugin-cesium'
import { fileURLToPath, URL } from 'node:url'

// 自动引入组件
import Components from 'unplugin-vue-components/vite'
// Naive UI 解析器
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'



export default defineConfig({
  plugins: [
    vue(),      
    cesium(), 
    Components({
      resolvers: [NaiveUiResolver()]  })
  ],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },

  server: {
    host: 'localhost',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
