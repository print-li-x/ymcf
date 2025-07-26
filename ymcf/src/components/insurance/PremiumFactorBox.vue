
<template>
  <div class="premium-factor-box">
    <h3>保费因素参数设置</h3>
    <div class="factor-list">
      <div
        v-for="(value, key) in localFactors"
        :key="key"
        class="factor-item"
      >
        <label :for="key">{{ factorLabels[key] || key }}</label>
        <input
          v-if="editable"
          type="number"
          step="0.01"
          :id="key"
          v-model.number="localFactors[key]"
        />
        <span v-else>{{ value }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, toRefs } from 'vue'
import { isDarkMode, toggleTheme } from '@/utils/theme.js'

const props = defineProps({
  defaultFactors: Object,
  editable: Boolean
})

const emit = defineEmits(['update'])

const { defaultFactors } = toRefs(props)
const localFactors = ref({ ...defaultFactors.value })

const factorLabels = {
  basePremium: '基础保费',
  riskLevelFactor: '风险等级系数',
  typhoonLevelFactor: '台风等级系数',
  purchaseLeadTimeFactor: '提前购买系数',
  geographicFactor: '地理风险系数'
}

watch(localFactors, (newVal) => {
  emit('update', newVal)
}, { deep: true })
</script>

<style scoped>
.premium-factor-box {
  padding: 16px;
  border-radius: 8px;
  background-color: var(--card-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.factor-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 10px;
}

.factor-item label {
  display: block;
  font-weight: bold;
  margin-bottom: 4px;
}

.factor-item input {
  width: 80%;
  padding: 4px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}
</style>
