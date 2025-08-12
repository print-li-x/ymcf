
<template>
  <div class="insurance-overview">
    <template v-if="!isLoggedIn">
      <div v-if="showLogin">
        <UserLogin @loginSuccess="handleLoginSuccess" @showRegister="showLogin = false" />
      </div>
      <div v-else>
        <UserRegister @registerSuccess="showLogin = true" @showLogin="showLogin = true" />
      </div>
    </template>

    <template v-else>
      <n-card class="full-row header-card" content-style="padding: 24px;">
        <n-h1 style="text-align: center; margin: 0;">
          <n-gradient-text type="info">
            🌊 台风参数化保险评估平台
          </n-gradient-text>
        </n-h1>
        <n-p style="text-align: center; color: #666;">
          当前登录用户：<n-tag type="info">{{ currentUser }}</n-tag>
          <n-a href="#" style="margin-left: 10px;" @click.prevent="handleLogout">退出登录</n-a>
        </n-p>
      </n-card>

      <section class="top-content-section section-card">
        <div class="map-and-input-wrapper">
          <div class="map-wrapper">
            <CesiumMap v-if="readyToRenderCesium" @coordinatesSelected="handleCoordinatesSelected" />
            <div v-else class="cesium-loading-placeholder">地图加载中...</div>
          </div>

          <div class="input-panel-container">
            <n-card title="参数输入" embedded :bordered="false" size="large">
              <ClaimInputPanel
                :lat="claimSimState.simulationParams.lat"
                :lon="claimSimState.simulationParams.lon"
                :typhoonLevel="claimSimState.simulationParams.typhoonLevel"
                :impactRegion="claimSimState.simulationParams.impactRegion"
                :predictTime="claimSimState.simulationParams.predictTime"
                :debugMode="claimSimState.isDebugMode.value"
                @update:debugMode="handleDebugModeUpdate"
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
            :currentStep="claimSimState.currentStep.value"
            :simulationComplete="claimSimState.simulationComplete.value"
            :resultMessage="claimSimState.resultMessage.value"
            :estimatedPremium="claimSimState.estimatedPremium.value"
            :hasPayout="claimSimState.hasPayout.value"
            :steps="claimSimState.steps"
          />
        </n-card>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'; 
import { NCard, NH1, NGradientText, NP, NTag, NA } from 'naive-ui';
import CesiumMap from '@/components/CesiumMap.vue';
import ClaimInputPanel from '@/components/insurance/ClaimInputPanel.vue';
import ClaimProcessTimeline from '@/components/insurance/ClaimProcessTimeline.vue';
import UserLogin from '@/components/UserLogin.vue';
import UserRegister from '@/components/UserRegister.vue';
import { useClaimSimulation } from '@/composables/useClaimSimulation.js';
import axios from 'axios';

// --- 用户状态管理 ---
const isLoggedIn = ref(false);
const currentUser = ref('');
const showLogin = ref(true);

const handleLoginSuccess = (username) => {
  isLoggedIn.value = true;
  currentUser.value = username;
};

const handleLogout = () => {
  isLoggedIn.value = false;
  currentUser.value = '';
};

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

const claimSimState = {
  currentStep: claimSimCurrentStep,
  simulationComplete: claimSimSimulationComplete,
  resultMessage: claimSimResultMessage,
  estimatedPremium: claimSimEstimatedPremium,
  hasPayout: claimSimHasPayout,
  isDebugMode: claimSimIsDebugMode,
  simulationParams: claimSimSimulationParams,
  steps: claimSimSteps
};

const claimSimActions = {
  startSimulation: claimSimStartSimulation,
  nextDebugStep: claimSimNextDebugStep,
  resetSimulationDisplayState: claimSimResetSimulationDisplayState,
  resetAllSimulationData: claimSimResetAllSimulationData,
  setSimulationParams: claimSimSetSimulationParams,
  setDebugMode: claimSimSetDebugMode
};

// ⚡️ 新增：存储用户选择的坐标
const selectedCoordinates = ref({ lat: 25.0, lon: 125.0 });

// ⚡️ 核心改动：监听全局事件来获取坐标
const handleCoordinatesSelected = (event) => {
  const { lat, lon } = event.detail;
  selectedCoordinates.value = { lat, lon };
  claimSimActions.setSimulationParams({
    ...claimSimState.simulationParams.value,
    lat,
    lon,
  });
};

onMounted(() => {
  // ⚡️ 注册全局事件监听器
  window.addEventListener('map-city-picked', handleCoordinatesSelected);
});

onBeforeUnmount(() => {
  // ⚡️ 组件销毁前移除监听器，防止内存泄漏
  window.removeEventListener('map-city-picked', handleCoordinatesSelected);
});


const createInsuranceAndGetResult = async (params) => {
  try {
    claimSimState.currentStep.value = 0;
    claimSimState.resultMessage.value = "正在创建保险产品...";

    // 1. 发起 POST 请求创建保险
    const createResponse = await axios.post('http://localhost:8000/insurances/create', {
      username: currentUser.value,
      longitude: params.lon,
      latitude: params.lat,
      cover: params.cover,
      insured_amount: params.insured_amount
    });

    console.log('POST 请求成功，后端返回数据:', createResponse.data);
    const newInsuranceId = createResponse.data.id;
    
    claimSimState.currentStep.value = 1;
    claimSimState.resultMessage.value = `保险产品 #${newInsuranceId} 创建成功！`;
    
    // 增加一个短暂的延迟，给后端处理数据的时间
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    claimSimState.resultMessage.value = "正在计算理赔结果...";

    // 2. 发起 GET 请求获取所有保险信息
    // 注意：这里的接口路径是我们之前确认的正确路径 /insurances/info
    console.log('正在获取所有保险信息，接口路径: /insurances/info');
    const queryResponse = await axios.get('http://localhost:8000/insurances/info', {
        params: { username: currentUser.value }
    });

    // 3. 打印出后端返回的原始数据
    // 这一步是关键！请将这行输出完整地发给我。
    console.log('GET /insurances/info 返回的原始数据:', queryResponse.data);

    // 4. 根据返回的数据类型，找到新创建的保险记录
    let insuranceRecord = null;
    const responseData = queryResponse.data;

    // 后端返回的是一个对象，我们需要访问其中的 insurance_info 数组
    if (responseData && Array.isArray(responseData.insurance_info)) {
      insuranceRecord = responseData.insurance_info.find(record => record.id === newInsuranceId);
    }
    // 注意：如果后端返回的是单个对象（虽然日志显示不是），这段代码可以保留
    else if (responseData && responseData.id === newInsuranceId) {
      insuranceRecord = responseData;
    }

    if (!insuranceRecord) {
      throw new Error('无法在返回的数据中找到新创建的保险记录。');
    }
    
    // 5. 使用正确的 ID 发起最终的理赔计算请求
    console.log('成功找到保险记录，ID为:', insuranceRecord.id);
    const resultResponse = await axios.get('http://localhost:8000/insurances/result', {
        params: { id: insuranceRecord.id }
    });
    
    const resultData = resultResponse.data;

    claimSimState.estimatedPremium.value = resultData.base_premium;
    claimSimState.resultMessage.value = `最终理赔金额：¥${resultData.insurance_cost}`;
    claimSimState.hasPayout.value = resultData.insurance_cost > 0;
    
    claimSimState.currentStep.value = 2;
    await new Promise(resolve => setTimeout(resolve, 1000));
    claimSimState.currentStep.value = 3;
    claimSimState.simulationComplete.value = true;

  } catch (error) {
    console.error('API 调用失败:', error);
    if (error.response) {
      console.error('后端返回的错误数据:', error.response.data);
      console.error('状态码:', error.response.status);
    }
    claimSimState.resultMessage.value = '计算失败，请检查网络或后端服务';
  }
};


const handleStartSimulation = async (params) => {
  // ⚡️ 确保将最新的坐标信息传递给 API 调用函数
  const combinedParams = {
    ...params,
    lat: selectedCoordinates.value.lat,
    lon: selectedCoordinates.value.lon
  };
  claimSimActions.resetSimulationDisplayState();
  if (claimSimState.isDebugMode.value) {
    // ... 调试模式保持不变
  } else {
    await createInsuranceAndGetResult(combinedParams);
  }
};

const handleResetSimulation = () => {
  claimSimActions.resetAllSimulationData();
};

const handleDebugModeUpdate = (value) => {
  claimSimActions.setDebugMode(value);
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
  height: 574px; /* 地图的固定高度 */
  width: 50%; /* 地图占据一半宽度 */
  /*竖直居中*/
  align-items: center; 
  justify-content: center;
  border-radius: 8px;
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