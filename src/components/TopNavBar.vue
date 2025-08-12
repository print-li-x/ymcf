<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { isDarkMode, toggleTheme } from '@/utils/theme.js'

const router = useRouter()
const route  = useRoute()

/** =========================
 *  投影状态（3D / 2D）
 *  ========================= */
const proj = ref('3D')

function setProj (k) {
  const next = (k === '2D') ? '2D' : '3D'
  if (proj.value === next) return
  proj.value = next

  // 通知 CesiumMap 切换投影
  window.dispatchEvent(new CustomEvent('map-projection', { detail: { key: next } }))

  // 可选：把当前投影写入 URL，便于刷新保持
  const q = Object.assign({}, route.query, { proj: next })
  router.replace({ path: route.path, query: q })
}

// （可选）从外部同步当前投影（如果 CesiumMap 也会广播）
function syncProjectionFromOutside (e) {
  const d = e && e.detail ? e.detail : {}
  if (!d.key) return
  proj.value = (d.key === '2D') ? '2D' : '3D'
}

/** =========================
 *  菜单与图层
 *  ========================= */
const navRef = ref(null)

const menus = ref([
  { key: 'disaster',  name: '巨灾预测',  path: '/disaster', children: null },
  { key: 'insurance', name: '参数化保险', path: '/insurance' },
  { key: 'multimodal',name: '多模态数据', path: '/multimodal' }
])

// 图层（在 CesiumMap.vue 内实现实际加载）
const layers = [
  { key: 'arcgis', name: 'ArcGIS 卫星' },
  { key: 'gaode',  name: '高德地图' },
  { key: 'osm',    name: 'OpenStreetMap' },
  { key: 'None',   name: '不加载' }
]

// 跳转/展开
function goto (item) {
  if (typeof item === 'string') {
    const found = findMenu(item, menus.value)
    if (found) goto(found)
    return
  }

  switch (item.key) {
    case 'disaster': {
      if (item.path) router.push(item.path)
      toggleChildren(item, [
        { key: 'layer', name: '图层加载' },
        { key: 'data',  name: '数据加载' }
      ])
      break
    }
    case 'layer': {
      toggleChildren(item, layers.map(l => ({ ...l })))
      break
    }
    case 'data': {
      const showing = route.query.panel === 'data'
      const { panel, ...rest } = route.query
      router.replace({
        path: route.path,
        query: showing ? rest : { ...route.query, panel: 'data' }
      })
      break
    }
    case 'arcgis':
    case 'gaode':
    case 'osm':
    case 'None': {
      selectLayer(item.key)
      break
    }
    default: {
      if (item.path) router.push(item.path)
    }
  }
}

function selectLayer (layer) {
  router.replace({ path: route.path, query: { ...route.query, layer } })
}

function toggleChildren (item, newChildren) {
  item.children = item.children ? null : newChildren
}

function findMenu (key, list) {
  for (const i of list) {
    if (i.key === key) return i
    if (i.children) {
      const t = findMenu(key, i.children)
      if (t) return t
    }
  }
  return null
}

function isActive (item) {
  if (item.path && route.path === item.path) return true
  if (['arcgis','gaode','osm','None'].includes(item.key)) return route.query.layer === item.key
  return false
}

function closeAll (list = menus.value) {
  list.forEach(i => {
    if (i.children) {
      closeAll(i.children)
      i.children = null
    }
  })
}

function handleOutsideClick (e) {
  if (navRef.value && !navRef.value.contains(e.target)) closeAll()
}

/** =========================
 *  生命周期
 *  ========================= */
onMounted(() => {
  // 初始化投影（从 URL 读取）
  if (route && route.query && route.query.proj) {
    proj.value = (String(route.query.proj) === '2D') ? '2D' : '3D'
  }
  document.addEventListener('click', handleOutsideClick)
  window.addEventListener('map-projection', syncProjectionFromOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick)
  window.removeEventListener('map-projection', syncProjectionFromOutside)
})
</script>

<template>
  <header class="topbar">
    <h1 class="logo" @click="router.push('/')">🌪️ 云眸城防</h1>

    <nav class="nav" ref="navRef">
      <template v-for="m in menus" :key="m.key">
        <div class="menu-block">
          <a
            :class="{ active: isActive(m), disabled: m.disabled }"
            @click.stop="!m.disabled && goto(m)"
          >
            {{ m.name }}
          </a>

          <template v-if="m.children">
            <div class="children">
              <template v-for="c in m.children" :key="c.key">
                <a
                  :class="{ active: isActive(c), disabled: c.disabled }"
                  @click.stop="!c.disabled && goto(c)"
                >
                  {{ c.name }}
                </a>

                <div v-if="c.children" class="grand-children">
                  <a
                    v-for="g in c.children"
                    :key="g.key"
                    :class="{ active: isActive(g) }"
                    @click.stop="goto(g)"
                  >
                    {{ g.name }}
                  </a>
                </div>
              </template>
            </div>
          </template>
        </div>
      </template>
    </nav>

    <div class="right-side">
      <!-- 主题切换 -->
      <button class="theme-btn" @click="toggleTheme" :title="isDarkMode ? '切换到浅色' : '切换到深色'">
        {{ isDarkMode ? '🌙' : '☀️' }}
      </button>

      <!-- 投影切换 -->
      <div class="proj-group" aria-label="投影切换">
        <span class="current-proj">当前：{{ proj }}</span>
        <button
          class="proj-btn"
          :class="{ active: proj==='3D' }"
          @click="setProj('3D')"
          title="三维球面"
        >3D</button>
        <button
          class="proj-btn"
          :class="{ active: proj==='2D' }"
          @click="setProj('2D')"
          title="Columbus View（2.5D）"
        >2D</button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  padding: 0 24px;
  background: var(--nav-bg);
  box-shadow: 0 1px 4px rgba(0,0,0,.08);
}

.logo {
  font-size: 30px;
  cursor: pointer;
  user-select: none;
}

.nav {
  display: flex;
  gap: 20px;
  position: relative;
  align-items: flex-start;
}

.menu-block { position: relative; }

.menu-block > a {
  font-size: 16px;
  padding: 6px 10px;
  cursor: pointer;
  position: relative;
  border-radius: 6px;
  transition: background .2s ease, color .2s ease;
}
.menu-block > a:hover {
  background-color: var(--text-hover);
}
.menu-block > a.active::after {
  content: '';
  position: absolute;
  left: 0; bottom: -2px;
  width: 100%; height: 2px;
  background: var(--primary,#2d8cf0);
}
.menu-block > a.disabled {
  cursor: not-allowed; opacity: .6;
}

.children, .grand-children {
  display: flex; flex-direction: column;
  position: absolute; top: 100%; left: 0;
  margin-top: 4px; min-width: 140px; padding: 4px 0;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  box-shadow: 0 2px 12px rgba(0,0,0,.18);
  z-index: 2000;
}

.grand-children {
  left: 100%; top: 0; margin-left: 6px; margin-top: 0;
}

.children a, .grand-children a {
  padding: 8px 12px; font-size: 14px; white-space: nowrap;
  position: relative; cursor: pointer; border-radius: 6px;
}
.children a.active::after,
.grand-children a.active::after {
  content: '';
  position: absolute; left: 8px; right: 8px; bottom: 6px;
  height: 2px; background: var(--primary,#2d8cf0);
  border-radius: 2px;
}
.children a:hover:not(.active):not(.disabled),
.grand-children a:hover:not(.active):not(.disabled) {
  background: var(--hover-bg);
}
.children a.disabled, .grand-children a.disabled {
  cursor: not-allowed; opacity: .6;
}

.right-side {
  display: flex;
  align-items: center;
  gap: 12px;
}

.theme-btn {
  background: transparent; border: none;
  font-size: 20px; cursor: pointer; padding: 8px;
  line-height: 1; border-radius: 8px;
  transition: background .15s ease, transform .12s ease;
}
.theme-btn:hover { background: var(--hover-bg); transform: translateY(-1px); }
.theme-btn:active { transform: translateY(0); filter: brightness(.95); }

/* 投影切换 */
.proj-group {
  display: flex; align-items: center; gap: 8px;
}

.current-proj {
  padding: 6px 10px;
  border-radius: 10px;
  background: var(--bg-secondary, #1f2937);
  color: var(--text-primary, #e5e7eb);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0,0,0,.2) inset;
}

.proj-btn {
  padding: 6px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-color, #374151);
  background: var(--bg-secondary, #111827);
  color: var(--text-primary, #e5e7eb);
  cursor: pointer;
  transition: transform .12s ease, background .12s ease,
              box-shadow .12s ease, border-color .12s ease;
  user-select: none;
}
.proj-btn:hover {
  transform: translateY(-1px);
  background: #1b2433;
  box-shadow: 0 2px 10px rgba(0,0,0,.25);
}
.proj-btn:active {
  transform: translateY(0);
  filter: brightness(0.95);
}
.proj-btn.active {
  background: var(--primary, #2d8cf0);
  border-color: var(--primary, #2d8cf0);
  color: #fff;
  box-shadow: 0 0 0 2px rgba(45,140,240,.25);
}
</style>
