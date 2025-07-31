<template>
  <div class="claim-input-panel">
    <div class="mode-toggle-container">
      <label class="mode-label">数据来源:</label>
      <n-button
        @click="toggleManualInputMode"
        :type="isManualInputMode ? 'info' : 'default'"
        strong
        size="medium"
      >
        {{ isManualInputMode ? '手动输入模式' : '自动/调试模式' }}
      </n-button>
      <n-button
          v-if="!isManualInputMode"
          @click="toggleDebugMode"
          :type="debugMode ? 'info' : 'default'"
          strong
          size="medium"
          style="margin-left: 10px;"
      >
          {{ debugMode ? '调试模式 (模拟下一步)' : '自动模式 (点击地图)' }}
      </n-button>
    </div>

    <h4>{{ currentDisplayTitle }}</h4>
    <div v-if="isManualInputMode" class="manual-input-fields">
      <div class="input-group">
        <label>经度 (Lon):</label>
        <n-input-number v-model:value="manualInput.lon" :min="-180" :max="180" :step="0.01" />
      </div>
      <div class="input-group">
        <label>纬度 (Lat):</label>
        <n-input-number v-model:value="manualInput.lat" :min="-90" :max="90" :step="0.01" />
      </div>
      <div class="input-group">
        <label>预测台风级别:</label>
        <n-select v-model:value="manualInput.typhoonLevel" :options="typhoonLevelOptions" />
      </div>
      <div class="input-group">
        <label>预测是否命中承保区域:</label>
        <n-switch v-model:value="manualInput.impactRegion" />
      </div>
      <div class="input-group">
        <label>预测提前时间:</label>
        <n-select v-model:value="manualInput.predictTime" :options="predictTimeOptions" />
      </div>
      <div class="manual-action-buttons">
        <n-button type="primary" @click="startManualSimulation" :disabled="!isManualDataComplete">开始模拟</n-button>
        <n-button type="default" @click="resetInputs" style="margin-left: 10px;">重置</n-button>
      </div>
    </div>

    <div v-else>
      <p v-if="debugMode" class="info-message debug-info">
        调试模式已启用。点击“模拟下一步”来推进流程。
      </p>
      <p v-else-if="!isDataAvailableForDisplay" class="info-message">
        等待外部数据输入，例如从地图选择一个点位。
      </p>

      <div class="input-group">
        <label>经度:</label>
        <span>{{ displayParams.lon !== null ? displayParams.lon.toFixed(2) : 'N/A' }}</span>
      </div>
      <div class="input-group">
        <label>纬度:</label>
        <span>{{ displayParams.lat !== null ? displayParams.lat.toFixed(2) : 'N/A' }}</span>
      </div>
      <div class="input-group">
        <label>预测台风级别:</label>
        <span>{{ getTyphoonLevelLabel(displayParams.typhoonLevel) }}</span>
      </div>
      <div class="input-group">
        <label>预测是否命中承保区域:</label>
        <span>{{ displayParams.impactRegion ? '是' : '否' }}</span>
      </div>
      <div class="input-group">
        <label>预测提前时间:</label>
        <span>{{ getPredictTimeLabel(displayParams.predictTime) }}</span>
      </div>

      <div v-if="debugMode" class="debug-buttons">
        <n-button @click="emit('nextDebugStep')" type="info">模拟下一步</n-button>
        <n-button @click="resetInputs" type="default" style="margin-left: 10px;">重置模拟</n-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, reactive } from 'vue';
import { NButton, NInputNumber, NSelect, NSwitch } from 'naive-ui';

// 从父组件 (InsuranceOverview) 接收的 props
const props = defineProps({
  lat: { type: Number, default: null },
  lon: { type: Number, default: null },
  typhoonLevel: { type: String, default: 'none' },
  impactRegion: { type: Boolean, default: false },
  predictTime: { type: String, default: 'none' },
  debugMode: { type: Boolean, default: false } // 由 composable 通过父组件控制
});

// 向父组件发出的事件
const emit = defineEmits([
  'update:debugMode',      // 通知父组件调试模式的切换
  'startSimulation',       // 通知父组件使用参数开始模拟
  'resetSimulation',       // 通知父组件重置模拟状态
  'nextDebugStep'          // 通知父组件推进调试下一步
]);

// --- 内部状态 ---
const isManualInputMode = ref(false);

const manualInput = reactive({
  lat: null,
  lon: null,
  typhoonLevel: 'none',
  impactRegion: false,
  predictTime: 'none'
});

// --- 选项数据 ---
const typhoonLevelOptions = [
  { label: '5-6 级 (轻微)', value: 'level5-6' },
  { label: '7-8 级 (中等)', value: 'level7-8' },
  { label: '9-10 级 (严重)', value: 'level9-10' },
  { label: '无', value: 'none', disabled: true }
];

const predictTimeOptions = [
  { label: '提前一周', value: 'oneWeek' },
  { label: '提前两周', value: 'twoWeeks' },
  { label: '提前三周', value: 'threeWeeks' },
  { label: '无', value: 'none', disabled: true }
];

// --- 计算属性 ---

// 当前 UI 中显示的参数 (手动输入或外部传入)
const displayParams = computed(() => {
  return isManualInputMode.value ? manualInput : props;
});

// 检查手动输入是否完整
const isManualDataComplete = computed(() => {
  const data = manualInput;
  return data.lat !== null && data.lon !== null &&
         data.typhoonLevel !== 'none' &&
         data.predictTime !== 'none';
});

// 检查是否有数据可供显示 (只需经纬度即可)
const isDataAvailableForDisplay = computed(() => {
  const params = displayParams.value;
  return params.lat !== null && params.lon !== null;
});

// 显示区域的标题
const currentDisplayTitle = computed(() => {
  return isManualInputMode.value ? '手动输入模拟参数:' : '当前模拟参数:';
});

// --- 函数 ---

// 获取台风级别的标签
function getTyphoonLevelLabel(value) {
  const option = typhoonLevelOptions.find(opt => opt.value === value);
  return option ? option.label : 'N/A';
}

// 获取预测时间的标签
function getPredictTimeLabel(value) {
  const option = predictTimeOptions.find(opt => opt.value === value);
  return option ? option.label : 'N/A';
}

// 切换手动输入模式
const toggleManualInputMode = () => {
  isManualInputMode.value = !isManualInputMode.value;
  resetInputs(); // 切换模式时重置所有输入
  if (isManualInputMode.value) {
    emit('update:debugMode', false); // 确保在手动模式下调试模式是关闭的
  }
};

// 切换调试模式
const toggleDebugMode = () => {
  if (!isManualInputMode.value) { // 只允许在非手动模式下切换
    emit('update:debugMode', !props.debugMode);
    // 重置输入由父组件在接收到 update:debugMode 事件后处理
  }
};

// 重置所有输入 (手动输入状态) 并通知父组件重置模拟
const resetInputs = () => {
  manualInput.lat = null;
  manualInput.lon = null;
  manualInput.typhoonLevel = 'none';
  manualInput.impactRegion = false;
  manualInput.predictTime = 'none';
  emit('resetSimulation'); // 通知父组件重置模拟状态
};

// 开始手动模拟
const startManualSimulation = () => {
  if (isManualDataComplete.value) {
    // 将手动输入数据发送给父组件
    emit('startSimulation', { ...manualInput }); // 创建一个浅拷贝
  }
};

// 不需要监听 props.lat, props.lon 等，因为父组件 (InsuranceOverview) 会监听自己的数据变化，
// 然后调用 useClaimSimulation 的 setSimulationParams 和 startSimulation。
// 该组件仅负责显示接收到的 props 并发出用户操作。

</script>

<style scoped>
/* 保持现有样式，或根据您的 Naive UI 主题进行调整 */
.claim-input-panel {
  padding: 1.5rem;
  border-radius: 8px;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color-light);
  min-height: 250px; /* 根据需要调整最小高度 */
  display: flex;
  flex-direction: column;
  justify-content: flex-start; /* 更改为 flex-start 以实现顶部对齐 */
  position: relative;
}

h4 {
  color: var(--text-heading);
  text-align: center;
  margin-bottom: 1.5rem;
}

.input-group {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
}

.input-group label {
  flex: 0 0 180px;
  margin-right: 15px;
  font-weight: bold;
  color: var(--text-secondary);
}

.input-group span {
    flex: 1;
    padding: 0.6rem 1rem;
    color: var(--text-primary);
    background-color: var(--bg-color-light);
    border: 1px solid var(--border-color);
    border-radius: 5px;
}

.manual-input-fields .n-input-number,
.manual-input-fields .n-select,
.manual-input-fields .n-switch {
  flex: 1;
}

.manual-action-buttons {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  gap: 10px;
}

.info-message {
    text-align: center;
    color: #e6a23c;
    font-style: italic;
    margin-top: 1.5rem;
    padding: 0.8rem;
    background-color: rgba(230, 162, 60, 0.1);
    border-radius: 6px;
    border: 1px dashed #e6a23c;
}

.info-message.debug-info {
    color: #1890ff;
    background-color: rgba(24, 144, 255, 0.1);
    border-color: #1890ff;
}

.debug-buttons {
    display: flex;
    justify-content: center;
    gap: 15px;
    margin-top: 20px;
    padding-top: 15px;
    border-top: 1px dashed var(--border-color-light);
}

.mode-toggle-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px dashed var(--border-color-light);
}

.mode-toggle-container .mode-label {
  font-weight: bold;
  color: var(--text-heading);
  font-size: 1.05em;
}

.n-button {
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.3s ease;
}

/* 主题变量 */
:root {
  --text-primary: #333333;
  --text-secondary: #666666;
  --text-heading: #1a1a1a;
  --border-color: #e0e0e0;
  --border-color-light: #f0f0f0;
  --input-bg: #f9f9f9;
  --bg-color-light: #f5f5f5;
  --disabled-bg: #e9ecef;
}

@media (prefers-color-scheme: dark) {
  :root {
    --text-primary: #e0e0e0;
    --text-secondary: #b0b0b0;
    --text-heading: #ffffff;
    --border-color: #4a4a4a;
    --border-color-light: #3a3a3a;
    --input-bg: #3a3a3a;
    --bg-color-light: #333333;
    --disabled-bg: #4f4f4f;
  }
  .mode-toggle-container .n-button[type="default"] {
    background-color: var(--input-bg);
    border-color: var(--border-color);
    color: var(--text-primary);
  }
}
</style>