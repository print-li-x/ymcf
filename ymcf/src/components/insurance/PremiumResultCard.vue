
<template>
  <div class="premium-result-card">
    <h3>保费测算结果</h3>
    <div v-if="premium !== null" class="result-content">
      <p><strong>选择位置：</strong>{{ locationName }}</p>
      <p><strong>预估保费：</strong>{{ premium }} 元</p>
      <p><strong>影响因素：</strong>{{ factors.join('、') }}</p>
    </div>
    <div v-else class="empty">请选择地图上的区域以生成保费</div>
  </div>
</template>

<script setup>
import { isDarkMode, toggleTheme } from '@/utils/theme.js'
defineProps({
  locationName: {
    type: String,
    default: '未选择'
  },
  premium: {
    type: Number,
    default: null
  },
  factors: {
    type: Array,
    default: () => []
  }
})
</script>

<style scoped>
.premium-result-card {
  padding: 1.5rem;
  border-radius: 12px;
  background-color: var(--card-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  margin-top: 1rem;
}

.result-content p {
  margin: 0.5rem 0;
}

.empty {
  color: var(--text-primary);
  font-style: italic;
}
</style>
