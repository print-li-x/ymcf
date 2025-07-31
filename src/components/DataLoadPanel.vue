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
      <!-- 操作类型（下拉框） -->
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
        </select>
      </section>

      <!-- 变量输入 / 列表 -->
      <section v-if="vars.length" class="select-section">
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

        <!-- ✅ 加载按钮放这里 -->
        <div v-if="selected.length" class="flex justify-end mt-3">
          <button class="load-btn" @click="loadData" :disabled="loading">
            {{ loading ? '加载中…' : '加载数据' }}
          </button>
        </div>
      </section>

      <section v-else class="select-section">
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

      <!-- 额外参数 -->
      <section v-if="action === 'levels'" class="select-section space-y-4">
        <div>
          <label class="text-sm text-[var(--text-secondary)] mb-1 inline-block">时间: {{ timeIndex }}</label>
          <input
            v-model.number="timeIndex"
            type="range"
            min="0"
            :max="timeMax"
            step="1"
            class="w-full h-1 rounded bg-[var(--border-color)] appearance-none slider-range"
            :style="{marginleft:'20px'}"
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
            class="w-full h-1 rounded bg-[var(--border-color)] appearance-none slider-range"
          />
        </div>
      </section>
      <!-- 此处要改 -->
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
          <n-input id='input1' v-model="lat" placeholder="纬度" />
          <n-input id='input2' v-model="lon" placeholder="经度" />
        <div class="col-span-full">
          <label class="text-sm text-[var(--text-secondary)] mb-1 inline-block">时间: {{ timeIndex }}</label>
          <input
            v-model.number="timeIndex"
            type="range"
            min="0"
            :max="timeMax"
            step="1"
            class="w-full h-1 rounded bg-[var(--border-color)] appearance-none slider-range"
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
            class="w-full h-1 rounded bg-[var(--border-color)] appearance-none slider-range"
          />
        </div>
      </section>

      <!-- 错误 & 结果 -->
      <section v-if="error" class="text-red-600 whitespace-pre-wrap">{{ error }}</section>

      <!-- 关闭 -->
      <button class="detail-btn" @click="close"><span class="icon">✖</span><span>关闭面板</span></button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const API_BASE = 'http://127.0.0.1:8000'

const router = useRouter()
const route  = useRoute()
const visible = computed(() => route.query.panel === 'data')
const cityOptions = ref([])

const collapsed   = ref(false)
const action      = ref('positions')

const vars        = ref([])
const varsLoading = ref(false)
const probing     = ref(false)
const selected    = ref([])
const manualVar   = ref('')
const loading     = ref(false)
const result      = ref('')
const error       = ref('')

const timeIndex   = ref(0)
const levelIndex  = ref(0)
const lat         = ref(null)
const lon         = ref(null)

const timeMax     = ref(100)
const levelMax    = ref(100)

const varLabels = {
  'time': '时间',
  'lat': '纬度',
  'lon': '经度',
  'level': '层级',
  't2m': '2米温度',
  'msl': '海平面气压',
  'wind': '风速',
  'surf_2t': '地表 2 米温度',
  'surf_10u': '地表 10 米东西风',
  'surf_10v': '地表 10 米南北风',
  'surf_msl': '海平面气压',
  'atmos_t': '高空温度',
  'atmos_u': '高空东西风',
  'atmos_v': '高空南北风',
  'atmos_q': '高空比湿',
  'atmos_z': '高空位势高度',
  'static_z': '地形高度',
  'static_slt': '陆地坡度',
  'static_lsm': '陆地/海洋掩码'
}

function displayVar (v) {
  return varLabels[v] || v
}

const offsetLeft = ref(0)
const offsetTop  = ref(0)
let startX=0,startY=0,dragging=false
function onMouseDown(e){ dragging=true; startX=e.clientX-offsetLeft.value; startY=e.clientY-offsetTop.value;
  document.addEventListener('mousemove',onMouseMove); document.addEventListener('mouseup',onMouseUp)}
function onMouseMove(e){ if(!dragging)return; offsetLeft.value=e.clientX-startX; offsetTop.value=e.clientY-startY }
function onMouseUp(){ dragging=false; document.removeEventListener('mousemove',onMouseMove); document.removeEventListener('mouseup',onMouseUp) }
onBeforeUnmount(onMouseUp)

function toggleCollapse(){ collapsed.value=!collapsed.value }
function close(){ const {panel,...rest}=route.query; router.replace({path:route.path,query:rest}); collapsed.value=false; selected.value=[]; result.value=''; error.value='' }

async function fetchVars(){
  varsLoading.value=true;
  vars.value=[]
  try {
    const res = await fetch(`${API_BASE}/variables/list`)
    if (res.ok) {
      const j = await res.json()
      if (Array.isArray(j.variables) && j.variables.length) {
        vars.value = j.variables
      }
    }

    const attrRes = await fetch(`${API_BASE}/variables/attributes`)
    if (attrRes.ok) {
      const attr = await attrRes.json()
      timeMax.value = attr.attributes?.forecast_steps || 100
      levelMax.value = attr.attributes?.level_size || 100
    }
  } catch (e) {
    console.warn('获取变量或属性失败', e)
  }
  varsLoading.value = false
}

// const PROBE_CANDIDATES = ['time', 'lat', 'lon', 'level']
// async function probeVariables () {
//   if (action.value !== 'series') return
//   probing.value = true
//   error.value = ''
//   try {
//     const headers = { 'Content-Type': 'application/json' }
//     const tasks = PROBE_CANDIDATES.map((name) =>
//       fetch(`${API_BASE}/variables/series`, {
//         method: 'POST',
//         headers,
//         body: JSON.stringify({ name })
//       })
//         .then((r) => (r.ok ? name : null))
//         .catch(() => null)
//     )
//     const res = await Promise.all(tasks)
//     vars.value = res.filter(Boolean)
//     if (!vars.value.length) error.value = '扫描未发现可用坐标，请手动输入'
//   } finally {
//     probing.value = false
//   }
// }

watch(action, () => {
  selected.value = []
  fetchVars()
  if (action.value === 'positions') {
    loadCities()
  }
})

onMounted(() => {
  if (visible.value) {
    fetchVars()
    loadCities()
  }

  window.addEventListener('map-city-picked', (e) => {
    lat.value = e.detail.lat
    lon.value = e.detail.lon
  })
})

function toggleVar (v) {
  selected.value = [v]
}
function onCitySelect(name) {
  const city = cityOptions.value.find(c => c.name === name)
  if (city) {
    lat.value = city.lat
    lon.value = city.lon
  }
}

function addManualVar () {
  const v = manualVar.value.trim()
  if (v && !selected.value.includes(v)) selected.value.push(v)
  manualVar.value = ''
}

function buildRequest (name) {
  // if (action.value === 'series') {
  //   return { url: `${API_BASE}/variables/series`, body: { name } }
  // }
  if (action.value === 'levels') {
    return {
      url: `${API_BASE}/variables/levels`,
      body: { name, time_index: timeIndex.value, level_index: levelIndex.value }
    }
  }
  return {
    url: `${API_BASE}/variables/positions`,
    body: {
      name,
      lat: lat.value,
      lon: lon.value,
      time_index: timeIndex.value,
      level_index: levelIndex.value
    }
  }
}

async function loadData () {
  error.value = ''
  result.value = ''
  if (!selected.value.length) {
    error.value = '请先选择或输入变量名'
    return
  }
  loading.value = true
  try {
    const headers = { 'Content-Type': 'application/json' }
    const tasks = selected.value.map((name) => {
      const { url, body } = buildRequest(name)
      return fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })
        .then(async (res) => {
          const txt = await res.text()
          let data
          try { data = JSON.parse(txt) } catch { data = txt }
          return res.ok
            ? { ok: true, name, data }
            : { ok: false, name, detail: data.detail || txt || res.statusText }
        })
        .catch((e) => ({ ok: false, name, detail: e.message || String(e) }))
    })

    const settled = await Promise.all(tasks)
    const okList = settled.filter((t) => t.ok)
    const failList = settled.filter((t) => !t.ok)

    if (okList.length) {
      const payload = Object.fromEntries(okList.map(o => [o.name, o.data]))
      alert(`${varLabels[selected.value]} 加载成功`)
    }
    if (failList.length) {
      alert(`${varLabels[selected.value]} 加载失败`)
    }
  } finally {
    loading.value = false
  }
}

async function loadCities() {
  try {
    const res = await fetch('/data/city.geojson') 
    const geojson = await res.json()
    cityOptions.value = geojson.features.map(f => {
      const props = f.properties
      const name = props["市"] || props.name || props.city || '未知'
      const [lon, lat] = f.geometry.type === 'Point'
        ? f.geometry.coordinates
        : getCenter(f.geometry)
      console.log('加载到的 GeoJSON:', geojson)
      return { name, lat, lon }
    })
  } catch (e) {
    console.error('城市数据加载失败', e)
  }
}

function getCenter(geometry) {
  const coords = geometry.coordinates.flat(Infinity)
  const lons = coords.filter((_, i) => i % 2 === 0)
  const lats = coords.filter((_, i) => i % 2 === 1)
  const lon = (Math.min(...lons) + Math.max(...lons)) / 2
  const lat = (Math.min(...lats) + Math.max(...lats)) / 2
  return [lon, lat]
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
.control-panel.collapsed {
  pointer-events: auto; /* 保持拖动与展开 */
}

/************************ 拖动条 *************************/
.drag-bar {
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  cursor: move;
}
.grip {
  width: 44px;
  height: 4px;
  border-radius: 2px;
  background: var(--border-color);
  opacity: 0.6;
  transition: background 0.2s, transform 0.15s;
}
.drag-bar:hover .grip {
  background: var(--primary, #2d8cf0);
}
.drag-bar:active .grip {
  background: var(--primary, #2d8cf0);
  transform: scaleX(1.3);
}
.collapse-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  user-select: none;
}

/************************ 内容区域 *************************/
.panel-content {
  padding: 20px 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
}

/************************ 变量选择 *************************/
.select-section {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 15px;
  box-shadow: 0 2px 6px var(--shadow-color);
}
.section-title {
  margin: 0 0 12px;
  font-size: 1rem;
  color: var(--text-secondary);
}
.var-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.var-list li {
  padding: 6px 8px;
  border-radius: 8px;
  background: var(--input-bg);
  cursor: pointer;
  text-align: center;
  transition: background 0.2s;
  color: var(--text-primary);
  user-select: none;
  font-size: 0.9rem;
}
.var-list li:hover {
  background: var(--hover-bg);
}
.var-list li.active {
  background: var(--active-bg);
  font-weight: 600;
}

/************************ 加载按钮 *************************/
.load-btn {
  padding: 8px 14px;
  background: var(--primary, #2d8cf0);
  color: #fff;
  height:40px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.25s, transform 0.2s;

}
.load-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.load-btn:not(:disabled):hover {
  background: #1b6cd5;
  transform: translateY(-1px);
}

/************************ 结果显示 *************************/
.result-display {
  background: #111827;
  color: #7fffb0;
  padding: 12px;
  border-radius: 10px;
  overflow-x: auto;
  max-height: 50vh;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

/************************ 空提示 *************************/
.empty-tip {
  color: var(--text-secondary);
  font-size: 0.95rem;
  text-align: center;
  margin-top: 40px;
}

/************************ 关闭按钮 *************************/
.detail-btn {
  margin-top: auto;
  width: 100%;
  padding: 12px;
  background: var(--bg-secondary);
  border: none;
  border-radius: 12px;
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 6px var(--shadow-color);
}
.detail-btn:hover {
  background: #ff4a4a;
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255,74,74,.3);
}
.detail-btn .icon{
  font-size:1.2rem;
}

/************************ slider 自定义轨道、拇指 *************************/
.slider-range {
  display: block;
  width: 100%;
  margin: 12px 0;
}

.slider-range::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--primary, #2d8cf0);
  cursor: pointer;
  border: 2px solid var(--bg-primary);
  margin-top: -5px;
  transition: background 0.2s;
}

.slider-range::-webkit-slider-thumb:hover {
  background: #1b6cd5;
}

.slider-range::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--primary, #2d8cf0);
  border: 2px solid var(--bg-primary);
  cursor: pointer;
  transition: background 0.2s;
}

.slider-range::-moz-range-thumb:hover {
  background: #1b6cd5;
}

#selection1{
  border-radius: 4px;
  width: 100px;
  margin-left: 10px;
  height: 35px;
}
#selection1:hover{
  transform: scale(1.03);
  transition: transform 0.1s ease;
}
#selection1:active{
  transform: scale(0.9);
  transition: transform 0.3s ease;
}
#select2{
  border-radius: 4px;
  width: 150px;
  margin-left: 10px;
}
#select2:hover{
  transform: scale(1.03);
  transition: transform 0.1s ease;
}
#select2:active{
  transform: scale(0.9);
  transition: transform 0.3s ease;
}
#input1{
  background-color: var(--input-bg); 
  border: 1px solid var(--border-color); 
  width: 270px;
  border-radius: 4px; 
  margin-top: 4px;  
  font-size: 14px;
  color: var(--text-primary);
  transition: box-shadow 0.2s;
}
#input2{
  background-color: var(--input-bg); 
  border: 1px solid var(--border-color); 
  width: 270px;
  border-radius: 4px; 
  margin-top: 4px;  
  font-size: 14px;
  color: var(--text-primary);
  transition: box-shadow 0.2s;
}
#input3{
  border-radius: 12px; 
  height: 40px
}
</style>
