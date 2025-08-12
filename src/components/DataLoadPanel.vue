<template> 
  <div
    v-if="visible"
    class="control-panel"
    :class="{ collapsed }"
    :style="{ left: `${offsetLeft}px`, top: `calc(var(--topbar-height) + ${offsetTop}px)` }"
  >
    <!-- 拖动条 -->
    <div class="drag-bar" @mousedown="onMouseDown">
      <div class="grip"></div>
      <button class="collapse-btn" @click.stop="toggleCollapse">
        {{ collapsed ? '▲' : '▼' }}
      </button>
    </div>

    <!-- 主体内容（折叠时隐藏） -->
    <div v-show="!collapsed" class="panel-content">
      <!-- 操作类型 -->
      <section class="select-section py-3">
        <label class="section-title mb-1">操作类型</label>
        <select
          id="selection1"
          v-model="action"
          class="w-full p-2 rounded border text-sm"
          :style="{ backgroundColor: 'var(--select-bg)', color: 'var(--text-primary)'}"
        >
          <option value="levels">整层网格</option>
          <option value="positions">指定点</option>
          <option value="typhoon">专题变量</option>
        </select>
      </section>

      <section v-if="action === 'typhoon'" class="select-section">
        <h3 class="section-title">专题变量</h3>
        <ul class="var-list">
          <li
            :class="{ active: typhoonVar === 'track' }"
            @click="typhoonVar = 'track'"
          >
            台风路径
          </li>
          <li
            :class="{ active: typhoonVar === 'risk' }"
            @click="typhoonVar = 'risk'"
          >
            风险地图
          </li>
        </ul>

        <!-- 台风专用时间滑块（改变即触发获取路径，带防抖） -->
        <div class="mt-3">
          <label class="text-sm text-[var(--text-secondary)] mb-1 inline-block">
            时间: {{ typhoonTimeLabel }}
          </label>
          <input
            v-model.number="typhoonTime"
            type="range"
            min="0"
            :max="typhoonTimeMax"
            step="1"
            class="slider-range"
          />
        </div>

        <!-- 台风路径列表 + 状态 -->
        <div v-if="typhoonVar === 'track'" class="select-section mt-3">
          <div class="flex gap-3 items-center text-sm">
            <span v-if="trackLoading">加载中…</span>
            <span v-else class="opacity-70">共 {{ trackPoints.length }} 点</span>
            <span v-if="trackError" class="text-red-500">{{ trackError }}</span>
          </div>

          <!-- 结果列表（沿用“数据变量”的按钮样式 var-list） -->
          <ul v-if="trackPoints.length" class="var-list mt-3">
            <li v-for="(p,i) in trackPoints" :key="i">
              {{ i + 1 }}.
              {{ p.timeStr }} —
              {{ p.lat.toFixed(2) }}, {{ p.lon.toFixed(2) }}
              ｜MSL {{ (p.msl/100).toFixed(1) }} hPa
              ｜风速 {{ p.wind.toFixed(1) }} m/s
            </li>
          </ul>
        </div>
      </section>

      <!-- 变量输入 / 列表（动态项） -->
      <section
        v-else-if="vars.length && action !== 'typhoon'"
        class="select-section"
      >
        <h3 class="section-title">
          数据变量
          <span v-if="varsLoading" class="ml-1 text-xs animate-pulse">加载中…</span>
        </h3>
        <ul class="var-list">
          <li
            v-for="v in vars"
            :key="v"
            :class="{ active: selected.includes(v) }"
            @click="toggleVar(v)"
          >
            {{ displayVar(v) }}
          </li>
        </ul>
      </section>

      <section v-else-if="action !== 'typhoon'" class="select-section">
        <h3 class="section-title">变量名（手动输入 / 自动扫描）</h3>
        <div class="flex gap-2">
          <input
            id="input3"
            v-model="manualVar"
            class="bg-[var(--input-bg)]"
            placeholder="如: t2m"
            @keyup.enter="addManualVar"
            :disabled="probing"
          />
          <button class="load-btn" @click="probeVariables" :disabled="probing">{{ probing ? '扫描中…' : '自动扫描' }}</button>
        </div>
        <button class="load-btn w-full mt-2" @click="addManualVar" :disabled="!manualVar.trim() || probing">添加</button>
        <ul v-if="selected.length" class="var-list mt-3">
          <li v-for="v in selected" :key="v" class="active" @click="toggleVar(v)">{{ displayVar(v) }} ✖</li>
        </ul>
      </section>

      <!-- 参数（levels / positions） -->
      <section v-if="action === 'levels'" class="select-section space-y-4">
        <div>
          <label class="text-sm text-[var(--text-secondary)] mb-1 inline-block">时间: {{ timeIndex }}</label>
          <input
            v-model.number="timeIndex"
            type="range"
            min="0"
            :max="timeMax"
            step="1"
            class="slider-range"
          />
        </div>
        <div>
          <label class="text-sm text-[var(--text-secondary)] mb-1 inline-block">层数: {{ levelIndex }}</label>
          <input
            v-model.number="levelIndex"
            type="range"
            min="0"
            :max="levelMax"
            step="1"
            class="slider-range"
          />
        </div>
      </section>

      <section v-if="action === 'positions'" class="select-section grid gap-4">
        <div class="col-span-full">
          <label class="text-sm text-[var(--text-secondary)] mb-1 inline-block">选择城市</label>
          <select
            id="select2"
            class="w-full p-2 rounded border text-sm"
            :style="{ backgroundColor: 'var(--select-bg)', color: 'var(--text-primary)' }"
            @change="onCitySelect($event.target.value)"
          >
            <option disabled selected>请选择城市</option>
            <option v-for="c in cityOptions" :key="c.name" :value="c.name">
              {{ c.name }}
            </option>
          </select>
        </div>

        <div class="col-span-full">
          <label class="text-sm text-[var(--text-secondary)] mb-1 inline-block">时间: {{ timeIndex }}</label>
          <input
            v-model.number="timeIndex"
            type="range"
            min="0"
            :max="timeMax"
            step="1"
            class="slider-range"
          />
        </div>
        <div class="col-span-full">
          <label class="text-sm text-[var(--text-secondary)] mb-1 inline-block">层数: {{ levelIndex }}</label>
          <input
            v-model.number="levelIndex"
            type="range"
            min="0"
            :max="levelMax"
            step="1"
            class="slider-range"
          />
        </div>
      </section>

      <!-- 色带（渐变条始终在 DOM，切换用 v-show） -->
      <section v-show="action === 'levels'" class="select-section">
        <div class="legend-block">
          <div class="legend-header">
            <div class="legend-title">{{ legendTitle }}</div>
            <div class="legend-unit" v-if="legendUnit">（{{ legendUnit }}）</div>
          </div>
          <canvas ref="legendCanvas" width="220" height="12"></canvas>
          <div class="legend-scale">
            <span ref="legendMin">—</span>
            <span ref="legendMid">—</span>
            <span ref="legendMax">—</span>
          </div>
        </div>
      </section>

      <!-- 关闭 -->
      <button class="detail-btn" @click="close">
        <span class="icon">✖</span><span>关闭面板</span>
      </button>
    </div>
  </div>
</template>


<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDataStore } from '@/stores/dataStore'
const store = useDataStore()

const API_BASE = 'http://127.0.0.1:8000'

const router = useRouter()
const route  = useRoute()
const visible = computed(() => route.query.panel === 'data')

/* ============ UI & State ============ */
const cityOptions = ref([])
const collapsed   = ref(false)
const action      = ref('positions')

// 取点全局开关（positions 开，levels 关）
if (typeof window !== 'undefined') {
  window.__probe_enabled = action.value === 'positions'
}

const vars        = ref([])
const varsSet     = ref(new Set())          // ★ 用于快速判断后端是否有某变量
const varsLoading = ref(false)
const probing     = ref(false)
const selected    = ref([])
const manualVar   = ref('')
const loading     = ref(false)
const result      = ref('')
const error       = ref('')

// levels/positions 通用
const timeIndex   = ref(0)
const levelIndex  = ref(0)
const lat         = ref(28.50)
const lon         = ref(131.25)

const timeMax     = ref(100)
const levelMax    = ref(100)

// typhoon 专用时间（与 timeIndex 解耦）
const typhoonTime    = ref(0)
const typhoonTimeMax = ref(0)

/* ============ Legend ============ */
const legendCanvas = ref(null)
const legendMin = ref(null)
const legendMid = ref(null)
const legendMax = ref(null)
const legendTitle = ref('色带')
const legendUnit  = ref('')

const prevBaseLayer = ref(null)

/* ============ Labels / Display ============ */
const varLabels = {
  time: '时间',
  lon: '经度',
  lat: '纬度',
  level: '层级',
  static_z: '地形高度',
  static_slt: '陆地坡度',
  static_lsm: '陆地/海洋掩码',
  surf_2t: '地表 2 米温度',
  surf_10u: '地表 10 米东西风',
  surf_10v: '地表 10 米南北风',
  surf_msl: '海平面气压',
  surf_tp: '地表总降水量',
  surf_tp6h: '地表6小时总降水量',
  atmos_t: '高空温度',
  atmos_u: '高空东西风',
  atmos_v: '高空南北风',
  atmos_w: '高空垂直速度',
  atmos_q: '高空比湿',
  atmos_z: '高空位势高度',
  t2m: '2米温度',
  msl: '海平面气压',
  wind: '风速'
};
function displayVar (v) { return varLabels[v] || v }

/* ============ Drag (positioning) ============ */
const offsetLeft = ref(0)
const offsetTop  = ref(0)
let startX=0,startY=0,dragging=false
function onMouseDown(e){ dragging=true; startX=e.clientX-offsetLeft.value; startY=e.clientY-offsetTop.value;
  document.addEventListener('mousemove',onMouseMove); document.addEventListener('mouseup',onMouseUp)}
function onMouseMove(e){ if(!dragging)return; offsetLeft.value=e.clientX-startX; offsetTop.value=e.clientY-startY }
function onMouseUp(){ dragging=false; document.removeEventListener('mousemove',onMouseMove); document.removeEventListener('mouseup',onMouseUp) }
onBeforeUnmount(onMouseUp)

function toggleCollapse(){ collapsed.value=!collapsed.value }
function close(){
  const { panel, ...rest } = route.query
  collapsed.value = false; selected.value = []; result.value = ''; error.value = ''
 // 终止台风请求与防抖计时
  if (trackTimer.value) { clearTimeout(trackTimer.value); trackTimer.value = null }
  if (trackController.value) { try { trackController.value.abort() } catch(_) {} trackController.value = null }

  // 清面板内部台风数据
  trackPoints.value = []
  trackError.value = ''

  // 通知地图清空所有由数据面板加载的覆盖物（栅格、点标注、城市高亮、台风实体）
  window.dispatchEvent(new CustomEvent('map-probe-clear'))        // 清当前取点标签
  window.dispatchEvent(new CustomEvent('highlight-city', { detail: null }))
  window.dispatchEvent(new CustomEvent('map-clear-all'))          // ★ 统一总清
  router.replace({ path: route.path, query: rest })
}

/* ============ Lifecycle & Watchers ============ */
watch(action, async (val) => {
  selected.value = []
  fetchVars()
  if (val === 'positions') loadCities()

  // 同步取点开关
  if (typeof window !== 'undefined') {
    window.__probe_enabled = val === 'positions'
  }
  // 切到 levels：清刻度并让地图清除点标注 + 补绘色带
  if (val !== 'positions') {
    updateLegendLabels(NaN, NaN, legendTitle.value, legendUnit.value)
    window.dispatchEvent(new CustomEvent('map-probe-clear'))
    window.dispatchEvent(new CustomEvent('clear-city-highlight'))
    await nextTick()
    drawLegendGradient(legendTitle.value || '色带')
  }
})

// 面板从隐藏 -> 显示时补绘色带（仅在 levels）
watch(visible, async (v) => {
  if (v && action.value === 'levels') {
    await nextTick()
    drawLegendGradient(legendTitle.value || '色带')
  }
})

// typhoonTime 越界保护
watch(typhoonTimeMax, (m) => {
  if (Number.isFinite(m) && typhoonTime.value > m) typhoonTime.value = m
})

onMounted(async () => {
  if (visible.value) {
    await nextTick()
    drawLegendGradient('色带')   // 面板出现即绘制渐变
    fetchVars()
    loadCities()
  }
  window.addEventListener('map-city-picked', onMapPicked)

  // 初次同步一次开关
  if (typeof window !== 'undefined') {
    window.__probe_enabled = action.value === 'positions'
  }

  if (visible.value) {
    const cur = String(route.query?.layer || '')
    if (cur !== 'None') {
      router.replace({ path: route.path, query: { ...route.query, layer: 'None' } })
      nextTick(() => {
        window.dispatchEvent(new CustomEvent('map-refresh-layers', { detail: { layer: 'None' } }))
      })
    }
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('map-city-picked', onMapPicked)
})

// 仓库数据变化时（levels）仅更新刻度/标题
const rasterForCesium = computed(() => store.getCesiumRasterData && store.getCesiumRasterData())
watch(rasterForCesium, (val) => {
  if (!val || action.value !== 'levels') return
  const { values } = val
  const { min, max } = computeMinMax(values)
  const title = displayVar(selected.value[0] || '值')
  updateLegendLabels(min, max, title, currentUnit.value)
})

/* ============ Fetch vars / attributes / cities ============ */
async function fetchVars(){
  varsLoading.value=true; vars.value=[]
  try {
    const res = await fetch(`${API_BASE}/variables/list`)
    if (res.ok) {
      const j = await res.json()
      if (Array.isArray(j.variables) && j.variables.length) {
        vars.value = j.variables
        varsSet.value = new Set(j.variables)       // ★ 记录为 Set
      }
    }
    const attrRes = await fetch(`${API_BASE}/variables/attributes`)
    if (attrRes.ok) {
      const attr = await attrRes.json()
      timeMax.value = attr.attributes?.forecast_steps ?? 61
      levelMax.value = attr.attributes?.level_size ?? 7
      // 同步给 typhoon 时间条
      typhoonTimeMax.value = timeMax.value
      if (typhoonTime.value > typhoonTimeMax.value) typhoonTime.value = typhoonTimeMax.value
    }
  } catch (e) {
    console.warn('获取变量或属性失败', e)
  }
  varsLoading.value = false
}
async function probeVariables(){
  try { probing.value = true; await fetchVars() } finally { probing.value = false }
}
async function loadCities() {
  try {
    const res = await fetch('/data/city.geojson')
    const geojson = await res.json()
    cityOptions.value = geojson.features.map(f => {
      const props = f.properties
      const name = props['市'] || props.name || props.city || '未知'
      const [lonC, latC] = f.geometry.type === 'Point' ? f.geometry.coordinates : getCenter(f.geometry)
      return { name, lat: latC, lon: lonC }
    })
  } catch (e) { console.error('城市数据加载失败', e) }
}
function getCenter(geometry) {
  const coords = geometry.coordinates.flat(Infinity)
  const lons = coords.filter((_, i) => i % 2 === 0)
  const lats = coords.filter((_, i) => i % 2 === 1)
  const lon = (Math.min(...lons) + Math.max(...lons)) / 2
  const lat = (Math.min(...lats) + Math.max(...lats)) / 2
  return [lon, lat]
}

/* ============ Actions ============ */
function toggleVar (v) { 
  selected.value = [v]; loadData() 
}
function onCitySelect(name) {
  const city = cityOptions.value.find(c => c.name === name)
  if (city) {
    window.dispatchEvent(new CustomEvent('clear-city-highlight'))
    lat.value = city.lat
    lon.value = city.lon
    // 让 Cesium 高亮城市
    window.dispatchEvent(new CustomEvent('highlight-city', {
      detail: { name: city.name, lat: city.lat, lon: city.lon }
    }))
    // 若已有选中的变量，自动发起一次取数并在地图上打标签
    if (selected.value.length && !loading.value) {
      loadData()
    }
  }
}
function addManualVar () {
  const v = manualVar.value.trim()
  if (v && !selected.value.includes(v)) selected.value.push(v)
  manualVar.value = ''
}

/* ============ Typhoon Track (fetch & convert) ============ */
const typhoonVar   = ref('track')   // 供模板切换“台风路径/风险地图”
const typhoonTimeLabel = computed(() => {
  const idx = Number(typhoonTime.value)
  const pt  = trackPoints.value[idx]
  return pt ? pt.timeStr : idx            
})  
const trackLoading = ref(false)
const trackError   = ref('')
const trackPoints  = ref([])        // [{timeNs,timeMs,timeISO,timeStr,lat,lon,msl,wind}]
const lastTrack    = ref(null)      // 完整载荷缓存，供其它逻辑复用

// 风险地图状态
const riskLoading = ref(false)
const riskError   = ref('')
const riskItems   = ref([])         // [{name, value, lat, lon, wind, msl}]
const riskTimer   = ref(null)

// 防抖 & 请求取消
const trackTimer = ref(null)
const trackController = ref(null)
const DEBOUNCE_MS = 400

/** A. 工具：纳秒/毫秒/格式化 */
function nsToMs(ns)  { return Math.round(Number(ns) / 1e6) }
function nsToISO(ns) { return new Date(nsToMs(ns)).toISOString() }
function msToLocal(ms){ return new Date(ms).toLocaleString() }

/** B. 规范化后端数据结构（保证都是 number[]） */
function normalizeTrackApi(trackRaw) {
  const empty = { times: [], lats: [], lons: [], msls: [], winds: [] }
  if (!trackRaw || typeof trackRaw !== 'object') return empty
  const arrNum = (a) => Array.isArray(a) ? a.map(Number) : []
  return {
    times: arrNum(trackRaw.time),
    lats:  arrNum(trackRaw.lat),
    lons:  arrNum(trackRaw.lon),
    msls:  arrNum(trackRaw.msl),   // Pa
    winds: arrNum(trackRaw.wind),  // m/s
  }
}

/** C. 合并数组 -> 点列表（便于前端渲染 & 调试） */
function buildTrackPoints(trackArr) {
  const n = Math.min(
    trackArr.times.length,
    trackArr.lats.length,
    trackArr.lons.length,
    trackArr.msls.length,
    trackArr.winds.length
  )
  const pts = []
  for (let i = 0; i < n; i++) {
    const ns = trackArr.times[i]
    const ms = nsToMs(ns)
    pts.push({
      timeNs: ns,
      timeMs: ms,
      timeISO: nsToISO(ns),
      timeStr: msToLocal(ms),
      lat: trackArr.lats[i],
      lon: trackArr.lons[i],
      msl: trackArr.msls[i],   // Pa
      wind: trackArr.winds[i], // m/s
    })
  }
  return pts
}

/** D. 转 GeoJSON（给调试/可视化或外部导出用） */
function trackToGeoJSON(points) {
  const coords = points.map(p => [p.lon, p.lat])
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: coords },
      properties: {
        timesISO: points.map(p => p.timeISO),
        msls:     points.map(p => p.msl),
        winds:    points.map(p => p.wind),
      }
    }]
  }
}

/** E. 转 Cesium 友好载荷（折线 & 采样序列） */
function trackToCesiumPayload(points) {
  const positionsDegrees = []
  const timesISO = []
  const timesMs  = []
  const lats = [], lons = [], msls = [], winds = []

  for (const p of points) {
    positionsDegrees.push(p.lon, p.lat, 0)
    timesISO.push(p.timeISO)
    timesMs.push(p.timeMs)
    lats.push(p.lat); lons.push(p.lon)
    msls.push(p.msl); winds.push(p.wind)
  }

  return {
    points,
    positionsDegrees,
    timesISO, timesMs,
    lats, lons, msls, winds,
    geojson: trackToGeoJSON(points),
  }
}

/** F. 向外广播（供 Cesium 图层监听） */
function broadcastTrack(payload) {
  window.dispatchEvent(new CustomEvent('typhoon-track-loaded', { detail: payload }))
}

/** G. 拉取台风路径 */
async function fetchTrack() {
  if (trackController.value) {
    try { trackController.value.abort() } catch (_) {}
  }
  const controller = new AbortController()
  trackController.value = controller

  trackError.value = ''
  trackLoading.value = true
  try {
    const { lat: initLat, lon: initLon } = await getCurrentTyCenter()
    const initIdx = Number.isFinite(Number(typhoonTime.value)) ? Number(typhoonTime.value) : 0

    const res = await fetch(`${API_BASE}/variables/trackers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        init_lat: initLat,
        init_lon: initLon,
        init_time_index: initIdx,
      }),
      signal: controller.signal
    })
    if (!res.ok) {
      const txt = await res.text().catch(()=> '')
      throw new Error(txt || `HTTP ${res.status}`)
    }
    const json = await res.json()
    const norm = normalizeTrackApi(json)
    const pts  = buildTrackPoints(norm)

    trackPoints.value = pts
    const payload = trackToCesiumPayload(pts)
    lastTrack.value = payload
    broadcastTrack(payload)
  } catch (e) {
    if (e?.name === 'AbortError') {
      // 被取消的请求，不提示错误
    } else {
      console.error('[fetchTrack] error:', e)
      trackError.value = e?.message || '获取台风路径失败'
      trackPoints.value = []
    }
  } finally {
    trackLoading.value = false
    trackController.value = null
  }
}

/** ───── 获取当前活跃台风中心 ───── */
async function getCurrentTyCenter () {
  try {
    const res = await fetch(`${API_BASE}/variables/current`)
    if (!res.ok) throw new Error(res.statusText)
    const list = await res.json()
    if (Array.isArray(list) && list.length) {
      const first = list[0]
      const lat = parseFloat(first.lat ?? first.latitude ?? first.latitud ?? first.Lat ?? first.lat)
      const lon = parseFloat(first.lng ?? first.lon ?? first.longitude ?? first.Lon ?? first.lng)
      if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon }
    }
  } catch (e) { console.warn('[getCurrentTyCenter] fallback', e) }
  /** fallback（找不到就用固定点） */
  return { lat: 28.50, lon: 131.25 }
}
/** H. 防抖调度 */
function scheduleFetchTrack(delay = DEBOUNCE_MS) {
  if (trackTimer.value) {
    clearTimeout(trackTimer.value)
  }
  trackTimer.value = setTimeout(() => {
    if (action.value === 'typhoon' && typhoonVar.value === 'track') {
      fetchTrack()
    }
  }, delay)
}

// 1) 时间条变化 → 防抖获取
watch(typhoonTime, () => {
  if (action.value === 'typhoon' && typhoonVar.value === 'track') {
    scheduleFetchTrack()
  }
})

// 2) 切换到“台风路径” → 立即拉一次（不延迟）
watch(typhoonVar, (v) => {
  if (action.value === 'typhoon') {
    window.dispatchEvent(new CustomEvent('clear-city-highlight'))
    if (v === 'track') scheduleFetchTrack(0)
    if (v === 'risk') scheduleRisk(0)
  }
})

// 3) 进入“专题变量”页签时，如当前是路径 → 立即拉一次
watch(action, (a) => {
  if (a === 'typhoon' && typhoonVar.value === 'track') {
    scheduleFetchTrack(0)
  } else if (a === 'typhoon' && typhoonVar.value === 'risk') {
    scheduleRisk(0)
  }
})

watch(typhoonTime, () => {
  if (action.value === 'typhoon' && typhoonVar.value === 'risk') {
    scheduleRisk()
  }
})

watch(trackPoints, (pts) => {
  typhoonTimeMax.value = pts.length ? pts.length - 1 : 0
  // 超界保护
  if (typhoonTime.value > typhoonTimeMax.value) typhoonTime.value = typhoonTimeMax.value
})
/* -----------------------
 *  核心：风险地图变量解析
 * ----------------------*/
// 根据后端 variable list，解析可用名
function resolveAvailableName(list) {
  for (const n of list) if (varsSet.value.has(n)) return n
  return null
}
function resolveMSLName() {
  // 你的后端里是 surf_msl
  return resolveAvailableName(['surf_msl', 'msl', 'prmsl', 'mslp'])
}
function resolveWindSpec() {
  // 优先直接风速（如果将来后端提供）
  const direct = resolveAvailableName(['wind', 'wspd', 'wspd10m', 'windspeed', '10m_wind'])
  if (direct) return { type: 'direct', name: direct }
  // 使用 10 米风分量（你的后端提供的是 surf_10u / surf_10v）
  const u10 = resolveAvailableName(['surf_10u', 'u10', '10u'])
  const v10 = resolveAvailableName(['surf_10v', 'v10', '10v'])
  if (u10 && v10) return { type: 'uv', u: u10, v: v10 }
  // 兜底：高空分量
  const u = resolveAvailableName(['atmos_u', 'u'])
  const v = resolveAvailableName(['atmos_v', 'v'])
  if (u && v) return { type: 'uv', u, v }
  return null
}
async function getWindAtResolved(spec, lat, lon, tIdx, lvlIdx) {
  if (!spec) return NaN
  if (spec.type === 'direct') {
    return getVarAt(spec.name, lat, lon, tIdx, lvlIdx).catch(() => NaN)
  }
  if (spec.type === 'uv') {
    const [u, v] = await Promise.all([
      getVarAt(spec.u, lat, lon, tIdx, lvlIdx).catch(() => NaN),
      getVarAt(spec.v, lat, lon, tIdx, lvlIdx).catch(() => NaN),
    ])
    return (Number.isFinite(u) && Number.isFinite(v)) ? Math.hypot(u, v) : NaN
  }
  return NaN
}

async function getVarAt(name, lat, lon, tIdx, lvlIdx) {
  const res = await fetch(`${API_BASE}/variables/positions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, lat, lon, time_index: tIdx, level_index: lvlIdx })
  })
  const txt = await res.text()
  let json; try { json = JSON.parse(txt) } catch { json = txt }
  if (!res.ok) throw new Error((json && json.detail) || res.statusText)
  if (typeof json === 'number') return json
  if (json && typeof json.data === 'number') return json.data
  if (json && typeof json.value === 'number') return json.value
  if (Array.isArray(json) && typeof json[0] === 'number') return json[0]
  return NaN
}

/* ==== 新增：大圆距离（公里） ==== */
function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => d * Math.PI / 180
  const R = 6371
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/* ==== 重写：生成“台风风险”地图（带距离约束） ==== */
async function generateRiskMap () {
  riskError.value = ''
  riskLoading.value = true
  try {
    if (!cityOptions.value.length) await loadCities()

    // 若底图曾被 levels 切到 'None'，这里恢复一下，方便看叠加
    const cur = String(route.query?.layer || '')
    if (cur === 'None') {
      const restore = prevBaseLayer.value || 'osm'
      router.replace({ path: route.path, query: { ...route.query, layer: restore } })
      nextTick(() => {
        window.dispatchEvent(new CustomEvent('map-refresh-layers', { detail: { layer: restore } }))
      })
    }

    // 清掉“数据变量”的栅格（只清数据，不动台风）
    window.dispatchEvent(new CustomEvent('map-clear-data-layer'))

    // 确保存在台风路径（风险必须依赖路径中心）
    if (!lastTrack.value || !Array.isArray(lastTrack.value.lats) || !lastTrack.value.lats.length) {
      await fetchTrack().catch(() => {})
    }
    if (!lastTrack.value || !lastTrack.value.lats?.length) {
      riskError.value = '请先获取台风路径（或稍后再试）'
      riskItems.value = []
      return
    }

    // 取“当前时间档”的台风中心
    const tIdx = Number.isFinite(typhoonTime.value) ? Number(typhoonTime.value) : 0
    const ti   = Math.min(Math.max(tIdx, 0), lastTrack.value.lats.length - 1)
    const cLat = lastTrack.value.lats[ti]
    const cLon = lastTrack.value.lons[ti]

    // 距离权重（km）
    const R0   = 350   // 衰减半宽
    const RMAX = 900   // 超出直接记 0（非台风影响）
    const distWeight = (dKm) => (dKm > RMAX ? 0 : 1 / Math.exp( (dKm / R0) ** 2))

    // 变量自适配
    const mslName  = resolveMSLName()
    const windSpec = resolveWindSpec()
    if (!windSpec && !mslName) {
      riskError.value = '后端数据集中未找到气压/风速相关变量（如 surf_msl 或 10m 风分量）'
      riskItems.value = []
      return
    }

    const lvlIdx = 0

    // 先算距离，只对距离内的城市拉取数值
    const withDist = cityOptions.value.map(c => {
      const dKm = haversineKm(c.lat, c.lon, cLat, cLon)
      return { ...c, distKm: dKm, wDist: distWeight(dKm) }
    })
    const targets = withDist.filter(c => c.wDist > 0)

    if (!targets.length) {
      // 台风中心远离国内城市：全 0
      riskItems.value = withDist.map(c => ({ name: c.name, value: 0, lat: c.lat, lon: c.lon, wind: NaN, msl: NaN }))
      window.dispatchEvent(new CustomEvent('risk-map-loaded', {
        detail: { items: riskItems.value, min: 0, max: 1, unit: 'risk (0-1)' }
      }))
      return
    }

    // 拉取风/压（仅距离内）
    const rows = await Promise.all(
      targets.map(async (c) => {
        const [w, pPa] = await Promise.all([
          getWindAtResolved(windSpec, c.lat, c.lon, tIdx, lvlIdx).catch(() => NaN),
          mslName ? getVarAt(mslName, c.lat, c.lon, tIdx, lvlIdx).catch(() => NaN) : Promise.resolve(NaN),
        ])
        return { ...c, wind: w, msl: pPa }
      })
    )

    // —— 归一化（仅对“距离内且有值”的样本）——
    const wVals = rows.map(r => r.wind).filter(Number.isFinite)
    const pVals = rows.map(r => r.msl).filter(Number.isFinite)
    const wmin = Math.min(...wVals), wmax = Math.max(...wVals)
    const norm = (x, min, max) => {
      if (!Number.isFinite(x) || !Number.isFinite(min) || !Number.isFinite(max)) return NaN
      if (max - min < 1e-9) return 0.5
      return Math.max(0, Math.min(1, (x - min) / (max - min)))
    }

    // 低压异常基准（hPa）：1013 - msl(hPa)
    const lpVals = pVals.map(v => (1013 - v / 100)).filter(Number.isFinite)
    const lpMin = lpVals.length ? Math.min(...lpVals) : 0
    const lpMax = lpVals.length ? Math.max(...lpVals) : 1

    const ALPHA = 0.7  // 风速权重
    const BETA  = 0.3  // 低压权重

    const itemsInRange = rows.map(r => {
      const nw = Number.isFinite(r.wind) ? norm(r.wind, wmin, wmax) : NaN
      const msl_hPa = Number.isFinite(r.msl) ? (r.msl/100) : NaN
      const lp = Number.isFinite(msl_hPa) ? Math.max(0, 1013 - msl_hPa) : NaN
      const np = Number.isFinite(lp) ? norm(lp, lpMin, lpMax) : NaN

      const comp = (Number.isFinite(nw) ? ALPHA * nw : 0) + (Number.isFinite(np) ? BETA * np : 0)
      const score = r.wDist * comp  // ★ 距离权重锁定“台风相关”

      return { name: r.name, value: Number.isFinite(score) ? score : 0, lat: r.lat, lon: r.lon, wind: r.wind, msl: r.msl }
    })

    // 距离外城市归零
    const itemsOutRange = withDist
      .filter(c => c.wDist === 0)
      .map(c => ({ name: c.name, value: 0, lat: c.lat, lon: c.lon, wind: NaN, msl: NaN }))

    const items = [...itemsInRange, ...itemsOutRange]
    const finiteValues = items.map(i => i.value).filter(Number.isFinite)
    const min = finiteValues.length ? Math.min(...finiteValues) : 0
    const max = finiteValues.length ? Math.max(...finiteValues) : 1

    riskItems.value = items
    window.dispatchEvent(new CustomEvent('risk-map-loaded', {
      detail: { items, min, max, unit: 'risk (0-1)' }
    }))
  } catch (e) {
    console.error('[generateRiskMap]', e)
    riskError.value = e?.message || '风险地图生成失败'
  } finally {
    riskLoading.value = false
  }
}

function scheduleRisk(delay = DEBOUNCE_MS) {
  if (riskTimer.value) { clearTimeout(riskTimer.value); riskTimer.value = null }
  riskTimer.value = setTimeout(() => { generateRiskMap() }, delay)
}
/* ============ Build request ============ */
function buildRequest (name) {
  if (action.value === 'levels') {
    return { url: `${API_BASE}/variables/levels`, body: { name, time_index: timeIndex.value, level_index: levelIndex.value } }
  }
  return { url: `${API_BASE}/variables/positions`, body: { name, lat: lat.value, lon: lon.value, time_index: timeIndex.value, level_index: Number(levelIndex.value) } }
}

/* ============ Normalize helpers ============ */
function normalizeGrid(input) {
  if (Array.isArray(input) && Array.isArray(input[0])) return input
  if (Array.isArray(input)) return input
  if (input && Array.isArray(input.data)) return input.data
  if (input && input.values) {
    const v = input.values
    return ArrayBuffer.isView(v) ? Array.from(v) : v
  }
  if (ArrayBuffer.isView(input) && input.length) return Array.from(input)
  return null
}
function normalizeResponse(raw, fallBackName) {
  let name = (raw && raw.name) ? String(raw.name) : String(fallBackName || 'unnamed')
  let data = (raw && raw.data != null) ? raw.data : (raw && raw.values != null ? raw.values : raw)
  if (!Array.isArray(data) && !ArrayBuffer.isView(data) && raw && fallBackName && raw[fallBackName] != null) {
    name = String(fallBackName); data = raw[fallBackName]
  }
  const arr = normalizeGrid(data)
  return { name, data: arr, params: raw && raw.params ? raw.params : null }
}
function computeMinMax(values) {
  let min = Infinity, max = -Infinity
  const arr = Array.isArray(values[0]) ? values.flat() : values
  for (let i=0; i<arr.length; i++) {
    const v = arr[i]
    if (v == null || Number.isNaN(v)) continue
    if (v < min) min = v
    if (v > max) max = v
  }
  if (!isFinite(min) || !isFinite(max)) return { min: NaN, max: NaN }
  return { min, max }
}

/* ============ Load data & push to store ============ */
const currentUnit = ref('')
function unitFromParams(p){ return p?.unit || p?.units || '' }

async function loadData () {
  error.value = ''
  result.value = ''

  try {
    const cur = String(route.query?.layer || '')
    if (cur !== 'None') {
      prevBaseLayer.value = cur || 'osm'
      const q = Object.assign({}, route.query, { layer: 'None' })
      router.replace({ path: route.path, query: q })
      // 兼容：如有地方用事件监听，也广播一次
      window.dispatchEvent(new CustomEvent('map-layer-switch', { detail: { key: 'None' } }))
    }
  } catch (e) { /* ignore */ }

  const names = Array.isArray(selected.value) ? selected.value : [selected.value]
  if (!names.length || !names[0]) { error.value = '请先选择或输入变量名'; return }

  loading.value = true
  try {
    const headers = { 'Content-Type': 'application/json' }
    const tasks = names.map((name) => {
      const { url, body } = buildRequest(name)
      return fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
        .then(async (res) => {
          const txt = await res.text()
          let data; try { data = JSON.parse(txt) } catch { data = txt }
          return res.ok ? { ok: true, name, data } : { ok: false, name, detail: (data && data.detail) || txt || res.statusText }
        })
        .catch((e) => ({ ok: false, name, detail: e.message || String(e) }))
    })

    const settled = await Promise.all(tasks)
    const okList  = settled.filter(t => t.ok)
    const failList = settled.filter(t => !t.ok)

    if (okList.length) {
      // ---- positions：点值 ----
      if (action.value === 'positions') {
        const posDict = Object.fromEntries(
          okList.map(o => {
            const raw = o.data
            let val = null
            if (typeof raw === 'number') val = raw
            else if (raw && typeof raw.data === 'number') val = raw.data
            else if (raw && typeof raw.value === 'number') val = raw.value
            else if (Array.isArray(raw) && typeof raw[0] === 'number') val = raw[0]
            return [o.name, { data: val }]
          })
        )
        window.dispatchEvent(new CustomEvent('data-loaded', {
          detail: {
            action: 'positions',
            variables: names,
            params: { lat: Number(lat.value), lon: Number(lon.value), time_index: Number(timeIndex.value), level_index: Number(levelIndex.value) },
            data: posDict
          }
        }))
        result.value = posDict
        // 保留渐变，仅清刻度
        updateLegendLabels(NaN, NaN, legendTitle.value, legendUnit.value)
        return
      }

      // ---- levels：整层栅格 ----
      result.value = Object.fromEntries(okList.map(o => [o.name, o.data]))
      const primaryName    = names[0]
      const primaryRaw     = (result.value[primaryName] != null) ? result.value[primaryName] : okList[0].data
      const primaryVarName = (result.value[primaryName] != null) ? primaryName : okList[0].name

      const norm = normalizeResponse({ name: primaryVarName, data: primaryRaw }, primaryVarName)
      if (!norm.data) throw new Error('后端返回的 data 不是可识别的数组/二维数组/TypedArray 形状')

      store.setRawData(norm)
      store.datatransform()

      const stats = store.getRasterStatistics ? store.getRasterStatistics() : null
      const { min, max } = (stats && isFinite(stats.min) && isFinite(stats.max)) ? { min: stats.min, max: stats.max } : computeMinMax(norm.data)
      currentUnit.value = unitFromParams(norm.params)
      const title = displayVar(primaryVarName)
      updateLegendLabels(min, max, title, currentUnit.value)

      const shape = Array.isArray(norm.data[0]) ? `${norm.data.length}x${norm.data[0].length}` : norm.data.length
      console.log('[DataLoadPanel] loaded =>', norm.name, 'shape:', shape)
    }

    if (failList.length) {
      const msg = failList.map(f => `${f.name}: ${f.detail}`).join('\n')
      console.warn('[DataLoadPanel] 加载失败：\n' + msg)
      if (!okList.length) { result.value = {}; updateLegendLabels(NaN, NaN, legendTitle.value, legendUnit.value) }
    }
  } catch (e) {
    console.error('数据请求失败:', e)
    error.value = '错误: ' + e
    updateLegendLabels(NaN, NaN, legendTitle.value, legendUnit.value)
  } finally {
    loading.value = false
  }
}

/* ============ Legend 绘制/更新 ============ */
/** 深色低亮度色带：#0b1e5b → #0b6b6b → #6b6b0b → #6b0b0b */
function rampDark(t) {
  t = Math.max(0, Math.min(1, t))
  const stops = [
    [0.00, [0x0b,0x1e,0x5b]],
    [0.33, [0x0b,0x6b,0x6b]],
    [0.66, [0x6b,0x6b,0x0b]],
    [1.00, [0x6b,0x0b,0x0b]],
  ]
  for (let i = 0; i < stops.length - 1; i++) {
    const [p1, c1] = stops[i]
    const [p2, c2] = stops[i + 1]
    if (t >= p1 && t <= p2) {
      const k = (t - p1) / (p2 - p1 || 1)
      return [
        Math.round(c1[0] + (c2[0] - c1[0]) * k),
        Math.round(c1[1] + (c2[1] - c1[1]) * k),
        Math.round(c1[2] + (c2[2] - c1[2]) * k),
      ]
    }
  }
  return stops[stops.length - 1][1]
}

/** A. 面板出现/显示时绘制渐变条 */
function drawLegendGradient(initialTitle = '色带') {
  const cvs = legendCanvas.value
  if (!cvs) { requestAnimationFrame(() => drawLegendGradient(initialTitle)); return }
  const ctx = cvs.getContext('2d')
  const w = cvs.width, h = cvs.height
  const img = ctx.createImageData(w, h)
  for (let x = 0; x < w; x++) {
    const t = x / (w - 1)
    const [r,g,b] = rampDark(t)
    for (let y = 0; y < h; y++) {
      const i = (y * w + x) * 4
      img.data[i]   = r
      img.data[i+1] = g
      img.data[i+2] = b
      img.data[i+3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  legendTitle.value = initialTitle
  if (legendMin.value) legendMin.value.textContent = '—'
  if (legendMid.value) legendMid.value.textContent = '—'
  if (legendMax.value) legendMax.value.textContent = '—'
}

/** B. 数据到达时，仅更新刻度/标题/单位 */
function updateLegendLabels(min, max, title = '色带', unit='') {
  legendTitle.value = title
  legendUnit.value  = unit
  if (legendMin.value) legendMin.value.textContent = Number.isFinite(min) ? min.toFixed(2) : '—'
  if (legendMax.value) legendMax.value.textContent = Number.isFinite(max) ? max.toFixed(2) : '—'
  if (legendMid.value) {
    const mid = (Number(min) + Number(max)) / 2
    legendMid.value.textContent = Number.isFinite(mid) ? mid.toFixed(2) : '—'
  }
}

/* ============ Map pick 同步（levels 下忽略点击） ============ */
function onMapPicked (e) {
  if (action.value !== 'positions') return
  const d = e && e.detail ? e.detail : {}
  if (!isFinite(d.lat) || !isFinite(d.lon)) return
  lat.value = Number(d.lat.toFixed(4))
  lon.value = Number(d.lon.toFixed(4))
  if (Array.isArray(selected.value) && selected.value.length && !loading.value) loadData()
}
</script>

<style scoped>
/************************ 面板 *************************/
.control-panel {
  width: 340px;
  background: var(--bg-primary);
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 6px var(--shadow-color);
  position: absolute;
  top: var(--topbar-height);
  margin: 20px 0;
  max-height: calc(100% - var(--topbar-height) - 40px);
  left: 0;
  display: block;
  z-index: 3000;
  border-radius: 12px;
  opacity: 0.92;
}
.control-panel.collapsed { pointer-events: auto; }

/************************ 拖动条 *************************/
.drag-bar {
  height: 28px; display: flex; align-items: center; justify-content: space-between;
  padding: 0 8px; cursor: move;
}
.grip { width: 44px; height: 4px; border-radius: 2px; background: var(--border-color); opacity: 0.6; transition: background 0.2s, transform 0.15s; }
.drag-bar:hover .grip { background: var(--primary, #2d8cf0); }
.drag-bar:active .grip { background: var(--primary, #2d8cf0); transform: scaleX(1.3); }
.collapse-btn { background: transparent; border: none; color: var(--text-secondary); font-size: 14px; cursor: pointer; user-select: none; }

/************************ 内容区域 *************************/
.panel-content { padding: 20px 20px 22px; display: flex; flex-direction: column; gap: 20px; overflow-y: auto; }

/************************ 变量选择 *************************/
.select-section {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 15px;
  box-shadow: 0 2px 6px var(--shadow-color);
}
.section-title { margin: 0 0 12px; font-size: 1rem; color: var(--text-secondary); }
.var-list { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.var-list li {
  padding: 6px 8px; border-radius: 8px; background: var(--input-bg); cursor: pointer; text-align: center;
  transition: background 0.2s; color: var(--text-primary); user-select: none; font-size: 0.9rem;
}
.var-list li:hover { background: var(--hover-bg); }
.var-list li.active { background: var(--active-bg); font-weight: 600; }

/************************ 按钮 *************************/
.load-btn {
  padding: 8px 14px; background: var(--primary, #2d8cf0); color: #fff; height:40px;
  border: none; border-radius: 10px; cursor: pointer; transition: background 0.25s, transform 0.2s;
}
.load-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.load-btn:not(:disabled):hover { background: #1b6cd5; transform: translateY(-1px); }

/************************ 结果显示 *************************/
.result-display {
  background: #111827; color: #7fffb0; padding: 12px; border-radius: 10px; overflow-x: auto; max-height: 50vh;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

/************************ 关闭按钮 *************************/
.detail-btn {
  margin-top: auto; width: 100%; padding: 12px; background: var(--bg-secondary); border: none;
  border-radius: 12px; color: var(--text-primary); font-size: 1rem; font-weight: 500;
  display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;
  transition: all 0.3s; box-shadow: 0 2px 6px var(--shadow-color);
}
.detail-btn:hover { background: #ff4a4a; color: #fff; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(255,74,74,.3); }
.detail-btn .icon{ font-size:1.2rem; }

/************************ slider *************************/
.slider-range { display: block; width: 100%; margin: 12px 0; }
.slider-range::-webkit-slider-thumb {
  appearance: none; width: 14px; height: 14px; border-radius: 50%; background: var(--primary, #2d8cf0);
  cursor: pointer; border: 2px solid var(--bg-primary); margin-top: -5px; transition: background 0.2s;
}
.slider-range::-webkit-slider-thumb:hover { background: #1b6cd5; }
.slider-range::-moz-range-thumb {
  width: 14px; height: 14px; border-radius: 50%; background: var(--primary, #2d8cf0);
  border: 2px solid var(--bg-primary); cursor: pointer; transition: background 0.2s;
}
.slider-range::-moz-range-thumb:hover { background: #1b6cd5; }

/************************ legend（色带） *************************/
.legend-block { display:flex; flex-direction: column; gap: 8px; }
.legend-header { display:flex; align-items:center; gap:6px; color: var(--text-secondary); }
.legend-title { font-weight: 600; color: var(--text-primary); }
.legend-unit { font-size: 12px; opacity: .85; }
.legend-scale {
  display: flex; justify-content: space-between; color: #cfcfcf;
  font-variant-numeric: tabular-nums; font-size: 12px;
}
.legend-block canvas {
  display: block; width: 100%; height: 12px; border-radius: 2px;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.05);
}

/************************ 选择器样式 *************************/
#selection1{ border-radius: 4px; width: 100px; margin-left: 10px; height: 35px; }
#selection1:hover{ transform: scale(1.03); transition: transform 0.1s ease; }
#selection1:active{ transform: scale(0.9); transition: transform 0.3s ease; }
#select2{ border-radius: 4px; width: 150px; margin-left: 10px; }
#select2:hover{ transform: scale(1.03); transition: transform 0.1s ease; }
#select2:active{ transform: scale(0.9); transition: transform 0.3s ease; }
#input1, #input2{
  background-color: var(--input-bg); border: 1px solid var(--border-color); width: 270px;
  border-radius: 4px; margin-top: 4px; font-size: 14px; color: var(--text-primary); transition: box-shadow 0.2s;
}
#input3{ border-radius: 12px; height: 40px }
</style>
