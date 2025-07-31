<template>
  <div class="claim-process-timeline">
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
    <div v-else-if="currentStep > 0 && currentStep < steps.length" class="dynamic-step-content">
        <p>{{ steps[currentStep].displayContent }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

// 从父组件 (InsuranceOverview) 接收的 props
const props = defineProps({
  currentStep: { type: Number, required: true },
  simulationComplete: { type: Boolean, required: true },
  resultMessage: { type: String, required: true },
  estimatedPremium: { type: String, required: true },
  hasPayout: { type: Boolean, required: true },
  steps: { // 将 steps 作为 prop 传入，而不是组件内部定义
      type: Array,
      required: true,
      default: () => []
  }
});

// 不再需要内部定义 steps
</script>

<style scoped>
/* 保持现有样式，或根据您的 Naive UI 主题进行调整 */
h4 {
  color: var(--text-heading);
  text-align: center;
  margin-bottom: 1.5rem;
}

.dynamic-step-content {
    text-align: center;
    font-size: 1.1em;
    color: var(--text-primary);
    padding: 1rem;
    line-height: 1.6;
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
.simulation-result .purpose-text .fa-lightbulb {
    margin-right: 8px;
    color: #f7b500;
}
.simulation-result .purpose-text .highlight-purpose {
    color: #1890ff;
    font-weight: bold;
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