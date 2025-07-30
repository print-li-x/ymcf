import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import cesium from 'vite-plugin-cesium'
import { fileURLToPath, URL } from 'node:url'
import Components from 'unplugin-vue-components/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import UnoCSS from 'unocss/vite'; // 引入 UnoCSS
import {  presetAttributify } from 'unocss'; 



export default defineConfig({
  plugins: [
    vue(),      
    cesium(), 
    Components({
      resolvers: [NaiveUiResolver()]  }),
    UnoCSS({ // 配置 UnoCSS
      presets: [
        presetAttributify(), // 启用属性化模式
      ],
      // 可以在这里添加自定义规则、shortcuts 等，但为了“现成”，暂时不需要
    }),
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
