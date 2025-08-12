<script setup>
import { ref, watch, defineProps } from 'vue';
import axios from 'axios';
import { NCard, NEmpty, NSelect, NButton, NInputNumber } from 'naive-ui'; 
import { computed } from 'vue';

const props = defineProps({
  selectedCoordinates: {
    type: Object,
    default: null
  }
});

// 存储从后端获取的全部气象数据
const weatherInfo = ref(null); 
// 用户选择的标的类型
const selectedSubject = ref(null);
// 基础保额
const baseInsuranceAmount = ref(100000); 

// 标的类型选项
const subjectOptions = [
  { label: '渔排', value: '渔排', coefficient: 1.5, base_payout: 0.60 },
  { label: '农房', value: '农房', coefficient: 1.2, base_payout: 0.70 },
  { label: '光伏电站', value: '光伏电站', coefficient: 1.3, base_payout: 0.50 },
  { label: '普通企业厂房', value: '普通企业厂房', coefficient: 1.0, base_payout: 0.70 }, // 假设基础赔付率
  { label: '民房(砖木结构)', value: '民房(砖木结构)', coefficient: 1.2, base_payout: 0.60 },
  { label: '多层住宅（≤7层）', value: '多层住宅（≤7层）', coefficient: 1.0, base_payout: 0.80 },
  { label: '高层住宅（≥8层）', value: '高层住宅（≥8层）', coefficient: 0.9, base_payout: 0.85 },
];

// 假设后端返回的数据格式（为了前端计算方便，我们先模拟一个）
// 实际中需要后端接口返回这些值
const simulatedWeatherData = ref({
  wind_speed: 25.5, // 单位 m/s
  rainfall: 60,     // 单位 mm
  distance: 8,      // 单位 km
});

// ⚡️ 计算风速系数 ⚡️
const windCoefficient = computed(() => {
  const v = simulatedWeatherData.value?.wind_speed;
  if (v === null || v === undefined) return 1.0;
  if (v >= 32.7) return 3.0;
  if (v >= 24.5) return 2.0;
  if (v >= 17.2) return 1.5;
  if (v >= 10.8) return 1.2;
  return 1.0;
});

// ⚡️ 计算降水系数 ⚡️
const rainfallCoefficient = computed(() => {
  const r = simulatedWeatherData.value?.rainfall;
  if (r === null || r === undefined) return 1.0;
  if (r >= 251) return 1.5;
  if (r >= 101) return 1.3;
  if (r >= 50) return 1.1;
  return 1.0;
});

// ⚡️ 计算距离系数 ⚡️
const distanceCoefficient = computed(() => {
  const d = simulatedWeatherData.value?.distance;
  if (d === null || d === undefined) return 1.0;
  if (d < 1) return 2.0;
  if (d >= 1 && d <= 5) return 1.8;
  if (d > 5 && d <= 10) return 1.5;
  if (d > 10 && d <= 50) return 1.2;
  return 1.0;
});

// ⚡️ 计算风险调整系数 ⚡️
const riskAdjustmentCoefficient = computed(() => {
  const subjectCoeff = subjectOptions.find(opt => opt.value === selectedSubject.value)?.coefficient || 1.0;
  return windCoefficient.value * rainfallCoefficient.value * distanceCoefficient.value * subjectCoeff;
});

// ⚡️ 获取气象数据，这里我们先用模拟数据，待后端接口更新后再修改 ⚡️
const getWeatherData = async (lat, lon) => {
  weatherInfo.value = '正在获取数据...';
  try {
    // 假设后端返回的是一个更完整的数据对象
    const res = await axios.post('/positions', { 
      name: 'surf_10u', // 暂定为风速
      lat: lat,
      lon: lon,
      time_index: 0, 
    });
    
    if (res.data.success) {
      // ⚡️ ⚠️ 实际开发时，这里需要根据后端返回的真实数据结构来赋值 ⚠️ 
      // 假设后端现在能返回一个包含所有参数的对象
      weatherInfo.value = {
        wind_speed: res.data.data, // 假设 surf_10u 就是风速
        rainfall: 60, // 假设后端返回的降水值
        distance: 8,  // 假设后端返回的距离值
      };

      // 更新模拟数据以供计算
      simulatedWeatherData.value = weatherInfo.value;
    } else {
      weatherInfo.value = '未获取到有效数据';
    }
  } catch (err) {
    console.error('获取数据失败:', err);
    weatherInfo.value = '获取数据失败！';
  }
};

watch(() => props.selectedCoordinates, async (newCoords) => {
  if (newCoords && newCoords.lat !== null && newCoords.lon !== null) {
    getWeatherData(newCoords.lat, newCoords.lon);
  } else {
    weatherInfo.value = null;
  }
}, { immediate: true });
</script>

<template>
  <div class="insurance-info p-4 bg-blue-100 rounded-lg shadow-md">
    <h2 class="text-xl font-bold mb-2">保险相关参数</h2>

    <div class="config-section mb-4">
      <p>**选择标的物类型**</p>
      <n-select v-model:value="selectedSubject" :options="subjectOptions" placeholder="请选择标的物" />
      
      <p class="mt-4">**设定基础保额**</p>
      <n-input-number v-model:value="baseInsuranceAmount" :min="10000" :step="10000" placeholder="请输入保额" />
    </div>

    <section class="result-section mt-4">
      <div class="result-wrapper">
        <n-card title="📊 区域保费估算" embedded :bordered="false" size="large">
          <template v-if="simulatedWeatherData && selectedSubject">
            <div class="data-display">
              <p>
                **当前选定经度:** {{ props.selectedCoordinates.lon?.toFixed(4) }}
                <br>
                **当前选定纬度:** {{ props.selectedCoordinates.lat?.toFixed(4) }}
              </p>
              
              <n-divider />
              
              <h4>**计算参数**</h4>
              <p>
                风速 (V): <b>{{ simulatedWeatherData.wind_speed?.toFixed(2) }}</b> m/s
                <br>
                降水 (R): <b>{{ simulatedWeatherData.rainfall }}</b> mm
                <br>
                距台风中心距离 (D): <b>{{ simulatedWeatherData.distance }}</b> km
              </p>

              <n-divider />

              <h4>**风险调整系数**</h4>
              <p>
                风速系数: <b>{{ windCoefficient.toFixed(1) }}</b>
                <br>
                降水系数: <b>{{ rainfallCoefficient.toFixed(1) }}</b>
                <br>
                距离系数: <b>{{ distanceCoefficient.toFixed(1) }}</b>
                <br>
                标的系数: <b>{{ subjectOptions.find(opt => opt.value === selectedSubject)?.coefficient || 'N/A' }}</b>
              </p>

              <n-divider />
              
              <h3>**最终风险调整系数:**</h3>
              <p class="text-2xl font-bold text-info">
                {{ riskAdjustmentCoefficient.toFixed(2) }}
              </p>

              <p class="mt-4">
                **估算年化保费：** <br>
                <span class="text-xl font-bold">{{ (baseInsuranceAmount * riskAdjustmentCoefficient / 100).toFixed(2) }}</span> 元
                <br>
                <span class="text-gray-500 text-sm">（* 假设基础保费为保额的 1%）</span>
              </p>
            </div>
          </template>
          
          <template v-else-if="weatherInfo === '正在获取数据...' || !props.selectedCoordinates">
            <n-empty description="请在地图上点击区域，并选择标的物以进行计算" />
          </template>
          <template v-else-if="weatherInfo === '未获取到有效数据' || weatherInfo === '获取数据失败！'">
            <n-empty description="无法获取数据，请重试或更换区域。" />
          </template>
          <template v-else>
            <n-empty description="请选择标的物类型以计算风险系数" />
          </template>
        </n-card>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* 这里添加一些简单的样式 */
.config-section p {
  font-weight: bold;
  margin-bottom: 5px;
}
.data-display h4, .data-display h3 {
  margin-top: 15px;
  margin-bottom: 5px;
}
</style>