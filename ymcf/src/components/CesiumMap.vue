<template>
  <div id="cesiumContainer" style="width:100%;height:100%;"></div>
</template>

<script setup>
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import * as Cesium from 'cesium'

Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxNjBkNDIzYi05NzRiLTQ3NzQtOTFkNC01MDQ0MWEwZTdiNWQiLCJpZCI6Mjg0ODU1LCJpYXQiOjE3NDIxODAzNTl9.AuojGROtggzOw-yCvG0ol2OoH47NQpUSDUNcilJckhE'

const route  = useRoute()
let  viewer 

const CHINA_RECT = Cesium.Rectangle.fromDegrees(
  73.66, 18.16, 135.05, 53.55
)

async function applyLayer (layerName) {
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

function initMap () {
  Cesium.Camera.DEFAULT_VIEW_RECTANGLE = CHINA_RECT
  Cesium.Camera.DEFAULT_VIEW_FACTOR    = 0

  viewer = new Cesium.Viewer('cesiumContainer', {
    sceneModePicker: false,
    homeButton:      false,
    baseLayerPicker: false,
    geocoder:        false,
    animation:       false,
    timeline:        false,
    navigationHelpButton: false,
    creditContainer:      document.createElement('div'),
    infoBox:            false,
    selectionIndicator: false
  })

  viewer.scene.camera.setView({ destination: CHINA_RECT })

  applyLayer(route.query.layer)
}

onMounted(initMap)

watch(
  () => route.query.layer,
  layer => applyLayer(layer)
)
</script>
