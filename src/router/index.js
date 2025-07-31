import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import message from '@/views/daily_message.vue'
import insurance from '@/views/InsuranceOverview.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/disaster',
    name: 'Disaster',
    component: Home
  },
  {
    path: '/insurance', // ✅ 使用独立的保险组件
    name: 'insurance',
    component: insurance
  },
  {
    path: '/multimodal',
    name: 'message',
    component: message
  }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
