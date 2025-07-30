<script setup>
import { ref, watch, defineProps } from 'vue';
import axios from 'axios';
// ⚡️ 导入 Naive UI 组件 ⚡️
import { NCard, NEmpty } from 'naive-ui'; 

// ⚡️ 定义接收的 props ⚡️
const props = defineProps({
  selectedCoordinates: {
    type: Object, // 期望接收一个对象 { lat: number, lon: number }
    default: null
  }
});

const weatherInfo = ref(null); // 用于存储从后端获取的天气数据

// ⚡️ getWeatherData 函数 ⚡️
const getWeatherData = async (lat, lon) => {
  weatherInfo.value = '正在获取数据...'; // 提示用户正在加载
  try {
    // ⚡️ Axios 请求路径已简化为相对路径 '/positions' ⚡️
    // 因为我们假设在 main.js 中已经配置了 axios.defaults.baseURL = 'http://localhost:8020/variables'
    const res = await axios.post('/variables/positions', { 
      name: 'surf_10u', // 变量名称，请务必根据你的 NetCDF 文件实际变量名来定
      lat: lat,
      lon: lon,
      time_index: 0,   // 时间索引，0 表示第一个时间步，根据你的数据调整
      // level_index: 0, // 如果你请求的变量有 level 维度，并且需要指定层，可以加上这个
    });
    console.log('Insurance.vue 获取到的天气数据:', res.data);
    
    // 根据后端 DataResponse 模型，实际数据在 res.data.data 中
    if (res.data.success) {
      weatherInfo.value = res.data.data;
      if (Array.isArray(res.data.data) && res.data.data.length > 0) {
        weatherInfo.value = res.data.data[0]; 
      }
      // ⚡️ 调试：打印最终赋给 weatherInfo.value 的值 ⚡️
      console.log('实际赋值给 weatherInfo.value 的数据:', weatherInfo.value);
    } else {
      weatherInfo.value = '未获取到有效数据';
    }

  } catch (err) {
    console.error('获取数据失败:', err);
    weatherInfo.value = '获取数据失败！'; // 更新显示状态
    if (err.response) {
      console.error('响应数据:', err.response.data);
      console.error('响应状态码:', err.response.status);
    } else if (err.request) {
      console.error('请求没有响应:', err.request);
    } else {
      console.error('错误信息:', err.message);
    }
  }
};

// ⚡️ 监听 selectedCoordinates 属性的变化 ⚡️
watch(() => props.selectedCoordinates, async (newCoords) => {
  if (newCoords && newCoords.lat !== null && newCoords.lon !== null) {
    console.log('Insurance.vue 收到坐标:', newCoords);
    await getWeatherData(newCoords.lat, newCoords.lon);
  } else {
    weatherInfo.value = null; // 清空数据，如果坐标无效
  }
}, { immediate: true }); 
</script>

<template>
        <n-card  embedded :bordered="false" size="large">
          <template v-if="weatherInfo && weatherInfo !== '正在获取数据...' && weatherInfo !== '未获取到有效数据' && weatherInfo !== '获取数据失败！'">
            <div class="data-display">
              <p>
                当前选定经度: {{ props.selectedCoordinates.lon?.toFixed(4) }}
                <br>
                当前选定纬度: {{ props.selectedCoordinates.lat?.toFixed(4) }}
              </p>
              <p>
                `surf_10u` 参数值: <b>{{ weatherInfo.toFixed(4) }}</b>
                <br>
                <span style="font-size: 0.9em; color: #666;">（数值越低，可能表示风速越小，具体含义需根据数据源确定）</span>
              </p>
              
              </div>
          </template>
          <template v-else-if="weatherInfo === '正在获取数据...'">
            <n-empty description="正在加载数据，请稍候..." />
          </template>
          <template v-else-if="weatherInfo === '未获取到有效数据' || weatherInfo === '获取数据失败！'">
            <n-empty description="无法获取数据，请重试或更换区域。" />
          </template>
          <template v-else-if="!props.selectedCoordinates">
            <n-empty description="请在地图上点击选择一个位置，以获取保险相关参数。" />
          </template>
          <template v-else>
            <n-empty description="请在地图上点击区域以查看详细信息" />
          </template>

        </n-card>
</template>

<style scoped>
/* 确保这些样式适合你的布局 */
.insurance-info {
  /* 你的样式，例如： */
  /* position: absolute; top: 20px; right: 20px; */
  /* 或者根据 App.vue 中的 flex 布局来调整 */
  width: 100%; /* 假设在 App.vue 的 flex 容器中占据宽度 */
  max-width: 400px; /* 或者你希望的最大宽度 */
}

.data-display {
  padding: 10px;
  border-radius: 8px;
}
</style>