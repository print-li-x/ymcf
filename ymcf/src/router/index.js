import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import message from '@/views/daily_message.vue'

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
      path: '/insurance',
      name: 'Insurance',
      component: Home
    },
    {
      path: '/multimodal',
      name: 'message',
      component: message
    }
  ]
})
