import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as Cesium from 'cesium'

export const useDataStore = defineStore('dataStore', () => {
  // -------------------------------------------------------------------------
  // 1. State
  // ------------------------------------------------------------------------
  const rawData = ref(null)

  const mapDataPoint = ref({
    name: null,
    data: null,
    shape: null,
    params: null,
    extent: null,
    raster: null
  })

  // -------------------------------------------------------------------------
  // 2. Mutations / Actions
  // -------------------------------------------------------------------------
  function resetMapDataPoint () {
    mapDataPoint.value = {
      name: null,
      data: null,
      shape: null,
      params: null,
      extent: null,
      raster: null
    }
  }

  function setRawData (newRaw) {
    rawData.value = newRaw
  }

  function datatransform () {
    if (!rawData.value?.data || !Array.isArray(rawData.value.data)) return

    const rows = 720
    const cols = 1440
    const dLat = 0.25
    const dLon = 0.25

    let flatData = []

    // 2.1 校验 / 展平
    if (Array.isArray(rawData.value.data[0])) {
      if (rawData.value.data.length !== rows || rawData.value.data[0].length !== cols) {
        console.warn('[datatransform] 数据尺寸不匹配')
        return
      }
      for (let i = 0; i < rows; i++) {
        flatData.push(...rawData.value.data[i])
      }
    } else {
      flatData = rawData.value.data
      if (flatData.length !== rows * cols) {
        console.warn('[datatransform] 一维数据长度错误')
        return
      }
    }

    // 2.2 将 0–359.75° 经度数据旋转到 -180–179.75°
    const rotatedData = new Array(rows * cols)
    for (let i = 0; i < rows; i++) {
      const rowOffset = i * cols
      for (let j = 0; j < cols; j++) {
        const srcCol = (j + cols / 2) % cols     // 向左移 720 列 (=180°)
        rotatedData[rowOffset + j] = flatData[rowOffset + srcCol]
      }
    }

    // 2.3 经纬度数组
    const latitudes = new Array(rows)
    const longitudes = new Array(cols)

    for (let i = 0; i < rows; i++) latitudes[i] = 90 - i * dLat            
    for (let j = 0; j < cols; j++) longitudes[j] = -180 + j * dLon        

    mapDataPoint.value = {
      name: rawData.value.name || 'surf_2t',
      data: rotatedData,
      shape: [rows, cols],
      params: rawData.value.params || null,
      extent: [-180, -89.75, 179.75, 90],        
      raster: {
        cellSize: { lat: dLat, lon: dLon },
        origin: { lat: 90, lon: -180 },
        latitudes,
        longitudes
      }
    }

    console.log('[datatransform] 完成 (经度已旋转至 -180~180)：', {
      name: mapDataPoint.value.name,
      totalPoints: rotatedData.length,
      dataType: Array.isArray(rawData.value.data[0]) ? '二维' : '一维'
    })
  }

  // -------------------------------------------------------------------------
  // 3. Getter / Helper Functions
  // -------------------------------------------------------------------------
  function getFullRasterLayer () {
    if (!mapDataPoint.value.data) return null
    return {
      name: mapDataPoint.value.name,
      values: mapDataPoint.value.data,
      dimensions: mapDataPoint.value.shape,
      extent: mapDataPoint.value.extent,
      raster: mapDataPoint.value.raster,
      metadata: mapDataPoint.value.params
    }
  }

  function getRasterStatistics () {
    if (!mapDataPoint.value.data) return null
    const valid = mapDataPoint.value.data.filter(v => v != null && !isNaN(v)).sort((a, b) => a - b)
    if (!valid.length) return null
    return {
      count: valid.length,
      min: valid[0],
      max: valid[valid.length - 1],
      mean: valid.reduce((s, v) => s + v, 0) / valid.length,
      median: valid[Math.floor(valid.length / 2)],
      range: valid[valid.length - 1] - valid[0]
    }
  }

  function getValueAtRasterCell (row, col) {
    const [rows, cols] = mapDataPoint.value.shape || []
    if (!mapDataPoint.value.data || row < 0 || col < 0 || row >= rows || col >= cols) return null
    return mapDataPoint.value.data[row * cols + col]
  }

  function getValueAtCoordinate (lat, lon) {
    if (!mapDataPoint.value.data || !mapDataPoint.value.raster) return null
    const { cellSize, origin } = mapDataPoint.value.raster

    // 归一化经度到 [-180, 180)
    lon = ((lon + 180) % 360) - 180

    const row = Math.floor((origin.lat - lat) / cellSize.lat)
    const col = Math.floor((lon - origin.lon) / cellSize.lon)
    return getValueAtRasterCell(row, col)
  }

  // -------------------------------------------------------------------------
  // 4. Cesium Helper
  // -------------------------------------------------------------------------
  function getCesiumRasterData () {
    const layer = getFullRasterLayer()
    if (!layer) return null
    const [rows, cols] = layer.dimensions
    const [west, south, east, north] = layer.extent
    return {
      values: layer.values,
      width: cols,
      height: rows,
      rectangle: {
        west: Cesium.Math.toRadians(west),
        south: Cesium.Math.toRadians(south),
        east: Cesium.Math.toRadians(east),
        north: Cesium.Math.toRadians(north)
      },
      raster: layer.raster,
      metadata: layer.metadata
    }
  }

  // -------------------------------------------------------------------------
  // 5. Export
  // -------------------------------------------------------------------------
  return {
    rawData,
    mapDataPoint,
    resetMapDataPoint,
    setRawData,
    datatransform,
    getFullRasterLayer,
    getRasterStatistics,
    getValueAtRasterCell,
    getValueAtCoordinate,
    getCesiumRasterData
  }
})