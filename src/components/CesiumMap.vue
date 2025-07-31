<template>
  <div id="cesiumContainer" style="width:100%;height:100%;"></div>
</template>

<script setup>
import { onMounted, watch, onBeforeUnmount, ref, defineEmits } from 'vue'
import { useRoute } from 'vue-router'
import * as Cesium from 'cesium'
import { isDarkMode } from '@/utils/theme.js'

Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxNjBkNDIzYi05NzRiLTQ3NzQtOTFkNC01MDQ0MWEwZTdiNWQiLCJpZCI6Mjg0ODU1LCJpYXQiOjE3NDIxODAzNTl9.AuojGROtggzOw-yCvG0ol2OoH47NQpUSDUNcilJckhE'

const route  = useRoute()
let  viewer 
const debugText = ref('') 
const coords = ref(null); 

const CHINA_RECT = Cesium.Rectangle.fromDegrees(
  73.66, 18.16, 135.05, 53.55
)

function updateCesiumBg() {
  const cssColor = getComputedStyle(document.documentElement)
                    .getPropertyValue('--cesium-bg').trim()
  viewer.scene.backgroundColor = Cesium.Color.fromCssColorString(cssColor)
}

async function applyLayer (layerName) {
  if (!viewer || !layerName) {
    return
  }else if (layerName == 'None'){
    viewer.imageryLayers.removeAll()
    loadCityBoundaries(Cesium.Color.DIMGREY.withAlpha(0.95), true)
    return
  }

  
  viewer.imageryLayers.removeAll()
  viewer.entities.removeAll()

  try {
    let provider

    switch (layerName) {
      case 'arcgis':
        provider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
          'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
        )
        loadCityBoundaries()
        break

      case 'gaode':
        provider = new Cesium.UrlTemplateImageryProvider({
          url: "http://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}",
          tilingScheme: new Cesium.WebMercatorTilingScheme(), 
          maximumLevel: 18
        })
        loadCityBoundaries(Cesium.Color.GRAY.withAlpha(0.5))
        break
  
      case 'osm':
        loadCityBoundaries(Cesium.Color.GRAY.withAlpha(0.5))
      default:
        provider = new Cesium.OpenStreetMapImageryProvider()
        break
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
    selectionIndicator: false,
    mode: Cesium.SceneMode.SCENE2D // ✅ 来自第二段
  })

  // ✅ 相机设置视角
  viewer.scene.camera.setView({ destination: CHINA_RECT })

  // ✅ 去除默认天空和大气效果
  viewer.scene.skyBox = undefined
  viewer.scene.skyAtmosphere = undefined
  viewer.scene.globe.baseColor = Cesium.Color.TRANSPARENT

  // ✅ 注册事件监听（用于数据加载）
  window.addEventListener('data-loaded', handleDataLoaded)
  onBeforeUnmount(() => {
    window.removeEventListener('data-loaded', handleDataLoaded)
  })

  // ✅ 加载城市边界
  loadCityBoundaries()

  // ✅ 设置背景颜色（跟随深色模式）
  updateCesiumBg()
  watch(isDarkMode, updateCesiumBg)

  // ✅ 加载初始图层（根据路由参数）
  applyLayer(route.query.layer)

  // ✅ 添加点击事件，采集坐标 & 发射事件
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
  handler.setInputAction((click) => {
    const pickedPosition = viewer.scene.pickPosition(click.position)
    if (pickedPosition) {
      const cartographic = Cesium.Cartographic.fromCartesian(pickedPosition)
      const lat = Cesium.Math.toDegrees(cartographic.latitude)
      const lon = Cesium.Math.toDegrees(cartographic.longitude)

      coords.value = { lat, lon }
      emits('coordinates-selected', { lat, lon }) // ⚡ 事件发射
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
}


onMounted(initMap)

watch(
  () => route.query.layer,
  layer => applyLayer(layer)
)

function loadCityBoundaries(color = Cesium.Color.WHITE.withAlpha(0.5), world = false) {
  fetch("/data/city.geojson")
    .then(res => res.json())
    .then(data => {
      data.features.forEach(feature => {
        const { type } = feature.geometry
        const name = feature.properties.市

        if (type === 'Polygon') {
          const coords = feature.geometry.coordinates[0]
          const positions = coords.map(([lng, lat]) =>
            Cesium.Cartesian3.fromDegrees(lng, lat)
          )
          viewer.entities.add({
            name,
            polygon: {
              height: 0,
              hierarchy: new Cesium.PolygonHierarchy(positions),
              material: color,
              outline: true,
              outlineColor: Cesium.Color.GAINSBORO.withAlpha(0.7),
              width: 100
            }
          })

        } else if (type === 'MultiPolygon') {
          feature.geometry.coordinates.forEach((polyCoords, idx) => {
            const positions = polyCoords[0].map(([lng, lat]) =>
              Cesium.Cartesian3.fromDegrees(lng, lat)
            )
            viewer.entities.add({ 
              name,
              polygonIndex: idx,
              polygon: {
                height: 0,
                hierarchy: new Cesium.PolygonHierarchy(positions),
                material: color,
                outline: true,
                outlineColor: Cesium.Color.GAINSBORO.withAlpha(0.7),
                width: 100
              }
            })
          })
        }
      })
    })
    .catch(err => {
      console.error('加载城市边界失败：', err)
    })
  if (world == true){
  fetch("/data/world_countries.geojson")
  .then(res => res.json())
  .then(data => {
  data.features.forEach((feature, index) => {
    const { type } = feature.geometry
    const name = feature.properties.ADMIN || feature.properties.name || `country-${index}`

    if (type === 'Polygon') {
      const coords = feature.geometry.coordinates[0]
      const positions = coords.map(([lng, lat]) =>
        Cesium.Cartesian3.fromDegrees(lng, lat)
      )
      viewer.entities.add({
        name,
        polygon: {
          height: 0,
          hierarchy: new Cesium.PolygonHierarchy(positions),
          material: color,
          outline: true,
          outlineColor: Cesium.Color.WHITE.withAlpha(0.2),
          outlineWidth: 20
        }
      })
    } else if (type === 'MultiPolygon') {
      feature.geometry.coordinates.forEach((polyCoords, i) => {
        const positions = polyCoords[0].map(([lng, lat]) =>
          Cesium.Cartesian3.fromDegrees(lng, lat)
        )
        viewer.entities.add({
          name,
          polygonIndex: i,
          polygon: {
            height: 0,
            hierarchy: new Cesium.PolygonHierarchy(positions),
            material: color,
            outline: true,
            outlineColor: Cesium.Color.WHITE.withAlpha(0.2),
            outlineWidth: 20
          }
        })
      })
    }
  })
})}
}

function addGridAsSingleTile (grid, shape) {
  const [rows, cols] = shape
  const flat = grid.flat()
  const min = Math.min(...flat)
  const max = Math.max(...flat)

  const canvas = document.createElement('canvas')
  canvas.width = cols
  canvas.height = rows
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(cols, rows)

  flat.forEach((v, i) => {
    const c = ((v - min) / (max - min)) * 255   // 简易蓝红渐变
    img.data.set([c, 0, 255 - c, 200], i * 4)
  })
  ctx.putImageData(img, 0, 0)

  viewer.imageryLayers.addImageryProvider(
    new Cesium.SingleTileImageryProvider({
      url: canvas.toDataURL(),
      rectangle: Cesium.Rectangle.fromDegrees(100, 0, 160, 60) // ⇽ 改成数据经纬度范围
    })
  )
}

/** 在指定经纬度画黄点 + 文本 */
function addPointLabel (lat, lon, text) {
  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(lon, lat),
    point:    { pixelSize: 8, color: Cesium.Color.YELLOW },
    label:    {
      text,
      font: '14px sans-serif',
      pixelOffset: new Cesium.Cartesian2(0, -20),
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2
    }
  })
}

function handleDataLoaded (evt) {
  const { action, variables, params, data } = evt.detail
  debugText.value = JSON.stringify({ action, variables, params }, null, 2)

  if (!variables?.length) return
  const varName = variables[0]
  const payload = data?.[varName]          // ← 关键：取到真正的数据块
  if (!payload) return

  if (action === 'series') {
    console.table(payload)
    return
  }

  if (action === 'levels') {
    const arr   = payload.data              // 2-D 数组
    const shape = payload.shape             // [rows, cols]
    if (Array.isArray(arr) && Array.isArray(shape) && shape.length === 2) {
      addGridAsSingleTile(arr, shape)
    }
    return
  }

  if (action === 'positions') {
    const val = payload.data
    if (val != null && params.lat != null && params.lon != null) {
      addPointLabel(params.lat, params.lon, `${varName}: ${val}`)
    }
  }
}


</script>

<style scoped>

</style>