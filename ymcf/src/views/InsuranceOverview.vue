<template>
  <div class="insurance-overview">

    <!-- 第二部分：地图 + 保费结果 -->
    <section class="map-and-result">
      <div class="map-wrapper">
        <RiskMap />
      </div>
      <div class="result-wrapper">
        <PremiumResultCard />
      </div>
    </section>

    <!-- 第一部分：理赔计算 -->
    <section class="full-row">
      <InsurancePay/>
    </section>

    <!-- 第三部分：模拟理赔 -->
    <section class="full-row">
      <ClaimSimulator />
    </section>
  </div>
</template>

<script setup>
import RiskMap from '@/components/insurance/Risk.vue'
import PremiumResultCard from '@/components/insurance/PremiumResultCard.vue'
import ClaimSimulator from '@/components/insurance/ClaimSimulator.vue'
import InsurancePay  from '../components/insurance/Insurance.vue'     
</script>

<style scoped>
.insurance-overview {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding:20px 5% 0;
  min-height: 100vh;
  box-sizing: border-box;
  overflow-y: auto;
}

.full-row {
  width: 100%;
}

.map-and-result {
  display: flex;
  gap: 16px;
  height:auto;
}

.map-wrapper {
  flex: 2;
  border: 1px solid #ccc;
  border-radius: 8px;
  height: auto;
  overflow: hidden;
}

.result-wrapper {
  flex: 1;
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 16px;
  overflow-y: auto;
}
</style>