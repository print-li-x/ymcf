
<template>
  <div class="claim-simulator">
    <h3>理赔流程模拟</h3>
    <ul class="timeline">
      <li v-for="(step, index) in steps" :key="index" :class="{ active: index <= currentStep }">
        <div class="circle">{{ index + 1 }}</div>
        <div class="content">
          <strong>{{ step.title }}</strong>
          <p>{{ step.desc }}</p>
        </div>
      </li>
    </ul>
    <button v-if="currentStep < steps.length - 1" @click="nextStep">下一步</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { isDarkMode, toggleTheme } from '@/utils/theme.js'

const steps = [
  { title: '购买保险', desc: '浙江温州某渔场投保了台风参数化保险' },
  { title: '台风预警', desc: '系统检测台风生成，路径可能影响该地区' },
  { title: '路径命中', desc: '预测路径穿过保险区域，符合触发条件' },
  { title: '灾情核查', desc: '核实实际影响并评估损失' },
  { title: '完成理赔', desc: '赔付 18 万元完成，资金到达受保人账户' }
]

const currentStep = ref(0)
function nextStep() {
  if (currentStep.value < steps.length - 1) currentStep.value++
}
</script>

<style scoped>
.claim-simulator {
  padding: 1.5rem;
  border-radius: 12px;
  background-color: var(--card-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.timeline {
  list-style: none;
  padding: 0;
  margin: 1rem 0;
  position: relative;
}

.timeline li {
  display: flex;
  align-items: flex-start;
  margin-bottom: 1rem;
  position: relative;
  opacity: 0.4;
  transition: opacity 0.3s ease;
}
.timeline li.active {
  opacity: 1;
}

.timeline .circle {
  width: 24px;
  height: 24px;
  background: #1890ff;
  border-radius: 50%;
  color: var(--text-primary);
  text-align: center;
  line-height: 24px;
  margin-right: 12px;
  font-size: 14px;
}

.timeline .content {
  flex: 1;
}

button {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: #1890ff;
  color: var(--text-primary);
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
</style>
