import { ref, onUnmounted, reactive } from 'vue';

export function useClaimSimulation() {
  // --- 模拟流程步骤定义 (作为内部常量) ---
  const steps = [
    {
      title: '获取风险数据',
      desc: '根据提供的位置信息，获取台风预测强度、影响范围与提前时间。',
      displayContent: '正在获取台风预测参数...'
    },
    {
      title: '参数化条件匹配',
      desc: '系统根据预设规则，判断是否触发提前赔付条件。',
      displayContent: '系统正在匹配当前台风强度、影响区域和预测时间，判断是否符合理赔条件。'
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

  // --- 模拟相关的响应式状态 ---
  const currentStep = ref(0);
  const simulationComplete = ref(false);
  const resultMessage = ref('');
  const estimatedPremium = ref('待定');
  const hasPayout = ref(false);
  const isDebugMode = ref(false); // 由此 composable 管理调试模式状态

  // 存储用于当前模拟的参数
  const simulationParams = reactive({
    lat: null,
    lon: null,
    typhoonLevel: 'none',
    impactRegion: false,
    predictTime: 'none'
  });

  // --- 理赔规则定义 ---
  const claimRules = [
    { level: 'level7-8', impact: true, time: 'twoWeeks', payout: '30%', message: '预测台风为中等强度（7-8级），提前两周预测且命中承保区域，触发 30% 赔付。' },
    { level: 'level9-10', impact: true, time: 'oneWeek', payout: '50%', message: '预测台风为严重强度（9-10级），提前一周预测且命中承保区域，触发 50% 赔付。' },
    { level: 'level9-10', impact: true, time: 'twoWeeks', payout: '40%', message: '预测台风为严重强度（9-10级），提前两周预测且命中承保区域，触发 40% 赔付。' },
    { level: 'level5-6', impact: true, time: 'twoWeeks', payout: '10%', message: '预测台风为轻微强度（5-6级），提前两周预测且命中承保区域，触发 10% 赔付。' },
    { level: 'level5-6', impact: true, time: 'oneWeek', payout: '0%', message: '预测台风为轻微强度（5-6级），提前一周预测且命中承保区域，不触发赔付。' }
  ];

  // 模拟保费计算函数
  const calculatePremium = (params) => {
    let basePremium = 1000;

    if (!params || params.lat === null || params.lon === null || params.typhoonLevel === 'none') {
        return 'N/A';
    }

    if (params.typhoonLevel === 'level5-6') {
        basePremium *= 1.0;
    } else if (params.typhoonLevel === 'level7-8') {
        basePremium *= 1.5;
    } else if (params.typhoonLevel === 'level9-10') {
        basePremium *= 2.0;
    }

    const insuredMinLat = 27.0;
    const insuredMaxLat = 30.0;
    const insuredMinLon = 120.0;
    const insuredMaxLon = 123.0;

    if (params.lat >= insuredMinLat && params.lat <= insuredMaxLat && params.lon >= insuredMinLon && params.lon <= insuredMaxLon) {
        const latDiff = Math.abs(params.lat - 28.5);
        const lonDiff = Math.abs(params.lon - 121.5);
        const riskFactor = 1 + (latDiff + lonDiff) / 10;
        basePremium *= riskFactor;
    } else {
        return '不在承保范围';
    }

    return `¥ ${basePremium.toFixed(2)}`;
  };

  // --- 模拟流程控制 ---
  let simulationInterval = null;

  const stopSimulation = () => {
    if (simulationInterval) {
      clearInterval(simulationInterval);
      simulationInterval = null;
    }
  };

  // 重置模拟显示状态，但不清空输入参数
  const resetSimulationDisplayState = () => {
    stopSimulation();
    currentStep.value = 0;
    simulationComplete.value = false;
    resultMessage.value = '';
    estimatedPremium.value = '待定';
    hasPayout.value = false;
  };

  // 重置所有模拟相关的数据，包括输入参数
  const resetAllSimulationData = () => {
      resetSimulationDisplayState();
      // 清空当前的模拟参数，等待新的输入
      simulationParams.lat = null;
      simulationParams.lon = null;
      simulationParams.typhoonLevel = 'none';
      simulationParams.impactRegion = false;
      simulationParams.predictTime = 'none';
  };

  const determinePayoutAndPremium = () => {
    const dataForCalculation = simulationParams;

    const isDataComplete = dataForCalculation.lat !== null && dataForCalculation.lon !== null &&
                           dataForCalculation.typhoonLevel !== 'none' && dataForCalculation.predictTime !== 'none';

    if (!isDataComplete) {
        resultMessage.value = '参数不完整，无法进行赔付核算。';
        estimatedPremium.value = 'N/A';
        hasPayout.value = false;
        simulationComplete.value = true;
        return;
    }

    estimatedPremium.value = calculatePremium(dataForCalculation);

    let matchedRule = null;
    for (const rule of claimRules) {
      if (
        dataForCalculation.typhoonLevel === rule.level &&
        dataForCalculation.impactRegion === rule.impact &&
        dataForCalculation.predictTime === rule.time
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
      if (!dataForCalculation.impactRegion) {
        baseMessage += '台风未命中承保区域，因此不触发赔付。';
      } else {
        baseMessage += '本次台风预测未达到触发提前赔付的条件（例如：强度未达标，或预测时间不符），因此不触发提前赔付。';
      }
      resultMessage.value = baseMessage;
      hasPayout.value = false;
    }
    simulationComplete.value = true;
  };

  const startSimulation = () => {
    resetSimulationDisplayState(); // 确保在开始新模拟前，重置状态

    const params = simulationParams;
    const isDataComplete = params.lat !== null && params.lon !== null &&
                           params.typhoonLevel !== 'none' && params.predictTime !== 'none';

    if (!isDataComplete) {
        resultMessage.value = '请提供完整的参数以进行理赔模拟。';
        simulationComplete.value = true;
        estimatedPremium.value = 'N/A';
        return;
    }

    // 只有在非调试模式下，或者调试模式但当前是第一步时才自动启动定时器
    if (!isDebugMode.value || (isDebugMode.value && currentStep.value === 0)) {
        simulationInterval = setInterval(() => {
            if (currentStep.value < steps.length - 1) {
                currentStep.value++;
            } else {
                clearInterval(simulationInterval);
                determinePayoutAndPremium();
                simulationInterval = null;
            }
        }, 500); // 每步间隔 500ms
    }
  };

  // 调试模式下，手动推进下一步
  const nextDebugStep = () => {
      stopSimulation(); // 确保没有自动定时器在运行
      if (currentStep.value < steps.length - 1) {
          currentStep.value++;
      } else {
          determinePayoutAndPremium();
      }
  };

  // 暴露函数，用于从外部设置模拟参数 (例如从地图或手动输入)
  const setSimulationParams = (params) => {
    Object.assign(simulationParams, params);
  };

  // 暴露函数，用于切换调试模式
  const setDebugMode = (mode) => {
      isDebugMode.value = mode;
      // 切换调试模式时，始终重置所有模拟数据
      resetAllSimulationData();
  };

  // 生命周期钩子: 组件卸载时清理定时器
  onUnmounted(() => {
      stopSimulation();
  });

  return {
    // 暴露响应式状态
    currentStep,
    simulationComplete,
    resultMessage,
    estimatedPremium,
    hasPayout,
    isDebugMode, // 暴露调试模式状态
    simulationParams, // 暴露当前模拟参数
    steps, // 暴露流程步骤定义

    // 暴露操作函数
    startSimulation,
    nextDebugStep, // 供调试模式使用
    resetSimulationDisplayState, // 仅重置进度显示
    resetAllSimulationData, // 重置所有数据和显示
    setSimulationParams, // 更新输入参数
    setDebugMode // 切换调试模式
  };
}