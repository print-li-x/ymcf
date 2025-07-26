import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import message from '@/views/daily_message.vue'
import insurance from '@/views/InsuranceOverview.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
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
      path: '/insurance',//参数化保险
      name: 'insurance',
      component: insurance
    },
    {
      path: '/multimodal',
      name: 'message',
      component: message
    }
  ]
})
