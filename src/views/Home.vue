<template>
  <div class="page">
    <CesiumMap/>
  </div>
</template>

<script setup>
import CesiumMap from '@/components/CesiumMap.vue'
</script>

<style scoped>
.page, .page :deep(#cesiumContainer){
  width:100%;
  height:calc(100vh - 56px); 
}
</style>
