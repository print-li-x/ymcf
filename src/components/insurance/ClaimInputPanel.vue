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
        {{ isManualInputMode ? '手动输入' : '地图点击' }}
      </n-button>
    </div>

    <h4>当前参数:</h4>
    <div class="input-group">
      <label>标的类型:</label>
      <n-select v-model:value="coverType" :options="coverOptions" placeholder="请选择标的类型" />
    </div>
    <div class="input-group">
      <label>保额:</label>
      <n-input-number v-model:value="insuredAmount" :min="0" :step="10000" />
    </div>

    <div v-if="isManualInputMode" class="manual-input-fields">
      <div class="input-group">
        <label>经度 (Lon):</label>
        <n-input-number v-model:value="manualInput.lon" :min="-180" :max="180" :step="0.01" />
      </div>
      <div class="input-group">
        <label>纬度 (Lat):</label>
        <n-input-number v-model:value="manualInput.lat" :min="-90" :max="90" :step="0.01" />
      </div>
      <div class="manual-action-buttons">
        <n-button type="primary" @click="startManualSimulation" :disabled="!isManualDataComplete">开始模拟</n-button>
        <n-button type="default" @click="resetInputs" style="margin-left: 10px;">重置</n-button>
      </div>
    </div>

    <div v-else class="display-fields">
      <p v-if="!isDataAvailableForDisplay" class="info-message">
        请在地图上点击选择一个位置
      </p>
      <div v-else>
        <div class="input-group">
          <label>经度:</label>
          <span>{{ props.lon !== null ? props.lon.toFixed(2) : 'N/A' }}</span>
        </div>
        <div class="input-group">
          <label>纬度:</label>
          <span>{{ props.lat !== null ? props.lat.toFixed(2) : 'N/A' }}</span>
        </div>
      </div>
      <div class="manual-action-buttons" style="margin-top: 1.5rem;">
        <n-button type="primary" @click="startMapSimulation" :disabled="!isDataAvailableForDisplay">开始模拟</n-button>
        <n-button type="default" @click="resetInputs" style="margin-left: 10px;">重置</n-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue';
import { NButton, NInputNumber, NSelect } from 'naive-ui';

const props = defineProps({
  lat: { type: Number, default: null },
  lon: { type: Number, default: null },
});

const emit = defineEmits([
  'startSimulation',
  'resetSimulation',
]);

// 修正后的选项，value 为字符串
const coverOptions = [
  { label: '渔排', value: '渔排' },
  { label: '农房', value: '农房' },
  { label: '光伏电站', value: '光伏电站' },
  { label: '普通企业厂房', value: '普通企业厂房' },
  { label: '民房(砖木结构）', value: '民房(砖木结构）' },
  { label: '多层住宅（≤7层）', value: '多层住宅（≤7层）' },
  { label: '高层住宅（≥8层）', value: '高层住宅（≥8层）' },
];

const isManualInputMode = ref(false);

const coverType = ref('普通企业厂房'); // 绑定到新的变量，默认值是一个字符串
const insuredAmount = ref(200000);

const manualInput = reactive({
  lon: null,
  lat: null,
});

const isManualDataComplete = computed(() => {
  return manualInput.lat !== null && manualInput.lon !== null;
});

const isDataAvailableForDisplay = computed(() => {
  return props.lat !== null && props.lon !== null;
});

const toggleManualInputMode = () => {
  isManualInputMode.value = !isManualInputMode.value;
  resetInputs();
};

const resetInputs = () => {
  manualInput.lon = null;
  manualInput.lat = null;
  coverType.value = '普通企业厂房'; // 重置为默认字符串
  insuredAmount.value = 200000;
  emit('resetSimulation');
};

const startManualSimulation = () => {
  const dataToSend = {
    username: 'test_user', // 接口文档中需要的字段，暂时用固定值
    longitude: manualInput.lon,
    latitude: manualInput.lat,
    cover: coverType.value, // 发送标的类型字符串
    insured_amount: insuredAmount.value,
  };
  console.log('手动输入模式 - 即将发送的数据:', dataToSend);
  if (isManualDataComplete.value) {
    emit('startSimulation', dataToSend);
  }
};

const startMapSimulation = () => {
  const dataToSend = {
    username: 'test_user', // 接口文档中需要的字段，暂时用固定值
    longitude: props.lon,
    latitude: props.lat,
    cover: coverType.value, // 发送标的类型字符串
    insured_amount: insuredAmount.value,
  };
  console.log('地图点击模式 - 即将发送的数据:', dataToSend);
  if (isDataAvailableForDisplay.value) {
    emit('startSimulation', dataToSend);
  }
};
</script>

<style scoped>
/* ... 样式保持不变 ... */
.claim-input-panel {
  padding: 1.5rem;
  border-radius: 8px;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color-light);
  min-height: 250px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
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
  flex: 0 0 120px;
  margin-right: 15px;
  font-weight: bold;
  color: var(--text-secondary);
  text-align: right;
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
.manual-input-fields .n-select {
  flex: 1;
}
.n-select {
    width: 100%;
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