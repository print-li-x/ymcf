<template>
  <TopNavBar />
  <router-view />
</template>

<script setup>
import TopNavBar from '@/components/TopNavBar.vue'
import { initTheme } from '@/utils/theme.js'
import { onMounted } from 'vue'

onMounted(initTheme)
</script>

<style>
:root {
  --bg-primary: #ffffff;       
  --text-primary: #1d1d1f;     
  --nav-bg: #f5f5f7;           
  --hover-bg: rgba(0, 0, 0, 0.05);      
  --active-bg: rgba(0, 0, 0, 0.08);     
  --border-color: rgba(0, 0, 0, 0.1);   
}

html, body, #app {
  height: 100%;
  margin: 0;
  overflow: hidden;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  transition: background-color .5s ease, color .5s ease;
}
</style>