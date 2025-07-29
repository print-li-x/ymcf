<template>
  <div id="cesiumContainer" style="width:100%;height:100%;"></div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import * as Cesium from 'cesium'
import axios from 'axios'

Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxNjBkNDIzYi05NzRiLTQ3NzQtOTFkNC01MDQ0MWEwZTdiNWQiLCJpZCI6Mjg0ODU1LCJpYXQiOjE3NDIxODAzNTl9.AuojGROtggzOw-yCvG0ol2OoH47NQpUSDUNcilJckhE'

const route = useRoute()
const coords = ref(null)
const weatherInfo = ref(null)

let viewer

const CHINA_RECT = Cesium.Rectangle.fromDegrees(73.66, 18.16, 135.05, 53.55)

async function applyLayer(layerName) {
  if (!viewer || !layerName) return
  viewer.imageryLayers.removeAll()

  try {
    let provider
    switch (layerName) {
      case 'arcgis':
        provider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
          'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
        )
        break
      case 'osm':
      default:
        provider = new Cesium.OpenStreetMapImageryProvider()
    }
    viewer.imageryLayers.addImageryProvider(provider)
  } catch (err) {
    console.error('底图加载失败：', err)
  }
}

function initMap() {
  Cesium.Camera.DEFAULT_VIEW_RECTANGLE = CHINA_RECT
  Cesium.Camera.DEFAULT_VIEW_FACTOR = 0

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
    selectionIndicator: false
  })

  viewer.scene.camera.setView({ destination: CHINA_RECT })
  applyLayer(route.query.layer)

  // ✅ 安全绑定点击事件
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
  handler.setInputAction((click) => {
    const pickedPosition = viewer.scene.pickPosition(click.position)
    if (pickedPosition) {
      const cartographic = Cesium.Cartographic.fromCartesian(pickedPosition)
      const lat = Cesium.Math.toDegrees(cartographic.latitude)
      const lng = Cesium.Math.toDegrees(cartographic.longitude)

      coords.value = { lat, lng }
      getWeatherData(lat, lng)
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
}

const getWeatherData = async (lat, lon) => {
  try {
    const res = await axios.post('/api/variables/positions', {
      variable_name: 'surf_10u',
      position: [lon, lat],
      time_index: 0
    })
    weatherInfo.value = res.data
  } catch (err) {
    console.error('获取数据失败', err)
  }
}

onMounted(initMap)

watch(
  () => route.query.layer,
  layer => applyLayer(layer)
)
</script>
