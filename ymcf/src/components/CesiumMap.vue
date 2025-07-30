<script setup>
import { onMounted, ref, watch, defineEmits } from 'vue'; // 引入 defineEmits
import { useRoute } from 'vue-router';
import * as Cesium from 'cesium';
// 不再直接在这里发起Axios请求，而是通过emit传递坐标

Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyOThmNmMxMi1hZGRhLTQ2OGItYjIxNC1jNmI3Zjk5YWVmYTUiLCJpZCI6Mjg0ODYzLCJpYXQiOjE3NDkxMTA2ODB9.O4nN-lEFz6iKsXfW5O7TVofwsI5Kyjv8yDFDpy_AyLs';

const route = useRoute();
const coords = ref(null); // 这个coords现在只用于在CesiumMap组件内显示，不直接用于外部axios请求

let viewer;

const CHINA_RECT = Cesium.Rectangle.fromDegrees(73.66, 18.16, 135.05, 53.55);

// ⚡️ 定义将要发射的事件
const emits = defineEmits(['coordinates-selected']);

async function applyLayer(layerName) {
  if (!viewer || !layerName) return;
  viewer.imageryLayers.removeAll();

  try {
    let provider;
    switch (layerName) {
      case 'arcgis':
        provider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
          'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
        );
        break;
      case 'osm':
      default:
        provider = new Cesium.OpenStreetMapImageryProvider();
    }
    viewer.imageryLayers.addImageryProvider(provider);
  } catch (err) {
    console.error('底图加载失败：', err);
  }
}

function initMap() {
  Cesium.Camera.DEFAULT_VIEW_RECTANGLE = CHINA_RECT;
  Cesium.Camera.DEFAULT_VIEW_FACTOR = 0;

  viewer = new Cesium.Viewer('cesiumContainer', {
    sceneModePicker: false,
    homeButton: false,
    baseLayerPicker: false,
    geocoder: false,
    animation: false,
    timeline: false,
    navigationHelpButton: false,
    creditContainer: document.createElement('div'),
    infoBox: false,
    selectionIndicator: false,
    mode: Cesium.SceneMode.SCENE2D
  });

  viewer.scene.camera.setView({ destination: CHINA_RECT });
  applyLayer(route.query.layer);

  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction((click) => {
    const pickedPosition = viewer.scene.pickPosition(click.position);
    if (pickedPosition) {
      const cartographic = Cesium.Cartographic.fromCartesian(pickedPosition);
      const lat = Cesium.Math.toDegrees(cartographic.latitude);
      const lng = Cesium.Math.toDegrees(cartographic.longitude);

      coords.value = { lat, lng }; // 更新内部显示
      // ⚡️ 通过事件发射经纬度
      emits('coordinates-selected', { lat, lon: lng }); // 使用 lon 匹配后端DataRequest
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

onMounted(initMap);

watch(
  () => route.query.layer,
  layer => applyLayer(layer)
);
</script>

<template>
  <div id="cesiumContainer" class="w-full h-full relative"></div>
  <div v-if="coords" class="absolute top-4 left-4 bg-white p-2 rounded shadow-md z-10">
    <p>经度: {{ coords.lng.toFixed(4) }}</p>
    <p>纬度: {{ coords.lat.toFixed(4) }}</p>
    </div>
</template>

<style scoped>
#cesiumContainer {
  width: 100%;
  height: 100%;
  position: relative;
}
</style>