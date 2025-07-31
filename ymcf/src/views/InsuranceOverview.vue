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

    <section class="top-content-section section-card">
      <div class="map-and-input-wrapper">
        <div class="map-wrapper">
          <CesiumMap v-if="readyToRenderCesium" @coordinatesSelected="handleCoordinatesSelected" />
          <div v-else class="cesium-loading-placeholder">地图加载中...</div>
        </div>

        <div class="input-panel-container">
          <n-card title="参数输入与模拟控制" embedded :bordered="false" size="large">
            <ClaimInputPanel
              :lat="claimSimState.simulationParams.lat"
              :lon="claimSimState.simulationParams.lon"
              :typhoonLevel="claimSimState.simulationParams.typhoonLevel"
              :impactRegion="claimSimState.simulationParams.impactRegion"
              :predictTime="claimSimState.simulationParams.predictTime"
              :debugMode="claimSimState.isDebugMode.value"             @update:debugMode="handleDebugModeUpdate"
              @startSimulation="handleStartSimulation"
              @resetSimulation="handleResetSimulation"
              @nextDebugStep="claimSimActions.nextDebugStep"
            />
          </n-card>
        </div>
      </div>
    </section>

    <section class="full-row section-card process-timeline-section">
      <n-card title="🌀 理赔流程进度" embedded :bordered="false" size="large">
        <ClaimProcessTimeline
          :currentStep="claimSimState.currentStep.value"       :simulationComplete="claimSimState.simulationComplete.value" :resultMessage="claimSimState.resultMessage.value"   :estimatedPremium="claimSimState.estimatedPremium.value" :hasPayout="claimSimState.hasPayout.value"           :steps="claimSimState.steps"
        />
      </n-card>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'; // 删除了不必要的 watch 导入
import { NCard, NH1, NGradientText, NP } from 'naive-ui';

import CesiumMap from '@/components/CesiumMap.vue';
import ClaimInputPanel from '@/components/insurance/ClaimInputPanel.vue';
import ClaimProcessTimeline from '@/components/insurance/ClaimProcessTimeline.vue';
import { useClaimSimulation } from '@/composables/useClaimSimulation.js';

// --- CesiumMap 渲染控制 ---
const readyToRenderCesium = ref(false);

onMounted(() => {
  readyToRenderCesium.value = true;
});

// --- 使用 ClaimSimulation Composable ---
const {
  currentStep: claimSimCurrentStep,
  simulationComplete: claimSimSimulationComplete,
  resultMessage: claimSimResultMessage,
  estimatedPremium: claimSimEstimatedPremium,
  hasPayout: claimSimHasPayout,
  isDebugMode: claimSimIsDebugMode,
  simulationParams: claimSimSimulationParams,
  steps: claimSimSteps,
  startSimulation: claimSimStartSimulation,
  nextDebugStep: claimSimNextDebugStep,
  resetSimulationDisplayState: claimSimResetSimulationDisplayState,
  resetAllSimulationData: claimSimResetAllSimulationData,
  setSimulationParams: claimSimSetSimulationParams,
  setDebugMode: claimSimSetDebugMode
} = useClaimSimulation();

// 将 composable 的状态和动作封装为对象，以便在模板中更简洁地访问
const claimSimState = {
  currentStep: claimSimCurrentStep,
  simulationComplete: claimSimSimulationComplete,
  resultMessage: claimSimResultMessage,
  estimatedPremium: claimSimEstimatedPremium,
  hasPayout: claimSimHasPayout,
  isDebugMode: claimSimIsDebugMode,
  simulationParams: claimSimSimulationParams, // reactive 对象本身不需要 .value
  steps: claimSimSteps // 数组本身不需要 .value
};

const claimSimActions = {
  startSimulation: claimSimStartSimulation,
  nextDebugStep: claimSimNextDebugStep,
  resetSimulationDisplayState: claimSimResetSimulationDisplayState,
  resetAllSimulationData: claimSimResetAllSimulationData,
  setSimulationParams: claimSimSetSimulationParams,
  setDebugMode: claimSimSetDebugMode
};

// --- API 模拟函数 (保持不变) ---
const fetchTyphoonDataFromBackend = async (lat, lon) => {
  await new Promise(resolve => setTimeout(resolve, 800));

  const insuredMinLat = 27.0;
  const insuredMaxLat = 30.0;
  const insuredMinLon = 120.0;
  const insuredMaxLon = 123.0;

  let impactRegion = false;
  if (lat >= insuredMinLat && lat <= insuredMaxLat && lon >= insuredMinLon && lon <= insuredMinLon) { // 修正了这里的 lon 范围
    impactRegion = true;
  }

  let typhoonLevel = 'none';
  let predictTime = 'none';

  if (impactRegion) {
    const distFactor = Math.abs(lat - 28.5) + Math.abs(lon - 121.5);
    if (distFactor < 0.5) {
      typhoonLevel = 'level9-10';
      predictTime = Math.random() < 0.5 ? 'oneWeek' : 'twoWeeks';
    } else if (distFactor < 1.5) {
      typhoonLevel = 'level7-8';
      predictTime = Math.random() < 0.5 ? 'twoWeeks' : 'threeWeeks';
    } else {
      typhoonLevel = 'level5-6';
      predictTime = 'twoWeeks';
    }
  } else {
    typhoonLevel = 'none';
    predictTime = 'none';
  }

  return { typhoonLevel, impactRegion, predictTime };
};

// --- 事件处理函数 ---

// CesiumMap 坐标选择事件
const handleCoordinatesSelected = async (coords) => {
  // 只有在非调试模式下才响应 Cesium Map 的点击
  if (!claimSimState.isDebugMode.value) { // 这里也需要 .value
    // 重置模拟状态并清除 composable 中的参数
    claimSimActions.resetAllSimulationData();

    console.log('InsuranceOverview 收到 CesiumMap 的坐标，正在请求后端数据:', coords);

    try {
      const backendData = await fetchTyphoonDataFromBackend(coords.lat, coords.lon);

      const paramsToSimulate = {
        lat: coords.lat,
        lon: coords.lon,
        typhoonLevel: backendData.typhoonLevel,
        impactRegion: backendData.impactRegion,
        predictTime: backendData.predictTime
      };

      claimSimActions.setSimulationParams(paramsToSimulate); // 更新 composable 的参数
      claimSimActions.startSimulation(); // 启动 composable 中的模拟

      console.log('InsuranceOverview 成功从后端获取数据:', backendData);

    } catch (error) {
      console.error('获取台风数据失败:', error);
      // 即使出错，也更新参数以显示 'N/A' 或默认状态
      claimSimActions.setSimulationParams({
        lat: coords.lat, // 保留经纬度
        lon: coords.lon,
        typhoonLevel: 'none',
        impactRegion: false,
        predictTime: 'none'
      });
      claimSimActions.startSimulation(); // 尝试使用不完整数据进行模拟（将显示错误）
    }
  } else {
    console.log("当前处于调试模式。外部数据不会自动触发理赔模拟器。请切换到正常模式或使用“模拟下一步”按钮。");
    // 在调试模式下，如果点击了地图，我们仍然希望清除任何现有的模拟数据。
    claimSimActions.resetAllSimulationData();
  }
};

// 处理来自 ClaimInputPanel 的 debugMode 更新，并同步到 composable
const handleDebugModeUpdate = (newDebugMode) => {
  claimSimActions.setDebugMode(newDebugMode); // 更新 composable 的调试模式
  // composable 将处理模式切换时的内部状态重置
};

// 处理来自 ClaimInputPanel 的开始模拟事件 (手动模式或调试模式的第一步)
const handleStartSimulation = (params) => {
  claimSimActions.setSimulationParams(params); // 从输入面板设置参数
  claimSimActions.startSimulation(); // 启动模拟
};

// 处理来自 ClaimInputPanel 的重置模拟事件
const handleResetSimulation = () => {
  claimSimActions.resetAllSimulationData(); // 重置所有模拟数据和显示
};
</script>

<style scoped>
/* 样式保持不变 */
/* 主容器样式 */
.insurance-overview {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 20px 5%;
  min-height: 100vh;
  box-sizing: border-box;
  position: relative;
}

/* 卡片基础样式 */
.header-card, .section-card {
  box-shadow: 0 4px 12px var(--shadow-color);
  border-radius: 12px;
  overflow: hidden;
}

.full-row {
  width: 100%;
}

/* 顶部区域：地图和输入面板并排 */
.top-content-section {
  flex-grow: 1;
  padding: 20px;
  display: flex;
}

.map-and-input-wrapper {
  display: flex;
  gap: 24px; /* 地图和输入面板之间的间距 */
  width: 100%;
}

.map-wrapper {
  display: flex;
  flex-direction: column;
  height: 450px; /* 地图的固定高度 */
  width: 50%; /* 地图占据一半宽度 */
  /*竖直居中*/
  align-items: center; 
  justify-content: center;
}

.input-panel-container {
  display: flex;
  flex-direction: column;
  width: 50%; /* 防止输入面板过窄 */
}

/* 确保 n-card 内容可以填充其父容器的可用空间 */
.map-wrapper > :deep(.n-card__content),
.input-panel-container > :deep(.n-card__content),
.section-card > :deep(.n-card__content) {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.map-wrapper > :deep(.n-card__content > div),
.input-panel-container > :deep(.n-card__content > div) {
  flex-grow: 1;
  min-height: 0;
}

.cesium-loading-placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  min-height: 400px;
  background-color: var(--bg-color-light);
  color: var(--text-secondary);
  font-size: 1.2em;
  border-radius: 8px;
}

/* 流程进度区域 (在地图和输入面板下方) */
.process-timeline-section {
  padding: 20px;
  margin-top: -16px; /* 调整边距使其更靠近上方部分 */
}

/* 主题变量 */
:root {
  --card-bg: #ffffff;
  --text-primary: #333333;
  --text-secondary: #666666;
  --text-heading: #1a1a1a;
  --border-color: #e0e0e0;
  --border-color-light: #f0f0f0;
  --input-bg: #f9f9f9;
  --bg-color-light: #f5f5f5;
  --disabled-bg: #e9ecef;
  --highlight-bg: #e6f7ff;
  --highlight-border: #91d5ff;
  --result-text-color: #1890ff;
  --shadow-color: rgba(0, 0, 0, 0.08);
}

@media (prefers-color-scheme: dark) {
  :root {
    --card-bg: #2d2d2d;
    --text-primary: #e0e0e0;
    --text-secondary: #b0b0b0;
    --text-heading: #ffffff;
    --border-color: #4a4a4a;
    --border-color-light: #3a3a3a;
    --input-bg: #3a3a3a;
    --bg-color-light: #333333;
    --disabled-bg: #4f4f4f;
    --highlight-bg: #1f3a5f;
    --highlight-border: #4d7cb3;
    --result-text-color: #69b1ff;
    --shadow-color: rgba(0, 0, 0, 0.3);
  }
}

/* 响应式调整，适用于小屏幕 */
@media (max-width: 1024px) {
  .map-and-input-wrapper {
    flex-direction: column; /* 地图和输入面板垂直堆叠 */
  }
  .map-wrapper, .input-panel-container {
    flex: none; /* 移除弹性增长 */
    width: 100%; /* 占据全部宽度 */
  }
  .map-wrapper {
    height: 350px; /* 小屏幕下调整地图高度 */
  }
  .input-panel-container {
    min-width: unset; /* 小屏幕下移除最小宽度限制 */
  }
}
</style>