<template>
  <n-config-provider :theme="isDarkMode ? darkTheme : null" :theme-overrides="commonThemeOverrides">
    <n-message-provider>
      <TopNavBar @toggle-theme="toggleTheme" />
      <router-view />
    </n-message-provider>
  </n-config-provider>
</template>

<script setup>
import { onMounted } from 'vue';
import TopNavBar from '@/components/TopNavBar.vue';
import {
  NConfigProvider,
  NMessageProvider,
  darkTheme, // 引入 Naive UI 的深色主题
  // 💡 无需引入 lightTheme，当 theme 为 null 时，NConfigProvider 默认使用浅色主题
} from 'naive-ui';
import { isDarkMode, toggleTheme, initTheme } from '@/utils/theme.js';
// ⚡️ 引入 UnoCSS 的运行时入口 ⚡️
import 'virtual:uno.css';
import 'modern-normalize/modern-normalize.css';


// ⚡️ 核心：定义你的主题覆盖对象 ⚡️
const commonThemeOverrides = {
  common: {
    // 全局主色，影响按钮、进度条等主要元素
    primaryColor: '#007AFF',       // 苹果蓝，更现代活泼
    primaryColorHover: '#328AFF',
    primaryColorPressed: '#005AC1',
    primaryColorSuppl: '#007AFF', // 确保补充色与主色保持一致或协调

    // 其他通用颜色，确保在深色模式下有良好的对比度
    successColor: '#34C759',
    warningColor: '#FFCC00',
    errorColor: '#FF3B30',
    infoColor: '#5AC8FA',

    // 字体设置
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
    fontSize: '15px', // 默认字体大小
    lineHeight: '1.6', // 默认行高
  },
  Card: {
    color: 'var(--card-bg)', // 使用 theme.js 变量
    borderColor: 'var(--border-color)', // 使用 theme.js 变量
    boxShadow: '0 10px 30px var(--shadow-color)', // 更明显的柔和阴影
    borderRadius: '16px', // 大圆角
    paddingMedium: '32px', // 增加内边距
    headerFontSizeMedium: '20px', // 标题字体更大
    headerTextColor: 'var(--text-primary)', // 标题文本颜色
  },
  Button: {
    borderRadius: '10px', // 按钮圆角
    heightMedium: '44px', // 按钮高度
    // 按钮文本颜色在不同状态下的表现
    textColorText: 'var(--text-primary)', // 文本按钮颜色
    textColorPrimary: '#FFFFFF', // 主要按钮的文本色通常是白色
    textColorHoverPrimary: '#FFFFFF',
    textColorPressedPrimary: '#FFFFFF',
    // 按钮的背景和边框颜色会受 primaryColor 影响
  },
  Input: {
    color: 'var(--input-bg)',
    borderColor: 'var(--border-color)',
    borderHoverColor: 'var(--primaryColor)',
    borderFocusColor: 'var(--primaryColor)',
    textColor: 'var(--text-primary)',
    borderRadius: '8px',
    paddingMedium: '12px 14px', // 增加输入框内边距
  },
  // ... 更多组件的覆盖
};

onMounted(() => {
  initTheme();
});
</script>

<style>
/* App.vue 的全局 CSS，这里确保你的 CSS 变量可以影响 Naive UI 组件 */
/* 你可能需要根据实际效果，调整这里的 !important 或者与 themeOverrides 的配合 */
html, body, #app {
  height: 100%;
  margin: 0;
  overflow-x: hidden;
  background: var(--bg-primary); /* 使用 theme.js 控制的背景色 */
  color: var(--text-primary);     /* 使用 theme.js 控制的文本色 */
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  transition: background-color .3s ease, color .3s ease;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-thumb {
  background-color: var(--scrollbar-thumb);
  border-radius: 4px;
}
::-webkit-scrollbar-track {
  background-color: var(--scrollbar-track);
}

/* ⚡️ 重要的全局 Naive UI 样式覆盖 ⚡️ */
/* 确保这些样式使用你的 theme.js 变量，并可以覆盖 Naive UI 的默认值 */
.n-card {
  /* 使用你 theme.js 中的变量，并通过 !important 确保生效 */
  background-color: var(--card-bg) !important;
  color: var(--text-primary) !important;
  border-color: var(--border-color) !important;
  box-shadow: 0 4px 12px var(--shadow-color) !important;
}

/* 确保输入框、选择框等表单元素也适配 */
.n-input .n-input__input,
.n-input .n-input__textarea,
.n-select .n-base-selection,
.n-base-selection { /* 适用于所有 base-selection，包括 DatePicker 等 */
  background-color: var(--input-bg) !important;
  color: var(--text-primary) !important;
  border-color: var(--border-color) !important;
}

.n-button.n-button--quaternary-type {
  /* 例如，调整四级按钮的悬停和激活背景色 */
  background-color: transparent !important; /* 确保背景透明 */
  transition: background-color .2s ease;
}
.n-button.n-button--quaternary-type:hover {
  background-color: var(--hover-bg) !important;
}
.n-button.n-button--quaternary-type:active {
  background-color: var(--active-bg) !important;
}

/* 调整标题文本颜色，让 NGradientText 也能适配主题 */
.n-h1, .n-h2, .n-h3, .n-h4, .n-h5, .n-h6 {
  color: var(--text-primary); /* 确保标题文字颜色也受主题控制 */
}
/* n-gradient-text 自身会生成渐变色，但基础文字颜色仍可控 */
.n-gradient-text {
    /* 渐变色不会直接受 --text-primary 影响，但你可以调整其 type 对应的颜色 */
}
/* Naive UI 段落文本颜色 */
.n-p {
  color: var(--text-primary);
}
/* 你的 TopNavBar.vue 中 n-p 颜色设置为 #666，需要改为变量 */
/* 例如在 TopNavBar.vue 中： <n-p style="text-align: center; color: var(--text-secondary);"> */

</style>