<template>
  <div class="insurance-overview">
    <n-card class="full-row header-card" content-style="padding: 24px;">
      <n-h1 style="text-align: center; margin: 0;">
        <n-gradient-text type="info">
          🌊 台风参数化保险评估平台
        </n-gradient-text>
      </n-h1>
      <n-p style="text-align: center; color: #666;">
        为保险公司提供直观、高效的台风保险风险评估与理赔模拟工具。
      </n-p>
    </n-card>

    
    <section class="map-and-result section-card">
      <div class="map-wrapper">
          <CesiumMap @coordinates-selected="handleCoordinatesSelected" />
      </div>
    

      <div class="result-wrapper">
          <InsurancePay :selectedCoordinates="currentSelectedCoordinates"/>
      </div>
    </section>

    <section class="full-row section-card">
      <n-card title="📊 区域保费估算" embedded :bordered="false" size="large">
      </n-card>
    </section>


    <section class="full-row section-card">
      <n-card title="🌀 模拟理赔流程 - 典型案例演示" embedded :bordered="false" size="large">
        <ClaimSimulator />
      </n-card>
    </section>

  </div>
</template>

<script setup>
import { ref } from 'vue';
import CesiumMap from '@/components/CesiumMap.vue'; 
import RiskMap from '@/components/insurance/Risk.vue';
import ClaimSimulator from '@/components/insurance/ClaimSimulator.vue';
import InsurancePay from '@/components/insurance/Insurance.vue';

// 用于存储从 CesiumMap 接收到的经纬度
// 这个 ref 变量会作为 prop 传递给 Insurance 组件
const currentSelectedCoordinates = ref(null);

/**
 * 处理从 CesiumMap 组件发射过来的坐标事件。
 * 当用户在地图上点击时，CesiumMap 会发射 'coordinates-selected' 事件，
 * 这个函数就会被调用，并更新 currentSelectedCoordinates 的值。
 *
 * @param {Object} coords - 包含 lat (纬度) 和 lon (经度) 的对象。
 */
const handleCoordinatesSelected = (coords) => {
  currentSelectedCoordinates.value = coords;
  console.log('App.vue 收到 CesiumMap 的坐标:', coords);
};



</script>

<style scoped>
.insurance-overview {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 20px 5%;
  min-height: 100vh;
  box-sizing: border-box;
  /* 背景色由 App.vue 的 body 样式和 theme.js 控制 */
  position: relative;
}

.header-card, .section-card {
  /* ⚡️ 使用 theme.js 中定义的 --shadow-color 变量 ⚡️ */
  box-shadow: 0 4px 12px var(--shadow-color);
  border-radius: 12px;
  overflow: hidden;
  /* Naive UI 的 n-card 默认会适配主题背景色，这里通常不需要额外设置 */
}

.full-row {
  width: 100%;
}

.map-and-result {
  display: flex;
  gap: 24px;
  height: 100%;
  flex-grow: 1;
  padding: 20px;
}

.map-wrapper, .result-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 400px;
  
}

/* 确保 n-card 内部内容可以填充其父容器的剩余空间 */
.map-wrapper > :deep(.n-card__content),
.result-wrapper > :deep(.n-card__content) {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  
}

.map-wrapper > :deep(.n-card__content > div),
.result-wrapper > :deep(.n-card__content > div) {
  flex-grow: 1;
  min-height: 0;
}
</style>