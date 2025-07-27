<script setup>
import { ref } from 'vue'
import { isDarkMode, toggleTheme } from '@/utils/theme.js'
import CesiumMap from '@/components/CesiumMap.vue'
</script>

<template>
  <div class="riskmap-container">
    <!-- 风险地图功能区域 -->
    <h2>风险地图</h2>
    <div class="map-section">
      <CesiumMap/>
    </div>
  </div>
</template>

<style scoped>
.riskmap-container {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  height: 100vh;
  padding: 24px;
  box-sizing: border-box;
}


</style>
