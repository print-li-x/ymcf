<script setup>
import { ref } from 'vue'
import { isDarkMode, toggleTheme } from '@/utils/theme.js'
import CesiumMap from '@/components/CesiumMap.vue'
</script>

<template>
  <div class="riskmap-container">
    <!-- 风险地图功能区域 -->
    <n-card  embedded :bordered="false" size="large">
    <p style="font-size: large;padding-top: 0px;font-weight: bolder;">🗺️ 风险地图 - 点击区域查看保费</p>
      <CesiumMap/>
    </n-card>
  </div>
</template>

<style scoped>
.riskmap-container {
  color: var(--text-primary);
  height: auto;
  padding: 10px;
  box-sizing: border-box;
}


</style>
