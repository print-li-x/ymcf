<template> 
  <div id="cesiumContainer" style="width:100%;height:100%;position:relative;">
    <!-- Typhoon HUD -->
    <div v-if="hud.show" class="typhoon-hud">
      <div class="hud-title">台风中心</div>
      <div class="hud-row">
        <span class="k">时间</span>
        <span class="v">{{ hud.time }}</span>
      </div>
      <div class="hud-row">
        <span class="k">位置</span>
        <span class="v">{{ hud.lat.toFixed(2) }}, {{ hud.lon.toFixed(2) }}</span>
      </div>
      <div class="hud-row">
        <span class="k">风速</span>
        <span class="v">{{ hud.wind.toFixed(1) }} m/s</span>
      </div>
      <div class="hud-row">
        <span class="k">气压</span>
        <span class="v">{{ (hud.msl/100).toFixed(1) }} hPa</span>
      </div>
      <div class="hud-row">
        <span class="k">进度</span>
        <span class="v">{{ hud.index + 1 }} / {{ hud.count }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, watch, ref, reactive } from 'vue'
import { useRoute } from 'vue-router'
import * as Cesium from 'cesium'
import { isDarkMode } from '@/utils/theme.js'
import { useDataStore } from '@/stores/dataStore'

const store = useDataStore()
const route = useRoute()

/** =========================
 *  Global state
 *  ========================= */
let viewer
let rasterLayers = []     // 单张或跨反日界两张
const debugText = ref('')
// 城市高亮状态
let highlightedPolys = []  // [{ entity, material, outline, outlineColor }]

// 点击取点 handler
let clickHandler = null

// 供 Cesium 使用的数据
const rasterForCesium = computed(() => store.getCesiumRasterData())

// 台风路径实体引用
let tyEntityWalker = null          // 随时间移动的中心点（带标签）
let tyPulseEntity  = null          // 脉冲圈
let tyPolylineMain = null          // 主路径（淡色底线）
let tyPolylineSegs = []            // 分段上色的路径（按风速）
let tyPointEntities = []           // 每步的小圆点（可选）

// 台风数据缓存（便于 tick 使用）
let tyTimesMs = []
let tyLats = []
let tyLons = []
let tyWinds = []
let tyMsls = []
let tySampledPos = null
let tyTickBound = null
let currentBaseLayerName = route.query.layer || 'osm'

// 风险叠加层（按城市填色）
let riskOverlayEntities = []

// HUD
const hud = reactive({
  show: false,
  time: '',
  lat: 0,
  lon: 0,
  wind: 0,
  msl: 0,
  index: 0,
  count: 0
})

/** =========================
 *  Constants & Token
 *  ========================= */
Cesium.Ion.defaultAccessToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxNjBkNDIzYi05NzRiLTQ3NzQtOTFkNC01MDQ0MWEwZTdiNWQiLCJpZCI6Mjg0ODU1LCJpYXQiOjE3NDIxODAzNTl9.AuojGROtggzOw-yCvG0ol2OoH47NQpUSDUNcilJckhE'

const CHINA_RECT = Cesium.Rectangle.fromDegrees(73.66, 18.16, 135.05, 53.55)

/** =========================
 *  Watchers
 *  ========================= */
watch(
  rasterForCesium,
  (val) => { if (val && viewer) addOrUpdateRasterLayer(viewer, val) },
  { immediate: true }
)

watch(() => route.query.layer, (layer) => {
  if (layer) currentBaseLayerName = layer
  applyLayer(layer)
})
watch(isDarkMode, () => updateCesiumBg())

/** =========================
 *  Lifecycle
 *  ========================= */
onMounted(() => {
  initMap()
  // 统一在挂载后注册所有监听
  window.addEventListener('highlight-city', onHighlightCity)
  window.addEventListener('clear-city-highlight', clearCityHighlight)
  window.addEventListener('map-clear-all', onMapClearAll)
  window.addEventListener('risk-map-loaded', onRiskMapLoaded)
  window.addEventListener('map-clear-data-layer', onMapClearDataLayer)
  window.addEventListener('data-loaded', handleDataLoaded)
  window.addEventListener('map-projection', onMapProjection)
  window.addEventListener('typhoon-track-loaded', onTyphoonTrackLoaded)
  // 兼容面板端的主动刷新广播
  window.addEventListener('map-refresh-layers', onMapRefreshLayers)
  window.addEventListener('map-layer-switch', onMapLayerSwitch)
})

onBeforeUnmount(() => {
  // 事件卸载
  window.removeEventListener('highlight-city', onHighlightCity)
  window.removeEventListener('clear-city-highlight', clearCityHighlight)
  window.removeEventListener('map-clear-all', onMapClearAll)
  window.removeEventListener('risk-map-loaded', onRiskMapLoaded)
  window.removeEventListener('map-clear-data-layer', onMapClearDataLayer)
  window.removeEventListener('data-loaded', handleDataLoaded)
  window.removeEventListener('map-projection', onMapProjection)
  window.removeEventListener('typhoon-track-loaded', onTyphoonTrackLoaded)
  window.removeEventListener('map-refresh-layers', onMapRefreshLayers)
  window.removeEventListener('map-layer-switch', onMapLayerSwitch)

  // 资源清理
  if (tyTickBound) { try { viewer.clock.onTick.removeEventListener(tyTickBound) } catch(_) {} tyTickBound = null }
  if (clickHandler) { try { clickHandler.destroy() } catch(e) {} clickHandler = null }
  if (viewer) { removeAllRasterLayers() }
  clearTyphoonEntities()
  clearRiskOverlay()
  if (viewer && !viewer.isDestroyed()) viewer.destroy()
})

/** =========================
 *  Projection switching (3D / 2D)
 *  ========================= */
function onMapProjection (e) {
  if (!viewer) return
  const d = e?.detail || {}
  const key = String(d.key || '').toUpperCase()
  if (key === '2D') viewer.scene.morphTo2D(0)
  else viewer.scene.morphTo3D(0)
}

/** =========================
 *  Initialization
 *  ========================= */
function initMap () {
  Cesium.Camera.DEFAULT_VIEW_RECTANGLE = CHINA_RECT
  Cesium.Camera.DEFAULT_VIEW_FACTOR    = 0

  viewer = makeViewer({
    sceneMode: (String(route.query?.proj) === '2D')
      ? Cesium.SceneMode.SCENE2D
      : Cesium.SceneMode.SCENE3D
  })

  updateCesiumBg()
  applyLayer(route.query.layer)
  loadCityBoundaries()

  const current = rasterForCesium.value
  if (current) addOrUpdateRasterLayer(viewer, current)

  enableClickProbe()
}

/** =========================
 *  Typhoon Track Rendering
 *  ========================= */
function onTyphoonTrackLoaded(e) {
  if (!viewer) return

  clearCityHighlight()

  const d = e?.detail || {}
  const positionsDegrees = d.positionsDegrees // [lon,lat,0, ...]
  tyTimesMs = Array.isArray(d.timesMs) ? d.timesMs.slice() : []
  tyLats = Array.isArray(d.lats) ? d.lats.slice() : []
  tyLons = Array.isArray(d.lons) ? d.lons.slice() : []
  tyWinds = Array.isArray(d.winds) ? d.winds.slice() : []
  tyMsls  = Array.isArray(d.msls) ? d.msls.slice() : []

  if (!positionsDegrees?.length || !tyTimesMs?.length) return

  // 1) 清理旧实体
  clearTyphoonEntities()

  // 2) 主路径（淡色底线）
  const polyPositions = Cesium.Cartesian3.fromDegreesArrayHeights(positionsDegrees)
  tyPolylineMain = viewer.entities.add({
    name: 'Typhoon Track (base)',
    polyline: {
      positions: polyPositions,
      width: 6,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.2,
        color: Cesium.Color.fromCssColorString('#00c8ff').withAlpha(0.35)
      }),
      clampToGround: false,
      arcType: Cesium.ArcType.GEODESIC
    }
  })

  // 3) 分段上色路径（按风速）
  tyPolylineSegs = buildWindColoredSegments(positionsDegrees, tyWinds).map(seg =>
    viewer.entities.add({
      name: 'Typhoon Track (seg)',
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights(seg.pos),
        width: 3,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.25,
          color: seg.color
        }),
        clampToGround: false,
        arcType: Cesium.ArcType.GEODESIC
      }
    })
  )

  // 4) 小点（核对/提示）
  for (let i = 0; i < positionsDegrees.length; i += 3) {
    const lon = positionsDegrees[i], lat = positionsDegrees[i+1]
    const idx = Math.floor(i / 3)
    const timeStr = new Date(tyTimesMs[idx]).toLocaleString()
    const desc = `<b>${timeStr}</b><br/>Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}<br/>
      风速: ${Number(tyWinds[idx] ?? NaN).toFixed(1)} m/s<br/>
      MSL: ${(Number(tyMsls[idx] ?? NaN)/100).toFixed(1)} hPa`
    const p = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lon, lat, 0),
      point: {
        pixelSize: 5,
        color: windToCesiumColor(tyWinds[idx]).withAlpha(0.95),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 1
      },
      description: desc
    })
    tyPointEntities.push(p)
  }

  // 5) 随时间移动的中心点（walker）+ 标签
  tySampledPos = new Cesium.SampledPositionProperty()
  const startJ = Cesium.JulianDate.fromDate(new Date(tyTimesMs[0]))
  const stopJ  = Cesium.JulianDate.fromDate(new Date(tyTimesMs[tyTimesMs.length - 1]))
  for (let i = 0; i < tyTimesMs.length; i++) {
    const t = Cesium.JulianDate.fromDate(new Date(tyTimesMs[i]))
    const lon = positionsDegrees[i*3], lat = positionsDegrees[i*3 + 1]
    tySampledPos.addSample(t, Cesium.Cartesian3.fromDegrees(lon, lat, 0))
  }

  tyEntityWalker = viewer.entities.add({
    name: 'Typhoon Center',
    availability: new Cesium.TimeIntervalCollection([new Cesium.TimeInterval({ start: startJ, stop: stopJ })]),
    position: tySampledPos,
    orientation: new Cesium.VelocityOrientationProperty(tySampledPos),
    billboard: {
      image: buildCircleDataUrl('#ffd400', 12),
      scale: 1.0,
      verticalOrigin: Cesium.VerticalOrigin.CENTER
    },
    label: {
      text: new Cesium.CallbackProperty(() => (
        `中心 ${hud.lat.toFixed(2)}, ${hud.lon.toFixed(2)}\n` +
        `风速 ${hud.wind.toFixed(1)} m/s  MSL ${(hud.msl/100).toFixed(1)} hPa`
      ), false),
      font: 'bold 14px "Microsoft YaHei", sans-serif',
      pixelOffset: new Cesium.Cartesian2(0, -26),
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      showBackground: true,
      backgroundColor: Cesium.Color.fromCssColorString('#000000').withAlpha(0.4),
      backgroundPadding: new Cesium.Cartesian2(6, 4)
    },
    path: {
      resolution: 60,
      leadTime: 0,
      trailTime: 12 * 3600,
      material: Cesium.Color.fromCssColorString('#ffd400').withAlpha(0.55),
      width: 2
    }
  })

  // 6) 脉冲圈（动态 ellipse）
  const BASE = 40000
  const AMP  = 15000
  const SPEED_DIV = 600000
  const MIN_R = 1000

  function pulseR(time) {
    const tms = Cesium.JulianDate.toDate(time).getTime()
    const r = BASE + AMP * (1 + Math.sin(tms / SPEED_DIV))
    return Math.max(MIN_R, r)
  }

  tyPulseEntity = viewer.entities.add({
    // ★ 直接跟随台风中心
    position: tyEntityWalker.position,
    ellipse: {
      semiMinorAxis: new Cesium.CallbackProperty((time) => pulseR(time), false),
      semiMajorAxis: new Cesium.CallbackProperty((time) => pulseR(time) + 0.1, false),
      height: 0,
      material: Cesium.Color.fromCssColorString('#ffd400').withAlpha(0.12),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString('#ffd400').withAlpha(0.8),
      stRotation: 0
    }
  })

  // 7) 配置时钟并启动动画
  viewer.clock.startTime   = startJ.clone()
  viewer.clock.stopTime    = stopJ.clone()
  viewer.clock.currentTime = startJ.clone()
  viewer.clock.clockRange  = Cesium.ClockRange.CLAMPED
  viewer.clock.multiplier  = 1800
  viewer.clock.shouldAnimate = true

  if (tyTickBound) { try { viewer.clock.onTick.removeEventListener(tyTickBound) } catch(_) {} }
  tyTickBound = onTyphoonTick
  viewer.clock.onTick.addEventListener(tyTickBound)

  // 8) 初始化 HUD
  hud.show  = true
  hud.count = tyTimesMs.length
  updateHudByIndex(0)

  // 9) 视角飞到路径范围
  const rect = Cesium.Rectangle.fromDegrees(
    Math.min(...tyLons), Math.min(...tyLats),
    Math.max(...tyLons), Math.max(...tyLats)
  )
  if (Cesium.defined(rect) && isFinite(rect.west) && isFinite(rect.south) && isFinite(rect.east) && isFinite(rect.north)) {
    viewer.camera.flyTo({ destination: rect, duration: 1.0 })
  } else {
    viewer.camera.flyTo({ destination: CHINA_RECT, duration: 1.0 })
  }

  viewer.scene.requestRender()
}

function onTyphoonTick(clock) {
  const t = Cesium.JulianDate.toDate(clock.currentTime).getTime()
  const idx = indexForTime(tyTimesMs, t)
  updateHudByIndex(idx)
  viewer.scene.requestRender()
}

// 找到 <= t 的样本索引（最近）
function indexForTime(times, t) {
  if (!times?.length) return 0
  if (t <= times[0]) return 0
  if (t >= times[times.length-1]) return times.length-1
  let lo = 0, hi = times.length - 1
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1
    if (times[mid] <= t) lo = mid
    else hi = mid
  }
  return (t - times[lo] <= times[hi] - t) ? lo : hi
}

function updateHudByIndex(i) {
  if (!tyTimesMs?.length) return
  const clamp = (x,min,max)=> Math.max(min, Math.min(max, x))
  const idx = clamp(i, 0, tyTimesMs.length - 1)
  hud.index = idx
  hud.time  = new Date(tyTimesMs[idx]).toLocaleString()
  hud.lat   = Number(tyLats[idx]  ?? 0)
  hud.lon   = Number(tyLons[idx]  ?? 0)
  hud.wind  = Number(tyWinds[idx] ?? 0)
  hud.msl   = Number(tyMsls[idx]  ?? 0)
}

/** 按风速给路径分段上色 */
function buildWindColoredSegments(posDeg, winds) {
  // posDeg: [lon,lat,0, lon,lat,0, ...]
  const segs = []
  for (let i = 0; i + 6 <= posDeg.length; i += 3) {
    const w = winds[Math.floor(i/3)+1] ?? winds[Math.floor(i/3)] ?? 0
    segs.push({
      pos: posDeg.slice(i, i + 6),
      color: windToCesiumColor(w)
    })
  }
  return segs
}

/** 简单风速调色 */
function windToCesiumColor(w) {
  // 0-60 m/s 从青 -> 绿 -> 黄 -> 橙 -> 红
  const clamp = (x,min,max)=> Math.max(min, Math.min(max, x))
  const t = clamp(w / 60, 0, 1)
  const stops = [
    {p:0.0, c:[  0,200,255]},
    {p:0.25,c:[ 60,220,120]},
    {p:0.5, c:[180,200, 60]},
    {p:0.75,c:[230,140, 40]},
    {p:1.0, c:[210, 60, 60]},
  ]
  let c=[210,60,60]
  for (let i=0;i<stops.length-1;i++){
    const a=stops[i], b=stops[i+1]
    if (t>=a.p && t<=b.p){
      const k=(t-a.p)/Math.max(1e-6,(b.p-a.p))
      c=[Math.round(a.c[0]+(b.c[0]-a.c[0])*k),
         Math.round(a.c[1]+(b.c[1]-a.c[1])*k),
         Math.round(a.c[2]+(b.c[2]-a.c[2])*k)]
      break
    }
  }
  return new Cesium.Color(c[0]/255, c[1]/255, c[2]/255, 0.95)
}

// 生成圆形图片（用于台风中心图标）
function buildCircleDataUrl (hex = '#ffcc00', r = 10) {
  const s = r * 2 + 2
  const c = document.createElement('canvas')
  c.width = s; c.height = s
  const ctx = c.getContext('2d')
  ctx.fillStyle = hex
  ctx.beginPath()
  ctx.arc(s/2, s/2, r, 0, Math.PI*2)
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'
  ctx.stroke()
  return c.toDataURL('image/png')
}

function clearTyphoonEntities () {
  if (!viewer) return
  try {
    if (tyPolylineMain) viewer.entities.remove(tyPolylineMain)
    tyPolylineMain = null
    if (tyPolylineSegs?.length) {
      tyPolylineSegs.forEach(e => { try { viewer.entities.remove(e) } catch(_){} })
      tyPolylineSegs = []
    }
    if (tyPointEntities?.length) {
      tyPointEntities.forEach(e => { try { viewer.entities.remove(e) } catch(_){} })
      tyPointEntities = []
    }
    if (tyPulseEntity) { try { viewer.entities.remove(tyPulseEntity) } catch(_) {} tyPulseEntity = null }
    if (tyEntityWalker) { try { viewer.entities.remove(tyEntityWalker) } catch(_) {} tyEntityWalker = null }
    if (tyTickBound) { try { viewer.clock.onTick.removeEventListener(tyTickBound) } catch(_) {} tyTickBound = null }
    hud.show = false
  } catch (_) {}
}

/** =========================
 *  Risk overlay
 *  ========================= */
function clearRiskOverlay () {
  if (!viewer || !riskOverlayEntities.length) return
  try {
    riskOverlayEntities.forEach(e => { try { viewer.entities.remove(e) } catch(_){} })
  } finally {
    riskOverlayEntities = []
    viewer.scene.requestRender()
  }
}

/** =========================
 *  Base Map & Overlays
 *  ========================= */
function updateCesiumBg () {
  if (!viewer) return
  const cssColor = getComputedStyle(document.documentElement).getPropertyValue('--cesium-bg').trim()
  viewer.scene.backgroundColor = Cesium.Color.fromCssColorString(cssColor)
}

async function applyLayer (layerName) {
  if (!viewer) return

  // 切底图：只清数据图层和点标注 + 台风
  clearDataLayer({ clearLabel: true })
  clearCityHighlight()
  clearTyphoonEntities()

  if (!layerName) return

  if (layerName === 'None') {
    viewer.imageryLayers.removeAll()
    viewer.entities.removeAll()
    loadCityBoundaries(Cesium.Color.DIMGREY.withAlpha(0), true)
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
          url: 'http://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
          tilingScheme: new Cesium.WebMercatorTilingScheme(),
          maximumLevel: 18
        })
        loadCityBoundaries(Cesium.Color.GRAY.withAlpha(0.5))
        break
      case 'osm':
        loadCityBoundaries(Cesium.Color.GRAY.withAlpha(0.5))
        // fall through
      default:
        provider = new Cesium.OpenStreetMapImageryProvider({ url: 'https://tile.openstreetmap.org/' })
        break
    }
    viewer.imageryLayers.addImageryProvider(provider)
  } catch (err) {
    console.error('底图加载失败：', err)
  }
}

/** =========================
 *  Raster Layer (SingleTile)
 *  ========================= */
function addOrUpdateRasterLayer (vwr, { values, width, height, rectangle }) {
  const built  = rasterToCanvas(values, width, height)
  const canvas = built.canvas

  // 规范化经度 & 判断是否跨反日界
  const wrap = Cesium.Math.negativePiToPi
  const span = rectangle.east - rectangle.west
  let west = wrap(rectangle.west)
  let east = west + span
  const south = rectangle.south
  const north = rectangle.north

  // 移除旧图层
  removeAllRasterLayers()

  const url = canvas.toDataURL('image/png')

  if (east > Math.PI) {
    // ★ 跨反日界：拆成两片
    const leftRect  = new Cesium.Rectangle(west, south,  Math.PI,  north)
    const rightRect = new Cesium.Rectangle(-Math.PI, south, wrap(east), north)
    rasterLayers.push(
      vwr.imageryLayers.addImageryProvider(new Cesium.SingleTileImageryProvider({
        url, rectangle: leftRect,  tileWidth: width, tileHeight: height
      })),
      vwr.imageryLayers.addImageryProvider(new Cesium.SingleTileImageryProvider({
        url, rectangle: rightRect, tileWidth: width, tileHeight: height
      }))
    )
    vwr.camera.flyTo({ destination: CHINA_RECT, duration: 1.0 })
  } else {
    // 不跨界：轻微扩边，抹掉浮点缝
    const EPS = Cesium.Math.toRadians(1e-4)
    west -= EPS; east += EPS
    const rect = new Cesium.Rectangle(west, south, east, north)
    rasterLayers.push(
      vwr.imageryLayers.addImageryProvider(new Cesium.SingleTileImageryProvider({
        url, rectangle: rect, tileWidth: width, tileHeight: height
      }))
    )
    vwr.camera.flyTo({ destination: CHINA_RECT, duration: 1.0 })
  }

  vwr.scene.requestRender()
}

function removeAllRasterLayers () {
  if (!viewer || !rasterLayers.length) return
  try {
    rasterLayers.forEach(l => { try { viewer.imageryLayers.remove(l, true) } catch(_){} })
  } finally { rasterLayers = [] }
}

function rasterToCanvas (values, w, h) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(w, h)

  // 统计范围
  let min = Infinity, max = -Infinity
  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    if (v != null && !Number.isNaN(v)) {
      if (v < min) min = v
      if (v > max) max = v
    }
  }
  const clamp01 = (x) => (x < 0 ? 0 : (x > 1 ? 1 : x))

  // Nullschool 风格色带着色
  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    if (v == null || Number.isNaN(v)) { img.data[i * 4 + 3] = 0; continue }
    const t = clamp01((v - min) / (max - min || 1))
    const [r,g,b] = rampNullschool(t)
    img.data[i*4+0] = r
    img.data[i*4+1] = g
    img.data[i*4+2] = b
    img.data[i*4+3] = 255
  }

  // ★ 闭合经度接缝
  if (w > 1) {
    for (let y = 0; y < h; y++) {
      const i0 = (y * w + 0)     * 4
      const il = (y * w + (w-1)) * 4
      img.data[il]   = img.data[i0]
      img.data[il+1] = img.data[i0+1]
      img.data[il+2] = img.data[i0+2]
      img.data[il+3] = img.data[i0+3]
    }
  }

  ctx.putImageData(img, 0, 0)
  return { canvas }
}

/* ===== Nullschool 调色 ===== */
const NULLSCHOOL_STOPS = [
  { p: 0.00, c: '#081c2b' },
  { p: 0.15, c: '#163c6b' },
  { p: 0.30, c: '#1e6ea1' },
  { p: 0.45, c: '#1ba7a8' },
  { p: 0.60, c: '#3cc56b' },
  { p: 0.72, c: '#b4cf3a' },
  { p: 0.84, c: '#e58f2a' },
  { p: 0.92, c: '#d64b1a' },
  { p: 1.00, c: '#8f1d1d' }
]
function hex2rgb (hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return m ? [ parseInt(m[1],16), parseInt(m[2],16), parseInt(m[3],16) ] : [0,0,0]
}
function lerp(a, b, t) { return a + (b - a) * t }
function rampNullschool (t) {
  t = Math.max(0, Math.min(1, t))
  const stops = NULLSCHOOL_STOPS
  for (let i = 0; i < stops.length - 1; i++) {
    const s1 = stops[i], s2 = stops[i + 1]
    if (t >= s1.p && t <= s2.p) {
      const k  = (t - s1.p) / (s2.p - s1.p || 1)
      const c1 = hex2rgb(s1.c), c2 = hex2rgb(s2.c)
      return [
        Math.round(lerp(c1[0], c2[0], k)),
        Math.round(lerp(c1[1], c2[1], k)),
        Math.round(lerp(c1[2], c2[2], k))
      ]
    }
  }
  const c = hex2rgb(stops[stops.length - 1].c)
  return [c[0],c[1],c[2]]
}

/** =========================
 *  Boundaries Overlay (GeoJSON)
 *  ========================= */
function loadCityBoundaries (color, world) {
  if (!viewer) return
  color = color || Cesium.Color.WHITE.withAlpha(0.5)
  world = !!world

  fetch('/data/city.geojson')
    .then(res => res.json())
    .then(data => {
      data.features.forEach(feature => {
        const type = feature.geometry && feature.geometry.type
        const name = feature.properties && (feature.properties.市 || feature.properties.name || 'city')
        if (type === 'Polygon') {
          const coords = feature.geometry.coordinates[0]
          const positions = coords.map(xy => Cesium.Cartesian3.fromDegrees(xy[0], xy[1]))
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
            const positions = polyCoords[0].map(xy => Cesium.Cartesian3.fromDegrees(xy[0], xy[1]))
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
    .catch(err => console.error('加载城市边界失败：', err))

  if (world === true) {
    fetch('/data/world_countries.geojson')
      .then(res => res.json())
      .then(data => {
        data.features.forEach((feature, index) => {
          const type = feature.geometry && feature.geometry.type
          const name = (feature.properties && (feature.properties.ADMIN || feature.properties.name)) || ('country-' + index)
          if (type === 'Polygon') {
            const coords = feature.geometry.coordinates[0]
            const positions = coords.map(xy => Cesium.Cartesian3.fromDegrees(xy[0], xy[1]))
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
              const positions = polyCoords[0].map(xy => Cesium.Cartesian3.fromDegrees(xy[0], xy[1]))
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
      })
  }
}

function onHighlightCity(e) {
  if (!viewer) return
  const d = e?.detail || {}
  const name = String(d.name || '')
  const lat = Number(d.lat), lon = Number(d.lon)

  clearCityHighlight()
  // 在中心打一条文本（不依赖数据请求）
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    addCityLabel(lat, lon, name)
  }

  // 找同名的城市多边形，做高亮
  const matches = viewer.entities.values.filter(en => en?.polygon && String(en.name) === name)
  matches.forEach(ent => {
    highlightedPolys.push({
      entity: ent,
      material: ent.polygon.material?.getValue?.() || ent.polygon.material,
      outline:  ent.polygon.outline?.getValue?.(),
      outlineColor: ent.polygon.outlineColor?.getValue?.()
    })
    ent.polygon.material = Cesium.Color.YELLOW.withAlpha(0.18)
    ent.polygon.outline = true
    ent.polygon.outlineColor = Cesium.Color.YELLOW.withAlpha(0.9)
  })
  if (matches.length) viewer.scene.requestRender()
  const lbl = viewer.entities.getById('city-highlight-label')
  if (lbl) lbl.show = false
}

function clearCityHighlight () {
  if (!viewer || !highlightedPolys.length) return
  try {
    for (const h of highlightedPolys) {
      const ent = h.entity
      if (ent?.polygon) {
        ent.polygon.material = h.material
        if (h.outline !== undefined) ent.polygon.outline = h.outline
        if (h.outlineColor) ent.polygon.outlineColor = h.outlineColor
      }
    }
  } finally {
    highlightedPolys = []
    const lbl = viewer.entities.getById('city-highlight-label')
    if (lbl) viewer.entities.remove(lbl)
    viewer.scene.requestRender()
  }
}

function addCityLabel (lat, lon, text) {
  if (!viewer) return
  const id = 'city-highlight-label'
  const old = viewer.entities.getById(id)
  if (old) { try { viewer.entities.remove(old) } catch(e) {} }
  viewer.entities.add({
    id,
    position: Cesium.Cartesian3.fromDegrees(lon, lat),
    label: {
      text,
      font: 'bold 15px sans-serif',
      pixelOffset: new Cesium.Cartesian2(0, -18),
      fillColor: Cesium.Color.YELLOW,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      showBackground: true,
      backgroundPadding: new Cesium.Cartesian2(6, 4),
      style: Cesium.LabelStyle.FILL_AND_OUTLINE
    }
  })
}

/** =========================
 *  Legacy events (optional)
 *  ========================= */
function addGridAsSingleTile (grid, shape) {
  const rows = shape[0], cols = shape[1]
  const flat = grid.flat()
  const min = Math.min.apply(null, flat)
  const max = Math.max.apply(null, flat)

  const canvas = document.createElement('canvas')
  canvas.width = cols
  canvas.height = rows
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(cols, rows)

  for (let i = 0; i < flat.length; i++) {
    const v = flat[i]
    const c = ((v - min) / (max - min || 1)) * 255
    img.data.set([c, 0, 255 - c, 200], i * 4)
  }
  ctx.putImageData(img, 0, 0)

  viewer.imageryLayers.addImageryProvider(
    new Cesium.SingleTileImageryProvider({
      url: canvas.toDataURL(),
      rectangle: Cesium.Rectangle.fromDegrees(100, 0, 160, 60),
      tileWidth:  cols,
      tileHeight: rows
    })
  )
}

function addPointLabel (lat, lon, text) {
  if (!viewer) return
  const id = 'current-probe-label'
  const old = viewer.entities.getById(id)
  if (old) { try { viewer.entities.remove(old) } catch (e) {} }

  viewer.entities.add({
    id,
    position: Cesium.Cartesian3.fromDegrees(lon, lat),
    point: { pixelSize: 8, color: Cesium.Color.YELLOW },
    label: {
      text,
      font: '14px sans-serif',
      pixelOffset: new Cesium.Cartesian2(0, -20),
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      showBackground: true,
      backgroundPadding: new Cesium.Cartesian2(6, 4)
    }
  })
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(lon, lat, 600000),
    orientation: { heading: Cesium.Math.toRadians(0) },
    duration: 0.8
  })
}

function handleDataLoaded (evt) {
  const detail = (evt && evt.detail) ? evt.detail : {}
  const action    = detail.action
  const variables = detail.variables
  const params    = detail.params
  const data      = detail.data

  debugText.value = JSON.stringify({ action, variables, params }, null, 2)
  if (!variables || !variables.length) return

  const varName = variables[0]
  const payload = data && data[varName]
  if (!payload) return

  if (action === 'series') return
  if (action === 'levels') {
    const arr = payload.data
    const shape = payload.shape
    if (Array.isArray(arr) && Array.isArray(shape) && shape.length === 2) {
      addGridAsSingleTile(arr, shape)
    }
    return
  }
  if (action === 'positions') {
    if (params && params.lat != null && params.lon != null) {
      // 拼一段多行文本：变量名: 值
      const lines = (variables || []).map((n) => {
        const v = data?.[n]?.data
        return `${n}: ${v ?? '-'}`
      })
      const txt = `${params.lat.toFixed?.(2)}, ${params.lon.toFixed?.(2)}\n` + lines.join('\n')
      addPointLabel(params.lat, params.lon, txt)
     }
  }
}

/** =========================
 *  Helpers
 *  ========================= */
function clearDataLayer (opts) {
  const o = opts || {}
  const clearLabel  = !!o.clearLabel
  if (!viewer) return

  removeAllRasterLayers()

  if (clearLabel) {
    const old = viewer.entities.getById('current-probe-label')
    if (old) { try { viewer.entities.remove(old) } catch(e) {} }
  }
}

function enableClickProbe () {
  if (!viewer) return
  if (clickHandler) { try { clickHandler.destroy() } catch(e) {} }
  clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

  clickHandler.setInputAction((movement) => {
    if (typeof window !== 'undefined' && window.__probe_enabled !== true) return

    let cartesian = null
    if (viewer.scene.pickPositionSupported) {
      cartesian = viewer.scene.pickPosition(movement.position)
    }
    if (!cartesian) {
      const ray = viewer.camera.getPickRay(movement.position)
      if (ray) cartesian = viewer.scene.globe.pick(ray, viewer.scene)
    }
    if (!cartesian) return

    const carto = Cesium.Cartographic.fromCartesian(cartesian)
    const lon = Cesium.Math.toDegrees(carto.longitude)
    const lat = Cesium.Math.toDegrees(carto.latitude)
    if (!isFinite(lat) || !isFinite(lon)) return

    window.dispatchEvent(new CustomEvent('map-city-picked', { detail: { lat, lon, source: 'map-click' } }))
    addPointLabel(lat, lon, '定位中…')
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
}

window.addEventListener('map-probe-clear', () => {
  if (!viewer) return
  const old = viewer.entities.getById('current-probe-label')
  if (old) { try { viewer.entities.remove(old) } catch (e) {} }
  clearCityHighlight()
})

/** 兼容面板端主动刷新底图 */
function onMapRefreshLayers (e) {
  const layer = e?.detail?.layer || currentBaseLayerName || 'osm'
  if (layer) {
    currentBaseLayerName = layer
    applyLayer(layer)
  }
}

/** 兼容面板端广播的 layer 切换（不依赖路由） */
function onMapLayerSwitch (e) {
  const key = e?.detail?.key
  if (typeof key === 'string') {
    currentBaseLayerName = key
    applyLayer(key)
  }
}

/** =========================
 *  Viewer Factory
 *  ========================= */
function makeViewer (extra) {
  const base = {
    sceneModePicker: false,
    homeButton: false,
    baseLayerPicker: false,
    geocoder: false,
    animation: false,   // 关闭左下角控件，但时钟仍可推进
    timeline: false,    // 关闭底部时间轴 UI
    navigationHelpButton: false,
    creditContainer: document.createElement('div'),
    infoBox: false,
    selectionIndicator: false,
    imageryProvider: new Cesium.OpenStreetMapImageryProvider({
     url: 'https://tile.openstreetmap.org/'
   })
  }
  const v = new Cesium.Viewer('cesiumContainer', Object.assign({}, base, extra || {}))
  v.scene.skyBox = undefined
  v.scene.skyAtmosphere = undefined
  v.scene.globe.baseColor = Cesium.Color.TRANSPARENT
  v.scene.requestRenderMode = true
  v.scene.maximumRenderTimeChange = Infinity
  return v
}

function onMapClearAll () {
  clearDataLayer({ clearLabel: true }) // 清栅格&取点标签
  clearCityHighlight()                 // 清城市高亮&城市标签
  clearTyphoonEntities()               // 清台风路径/点/脉冲圈/HUD
  clearRiskOverlay()
  if (viewer) applyLayer(currentBaseLayerName || 'osm')
}

function valueToRiskColor(v, min, max) {
  const t = Math.max(0, Math.min(1, (v - min) / (max - min || 1)))
  // 蓝(低) → 橙(中) → 红(高)
  const stops = [
    {p:0.0, c:[  0, 80,200]},
    {p:0.5, c:[230,170, 30]},
    {p:1.0, c:[200, 40, 40]},
  ]
  let c = stops[stops.length-1].c
  for (let i=0;i<stops.length-1;i++){
    const a=stops[i], b=stops[i+1]
    if (t>=a.p && t<=b.p){
      const k=(t-a.p)/Math.max(1e-6,(b.p-a.p))
      c=[Math.round(a.c[0]+(b.c[0]-a.c[0])*k),
         Math.round(a.c[1]+(b.c[1]-a.c[1])*k),
         Math.round(a.c[2]+(b.c[2]-a.c[2])*k)]
      break
    }
  }
  return new Cesium.Color(c[0]/255, c[1]/255, c[2]/255, 0.65)
}

function onMapClearDataLayer () {
  // 仅清“数据变量”栅格与取点标签，不动台风/风险层
  clearDataLayer({ clearLabel: true })
}
function onRiskMapLoaded (e) {
  if (!viewer) return
  const d = e?.detail || {}
  const items = Array.isArray(d.items) ? d.items : []   // [{name, value}]
  const min = Number(d.min), max = Number(d.max)
  // 先清“数据变量”栅格和旧的风险叠加层
  clearDataLayer({ clearLabel: true })
  clearRiskOverlay()
  if (!items.length || !isFinite(min) || !isFinite(max)) {
    viewer.scene.requestRender()
    return
  }
  const valueMap = new Map(items.map(o => [String(o.name), Number(o.value)]))
  const now = viewer.clock?.currentTime
  for (const en of viewer.entities.values) {
    if (!en?.polygon || !en.name) continue
    const name = String(en.name)
    if (!valueMap.has(name)) continue
    const val = valueMap.get(name)
    const h0 = en.polygon.hierarchy
    const h = h0?.getValue?.(now) || h0
    const hierarchy = (h instanceof Cesium.PolygonHierarchy)
      ? h
      : new Cesium.PolygonHierarchy(h?.positions || h)
    const poly = viewer.entities.add({
      name: `RISK:${name}`,
      polygon: {
        height: 0,
        hierarchy,
        material: valueToRiskColor(val, min, max),
        outline: false
      },
      properties: { isRiskOverlay: true, riskValue: val }
    })
    riskOverlayEntities.push(poly)
  }
  viewer.scene.requestRender()
}
</script>

<style scoped>
/* HUD 样式 */
.typhoon-hud{
  position: absolute;
  right: 14px;
  top: 14px;
  min-width: 200px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(18, 20, 28, 0.55);
  backdrop-filter: blur(8px);
  box-shadow: 0 6px 18px rgba(0,0,0,.25), inset 0 0 0 1px rgba(255,255,255,.06);
  color: #e9eef5;
  font-size: 13px;
  line-height: 1.55;
}

.hud-title{
  font-weight: 700;
  letter-spacing: .5px;
  margin-bottom: 6px;
  color: #fff;
}

.hud-row{
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 3px 0;
  border-bottom: 1px dashed rgba(255,255,255,.08);
}
.hud-row:last-child{ border-bottom: none; }
.hud-row .k{ color: #9fb3c8; }
.hud-row .v{ color: #ffffff; font-variant-numeric: tabular-nums; }

</style>
