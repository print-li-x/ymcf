<template>
  <div class="typhoon-insurance">
    <h2>台风参数化保险模拟</h2>

    <form @submit.prevent="simulate" class="form">
      <label>
        最大风速阈值（m/s）：
        <input type="number" v-model="threshold" />
      </label>

      <label>
        保额（元）：
        <input type="number" v-model="amount" />
      </label>

      <button type="submit">模拟赔付</button>
    </form>

    <div v-if="result" class="result">
      <h3>模拟结果</h3>
      <p>模拟台风最大风速：<strong>{{ result.windSpeed }} m/s</strong></p>
      <p>是否触发赔付：<strong>{{ result.triggered ? '是 ✅' : '否 ❌' }}</strong></p>
      <p>赔付金额：<strong>{{ result.payout }} 元</strong></p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const threshold = ref(40)  // 用户设定的阈值
const amount = ref(100000) // 保额

const result = ref(null)

function simulate() {
  // 模拟一个台风最大风速（例如实际数据来自外部接口）
  const windSpeed = Math.floor(Math.random() * 70) + 10 // 10 ~ 80 m/s

  const triggered = windSpeed >= threshold.value
  const payout = triggered ? amount.value : 0

  result.value = {
    windSpeed,
    triggered,
    payout
  }
}
</script>

<style scoped>
.typhoon-insurance {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
  border-radius: 10px;
  background: #eef7ff;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}
.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
label {
  display: flex;
  flex-direction: column;
  font-weight: bold;
}
input {
  padding: 6px;
  font-size: 14px;
  border: 1px solid #ccc;
  border-radius: 6px;
}
button {
  padding: 10px;
  font-weight: bold;
  background-color: #0077cc;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.result {
  margin-top: 20px;
  background-color: #d1eaff;
  padding: 15px;
  border-radius: 8px;
}
</style>
