<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { isDarkMode, toggleTheme } from '@/utils/theme.js'

const location = ref({ lng: 118.1, lat: 24.5 })
const selectedDate = ref(new Date().toISOString().slice(0, 10))
const prediction = ref({})
const premiumInfo = ref({})
const zoneCompensation = ref({})
const showPrepayTip = ref(false)

const fetchPrediction = async () => {
  try {
    const resPredict = await axios.post('/api/predict', {
      location: location.value,
      date: selectedDate.value
    })
    prediction.value = resPredict.data

    const resPremium = await axios.post('/api/premium', {
      location: location.value,
      prediction: prediction.value
    })
    premiumInfo.value = resPremium.data

    const resZone = await axios.get(`/api/zone-compensation?lng=${location.value.lng}&lat=${location.value.lat}`)
    zoneCompensation.value = resZone.data

    showPrepayTip.value = prediction.value.daysBefore <= 3 && prediction.value.level >= 10
  } catch (error) {
    console.error('Error fetching prediction data:', error)
  }
}

onMounted(() => {
  fetchPrediction()
})
</script>

<template>
  <div class="insurance-container">

    <div class="premium-box">
      <h2>赔付方案智能推荐</h2>
      <div class="info-block">
        <p><strong>预测等级：</strong> {{ prediction.level || '加载中...' }}</p>
        <p><strong>预计到达时间：</strong> {{ prediction.arrivalDate || '加载中...' }}</p>
        <p><strong>当前地点：</strong> 经度 {{ location.lng }}, 纬度 {{ location.lat }}</p>
      </div>

      <div class="info-block">
        <p><strong>基础保费：</strong> {{ premiumInfo.base || '计算中...' }} 元</p>
        <p><strong>差异化赔付系数：</strong> {{ zoneCompensation.multiplier || '获取中...' }} 倍</p>
        <p><strong>最终保费：</strong> {{ premiumInfo.final || '计算中...' }} 元</p>
      </div>

      <div v-if="showPrepayTip" class="tip-block">
        ⚠️ 已触发提前赔付机制：建议预先赔付保额的 30%，用于防灾准备
      </div>
    </div>
  </div>
</template>

<style scoped>
.insurance-container {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  min-height: 100vh;
  padding: 24px;
  box-sizing: border-box;
  overflow-y: auto;
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

.premium-box {
  background-color: var(--card-bg);
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px var(--shadow-color);
  max-width: 600px;
  margin: 80px auto 0 auto;
}

.info-block {
  margin-bottom: 16px;
}

.tip-block {
  margin-top: 16px;
  padding: 12px;
  background-color: var(--hover-bg);
  border-left: 4px solid orange;
  border-radius: 8px;
  font-weight: bold;
}
</style>
