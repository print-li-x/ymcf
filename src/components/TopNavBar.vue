<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { isDarkMode, toggleTheme } from '@/utils/theme.js'

const router = useRouter()
const route  = useRoute()

// 指定路径
const menus = ref([
  { key: 'disaster',  name: '巨灾预测',  path: '/disaster', children: null },
  { key: 'insurance', name: '参数化保险', path: '/insurance' },
  { key: 'multimodal',name: '多模态数据', path: '/multimodal' }
])

// 两个图层叠加，之后可以加更多的，在CesiumMap.vue里实现
const layers = [
  { key: 'arcgis', name: 'ArcGIS 卫星' },
  { key: 'gaode', name: '高德地图'},
  { key: 'osm',    name: 'OpenStreetMap' },
  { key: 'None', name: '不加载'}
]

const navRef = ref(null)

// 找到指定url的东西
function goto (item) {
  if (typeof item === 'string') {
    const found = findMenu(item, menus.value)
    if (found) goto(found)
    return
  }

  switch (item.key) {
    case 'disaster':
      if (item.path) router.push(item.path)
      toggleChildren(item, [
        { key: 'layer', name: '图层加载' },
        { key: 'data',  name: '数据加载' }
      ])
      break
    case 'layer':
      toggleChildren(item, layers.map(l => ({ ...l })))
      break
    case 'data' :
      const showing = route.query.panel === 'data'
      const { panel, ...rest } = route.query
      router.replace({
        path: route.path,
        query: showing ? rest : { ...route.query, panel: 'data' }
      })
      break
    case 'arcgis':
    case 'gaode':
    case 'None':
    case 'osm':
      selectLayer(item.key)
      break
    default:
      if (item.path) router.push(item.path)
  }
}

// 只更新图层
function selectLayer (layer) {
  router.replace({ path: route.path, query: { ...route.query, layer } })
}

// 折叠或动态挂载子菜单
function toggleChildren (item, newChildren) {
  item.children = item.children ? null : newChildren
}

// 递归找东西
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

// 返回是否在某个页面
function isActive (item) {
  if (item.path && route.path === item.path) 
    return true
  if (['arcgis','gaode', 'osm', 'None'].includes(item.key))
    return route.query.layer === item.key
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

// 点击其他东西折叠子菜单
function handleOutsideClick (e) {
  if (navRef.value && !navRef.value.contains(e.target)) closeAll()
}

// 生命周期
onMounted(() => document.addEventListener('click', handleOutsideClick))
onBeforeUnmount(() => document.removeEventListener('click', handleOutsideClick))
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

    <button class="theme-btn" @click="toggleTheme">
      {{ isDarkMode ? '🌙' : '☀️' }}
    </button>
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

.menu-block { 
  position: relative; 
}

.menu-block > a {
  font-size: 16px;
  padding: 6px 10px;
  cursor: pointer;
  position: relative;
}
.menu-block > a:hover {
  background-color:var(--text-hover);
  border-radius: 6px; 
  transition: background 0.2s ease;
}
.menu-block > a.active::after {
  content: ''; 
  position: absolute; 
  left: 0; 
  bottom: -2px;
  width: 100%; 
  height: 2px; 
  background: var(--primary,#2d8cf0);
}
.menu-block > a.disabled { 
  cursor: not-allowed; 
  opacity: .6; 
}

.children, .grand-children {
  display: flex; 
  flex-direction: column;
  position: absolute; 
  top: 100%; 
  left: 0; 
  margin-top: 4px;
  min-width: 140px; 
  padding: 4px 0;
  background: var(--card-bg); 
  border: 1px solid var(--border-color);
  border-radius: 4px; 
  box-shadow: 0 2px 6px var(--shadow-color);
  z-index: 2000;
}

.grand-children {
  left: 100%; 
  top: 0; 
  margin-left: 4px; 
  margin-top: 0;
}

.children a, .grand-children a {
  padding: 6px 12px; 
  font-size: 14px; 
  white-space: nowrap;
  position: relative; 
  cursor: pointer;
}
.children a.active::after,
.grand-children a.active::after {
  content: ''; 
  position: absolute; 
  left: 0; 
  bottom: 0;
  width: 100%; 
  height: 2px; 
  background: var(--primary,#2d8cf0);
}
.children a:hover:not(.active):not(.disabled),
.grand-children a:hover:not(.active):not(.disabled) { 
  background: var(--hover-bg); 
}

.children a.disabled,
.grand-children a.disabled { 
  cursor: not-allowed; opacity: .6; 
}

.theme-btn {
  background: transparent; border: none;
  font-size: 20px; cursor: pointer; padding: 8px;
}
</style>
