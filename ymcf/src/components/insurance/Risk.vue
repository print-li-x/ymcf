<script setup>
import { ref } from 'vue'
import { isDarkMode, toggleTheme } from '@/utils/theme.js'
</script>

<template>
  <div class="riskmap-container">
    <!-- 风险地图功能区域 -->
    <div class="map-section">
      <h2>风险地图</h2>
      <!-- 替换为真实地图组件 -->
      <div class="map-placeholder">地图区域（请接入Cesium地图）</div>
    </div>
  </div>
</template>

<style scoped>
.riskmap-container {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  min-height: 100vh;
  padding: 24px;
  box-sizing: border-box;
}

.theme-toggle {
  position: absolute;
  top: 20px;
  right: 20px;
  background-color: var(--card-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
}

.theme-toggle:hover {
  background-color: var(--hover-bg);
}

.map-section {
  margin-top: 60px;
  background: var(--card-bg);
  padding: 20px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 2px 6px var(--shadow-color);
}

.map-placeholder {
  height: 400px;
  background-color: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  border-radius: 6px;
  border: 1px dashed var(--border-color);
}
</style>
