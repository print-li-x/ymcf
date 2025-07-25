<template>
    <div>
        <insurance />
    </div>
</template>

<script setup>
import insurance from '@/components/insuranceco.vue'
</script>

<style scoped>
.page, .page :deep(#cesiumContainer){
  width:100%;
  height:calc(100vh - 56px); 
}
</style>
