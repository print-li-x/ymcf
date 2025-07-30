<template>
  <div class="claim-simulator">
    <h3>台风参数化保险理赔模拟器</h3>

    <div class="input-section">
      <h4>{{ currentStepDisplayTitle }}</h4>
      <div v-if="currentStep === 0">
        <p class="info-message debug-info">
          调试模式已启用。点击“模拟下一步”来推进流程。
        </p>
        <div class="input-group">
          <label>模拟经度:</label>
          <span>{{ debugInputParams.lon ? debugInputParams.lon.toFixed(2) : 'N/A' }}</span>
        </div>
        <div class="input-group">
          <label>模拟纬度:</label>
          <span>{{ debugInputParams.lat ? debugInputParams.lat.toFixed(2) : 'N/A' }}</span>
        </div>
        <div class="input-group">
          <label>模拟台风级别:</label>
          <span>{{ getTyphoonLevelLabel(debugInputParams.typhoonLevel) }}</span>
        </div>
        <div class="input-group">
          <label>模拟是否命中承保区域:</label>
          <span>{{ debugInputParams.impactRegion ? '是' : '否' }}</span>
        </div>
        <div class="input-group">
          <label>模拟预测提前时间:</label>
          <span>{{ getPredictTimeLabel(debugInputParams.predictTime) }}</span>
        </div>
      </div>
      <div v-else class="dynamic-step-content">
        <p>{{ steps[currentStep].displayContent }}</p>
      </div>

      <div class="debug-buttons">
        <button @click="nextDebugStep" class="debug-btn">模拟下一步</button>
        <button @click="resetSimulation" class="debug-btn reset-btn">重置模拟</button>
      </div>
    </div>

    <hr class="divider" />

    <h4>理赔流程：</h4>
    <ul class="timeline">
      <li v-for="(step, index) in steps" :key="index" :class="{ active: index <= currentStep }">
        <div class="circle">{{ index + 1 }}</div>
        <div class="content">
          <strong>{{ step.title }}</strong>
          <p>{{ step.desc }}</p>
        </div>
      </li>
    </ul>

    <div v-if="simulationComplete" class="simulation-result">
      <h4>模拟理赔结果:</h4>
      <p class="result-text">{{ resultMessage }}</p>
      <p class="premium-text">预估保费: <strong>{{ estimatedPremium }}</strong></p>
      <p v-if="hasPayout" class="purpose-text">
        <br>
        <i class="fas fa-lightbulb"></i> <strong class="highlight-purpose">提前支付理赔金旨在帮助您迅速应对潜在损失，将灾害影响降至最低！</strong>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue';

// --- 模拟流程步骤定义 ---
const steps = [
  {
    title: '获取风险数据',
    desc: '系统内部模拟获取台风预测数据。',
    displayContent: '正在模拟获取台风预测参数...'
  },
  {
    title: '参数化条件匹配',
    desc: '系统根据预设规则，判断是否触发提前赔付条件。',
    displayContent: '系统正在匹配当前模拟台风参数，判断是否符合理赔条件。'
  },
  {
    title: '自动赔付核算',
    desc: '若符合条件，系统自动核算赔付金额并计算预估保费。',
    displayContent: '系统正在核算具体赔付金额和本次台风险种的预估保费。'
  },
  {
    title: '完成理赔模拟',
    desc: '理赔模拟流程结束，结果已生成。',
    displayContent: '理赔模拟已完成，请查看下方详细结果。'
  }
];

// --- 组件内部响应式状态 ---
const currentStep = ref(0); // 当前模拟进行到哪一步
const simulationComplete = ref(false); // 模拟是否完成
const resultMessage = ref(''); // 最终结果消息
const estimatedPremium = ref('待定'); // 预估保费
const hasPayout = ref(false); // 是否有赔付

// 用于调试模式下的模拟输入参数 (不再依赖 props，完全内部控制)
const debugInputParams = ref({
  lat: null,
  lon: null,
  typhoonLevel: 'none',
  impactRegion: false,
  predictTime: 'none'
});

// --- 计算属性 ---
// 根据当前步骤动态显示上方区域的标题
const currentStepDisplayTitle = computed(() => {
  if (currentStep.value === 0) {
    return '当前模拟参数 (调试用):';
  }
  return steps[currentStep.value].title + ' 状态:';
});

// --- 调试数据场景 (硬编码在组件内部) ---
const debugDataScenarios = [
  { lat: 28.5, lon: 121.5, typhoonLevel: 'level7-8', impactRegion: true, predictTime: 'twoWeeks' }, // 正常赔付
  { lat: 29.0, lon: 121.0, typhoonLevel: 'level9-10', impactRegion: true, predictTime: 'oneWeek' }, // 严重赔付
  { lat: 35.0, lon: 130.0, typhoonLevel: 'level7-8', impactRegion: false, predictTime: 'twoWeeks' }, // 未命中不赔付
  { lat: 28.2, lon: 121.8, typhoonLevel: 'level5-6', impactRegion: true, predictTime: 'oneWeek' }  // 命中但未达赔付条件
];
const debugDataIndex = ref(-1); // 从 -1 开始，第一次点击时变成 0

// --- 调试按钮相关函数 ---
// “模拟下一步”按钮点击事件
const nextDebugStep = () => {
  // 每次点击“下一步”时，重置模拟器到初始状态，但不清空 debugInputParams
  // 这样才能让 startSimulation 使用最新的调试数据
  resetSimulationStateOnly(); // 调用一个新的函数，只重置状态而不清空参数

  debugDataIndex.value = (debugDataIndex.value + 1) % debugDataScenarios.length;
  const data = debugDataScenarios[debugDataIndex.value];
  
  // 更新内部的模拟输入参数
  Object.assign(debugInputParams.value, data);
  
  startSimulation(); // 启动模拟流程
};

// 重置模拟状态，但不清空 debugInputParams，用于每次“下一步”点击
const resetSimulationStateOnly = () => {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
  currentStep.value = 0;
  simulationComplete.value = false;
  resultMessage.value = '';
  estimatedPremium.value = '待定';
  hasPayout.value = false;
};


// 完全重置模拟状态和调试参数 (用于“重置模拟”按钮)
const resetSimulation = () => {
  resetSimulationStateOnly(); // 先重置状态
  // 再清空调试参数和索引
  debugInputParams.value = {
      lat: null,
      lon: null,
      typhoonLevel: 'none',
      impactRegion: false,
      predictTime: 'none'
  };
  debugDataIndex.value = -1;
};

// --- 工具函数 ---
function getTyphoonLevelLabel(value) {
  switch (value) {
    case 'level5-6': return '5-6 级 (轻微)';
    case 'level7-8': return '7-8 级 (中等)';
    case 'level9-10': return '9-10 级 (严重)';
    default: return '未提供';
  }
}

function getPredictTimeLabel(value) {
  switch (value) {
    case 'oneWeek': return '提前一周';
    case 'twoWeeks': return '提前两周';
    case 'threeWeeks': return '提前三周';
    default: return '未提供';
  }
}

// --- 理赔规则定义 (用于 determinePayoutAndPremium 函数) ---
const claimRules = [
  { level: 'level7-8', impact: true, time: 'twoWeeks', payout: '30%', message: '预测台风为中等强度（7-8级），提前两周预测且命中承保区域，触发 30% 赔付。' },
  { level: 'level9-10', impact: true, time: 'oneWeek', payout: '50%', message: '预测台风为严重强度（9-10级），提前一周预测且命中承保区域，触发 50% 赔付。' },
  { level: 'level9-10', impact: true, time: 'twoWeeks', payout: '40%', message: '预测台风为严重强度（9-10级），提前两周预测且命中承保区域，触发 40% 赔付。' },
  { level: 'level5-6', impact: true, time: 'twoWeeks', payout: '10%', message: '预测台风为轻微强度（5-6级），提前两周预测且命中承保区域，触发 10% 赔付。' },
  { level: 'level5-6', impact: true, time: 'oneWeek', payout: '0%', message: '预测台风为轻微强度（5-6级），提前一周预测且命中承保区域，不触发赔付。' }
];

// 模拟保费计算函数 (使用内部调试参数)
function calculatePremium() {
    const { typhoonLevel, lat, lon } = debugInputParams.value; // 使用内部调试参数

    let basePremium = 1000;

    if (lat === null || lon === null || typhoonLevel === 'none') {
        return 'N/A'; // 数据不完整无法计算
    }

    if (typhoonLevel === 'level5-6') {
        basePremium *= 1.0;
    } else if (typhoonLevel === 'level7-8') {
        basePremium *= 1.5;
    } else if (typhoonLevel === 'level9-10') {
        basePremium *= 2.0;
    }

    const insuredMinLat = 27.0;
    const insuredMaxLat = 30.0;
    const insuredMinLon = 120.0;
    const insuredMaxLon = 123.0; 

    // 假设在承保区域内才计算风险因子
    if (lat >= insuredMinLat && lat <= insuredMaxLat && lon >= insuredMinLon && lon <= insuredMaxLon) {
        const riskFactor = 1 + (Math.abs(lat - 28.5) + Math.abs(lon - 121.5)) / 10;
        basePremium *= riskFactor;
    } else {
        return '不承保或无保费'; // 在承保区域外
    }

    return `¥ ${basePremium.toFixed(2)}`;
}

// --- 模拟流程控制 ---
let simulationInterval = null; // 用于存储定时器ID

function startSimulation() {
  // 如果调试参数不完整，不启动模拟
  if (debugInputParams.value.lat === null || debugInputParams.value.lon === null || debugInputParams.value.typhoonLevel === 'none') {
      resultMessage.value = '请点击“模拟下一步”以加载调试参数。';
      simulationComplete.value = true;
      estimatedPremium.value = 'N/A';
      return;
  }

  // 逐步推进流程
  simulationInterval = setInterval(() => {
    if (currentStep.value < steps.length - 1) {
      currentStep.value++;
    } else {
      clearInterval(simulationInterval);
      determinePayoutAndPremium(); // 流程走完，进行赔付判断
      simulationInterval = null;
    }
  }, 500); // 每 500ms 推进一步
}

// 判断赔付结果并计算保费
function determinePayoutAndPremium() {
  const { typhoonLevel, impactRegion, predictTime } = debugInputParams.value; // 使用内部调试参数
  let matchedRule = null;

  estimatedPremium.value = calculatePremium(); // 调用 calculatePremium 计算保费

  for (const rule of claimRules) {
    if (
      typhoonLevel === rule.level &&
      impactRegion === rule.impact &&
      predictTime === rule.time
    ) {
      matchedRule = rule;
      break;
    }
  }

  if (matchedRule && matchedRule.payout !== '0%') {
    resultMessage.value = `恭喜您！${matchedRule.message}`;
    hasPayout.value = true;
  } else {
    let baseMessage = '根据当前参数，';
    if (!impactRegion) {
      baseMessage += '台风未命中承保区域，因此不触发赔付。';
    } else {
      baseMessage += '本次台风预测未达到触发提前赔付的条件（例如：强度未达标，或预测时间不符），因此不触发提前赔付。';
    }
    resultMessage.value = baseMessage;
    hasPayout.value = false;
  }
  simulationComplete.value = true;
}

// --- 生命周期钩子：组件卸载时清理定时器 ---
onUnmounted(() => {
    if (simulationInterval) {
        clearInterval(simulationInterval);
    }
});
</script>

<style scoped>
/* 样式部分保持不变，确保骨架有基本外观 */
.claim-simulator {
  padding: 2rem;
  border-radius: 12px;
  background-color: var(--card-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  max-width: 750px;
  margin: 2rem auto;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

h3, h4 {
  color: var(--text-heading);
  text-align: center;
  margin-bottom: 1.5rem;
}

.input-section {
  background-color: var(--input-bg);
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  border: 1px solid var(--border-color-light);
  min-height: 180px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
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

.dynamic-step-content {
    text-align: center;
    font-size: 1.1em;
    color: var(--text-primary);
    padding: 1rem;
    line-height: 1.6;
}

.debug-buttons {
    display: flex;
    justify-content: center;
    gap: 15px;
    margin-top: 20px;
    padding-top: 15px;
    border-top: 1px dashed var(--border-color-light);
}

.debug-btn {
    padding: 10px 20px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 1em;
    transition: background-color 0.3s ease;
}

.debug-btn:hover {
    background-color: #0056b3;
}

.debug-btn.reset-btn {
    background-color: #6c757d;
}

.debug-btn.reset-btn:hover {
    background-color: #5a6268;
}

.divider {
  border: 0;
  height: 1px;
  background: var(--border-color);
  margin: 2.5rem 0;
}

.timeline {
  list-style: none;
  padding: 0;
  margin: 1.5rem 0;
  position: relative;
}

.timeline li {
  display: flex;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  position: relative;
  opacity: 0.4;
  transition: opacity 0.4s ease;
  padding-left: 30px;
}
.timeline li.active {
  opacity: 1;
}

.timeline .circle {
  width: 28px;
  height: 28px;
  background: #1890ff;
  border-radius: 50%;
  color: white;
  text-align: center;
  line-height: 28px;
  font-size: 15px;
  flex-shrink: 0;
  z-index: 1;
  position: absolute;
  left: 0;
  top: 0;
}

.timeline li:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 14px;
  top: 28px;
  bottom: -0.5rem;
  width: 2px;
  background-color: var(--border-color-light);
  z-index: 0;
}

.timeline li.active:not(:last-child)::before {
    background-color: #1890ff;
}

.timeline .content {
  flex: 1;
  background-color: var(--bg-color-light);
  padding: 0.8rem 1.2rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  margin-left: 15px;
}

.timeline .content strong {
  display: block;
  margin-bottom: 0.4rem;
  color: var(--text-heading);
}

.timeline .content p {
  font-size: 0.9em;
  color: var(--text-secondary);
  line-height: 1.5;
}

.simulation-result {
  margin-top: 2rem;
  padding: 1.5rem 2rem;
  border-radius: 8px;
  background-color: var(--highlight-bg);
  border: 1px solid var(--highlight-border);
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.simulation-result h4 {
    margin-bottom: 1rem;
    color: var(--text-heading);
}

.simulation-result .result-text {
  font-size: 1.15em;
  font-weight: bold;
  color: var(--result-text-color);
  line-height: 1.6;
  margin-bottom: 1rem;
}

.simulation-result .premium-text {
    font-size: 1.05em;
    color: var(--text-secondary);
    margin-top: 0.8rem;
}

.simulation-result .premium-text strong {
    color: #e6a23c;
    font-size: 1.1em;
}

.simulation-result .purpose-text {
    font-size: 0.95em;
    color: var(--text-secondary);
    background-color: rgba(24, 144, 255, 0.1);
    padding: 0.8rem;
    border-radius: 6px;
    margin-top: 1.5rem;
    border-left: 4px solid #1890ff;
    text-align: left;
}
.simulation-result .purpose-text .highlight-purpose {
    color: #1890ff;
    font-weight: bold;
}

.fa-lightbulb {
    margin-right: 8px;
    color: #f7b500;
}

/* 主题变量更新 */
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
  }
}
</style>