<template>
  <n-config-provider :theme="isDarkMode ? darkTheme : null" :theme-overrides="commonThemeOverrides">
    <n-message-provider>
      <TopNavBar @toggle-theme="toggleTheme" />
      <router-view />
      <DataLoadPanel />
    </n-message-provider>
  </n-config-provider>
</template>

<script setup>
import { onMounted } from 'vue'
import TopNavBar from '@/components/TopNavBar.vue'
import DataLoadPanel from '@/components/DataLoadPanel.vue'
import {
  NConfigProvider,
  NMessageProvider,
  darkTheme,
} from 'naive-ui'
import { isDarkMode, toggleTheme, initTheme } from '@/utils/theme.js'

// ⚡️ UnoCSS & Normalize
import 'virtual:uno.css'
import 'modern-normalize/modern-normalize.css'

// 🌟 主题覆盖项
const commonThemeOverrides = {
  common: {
    primaryColor: '#007AFF',
    primaryColorHover: '#328AFF',
    primaryColorPressed: '#005AC1',
    primaryColorSuppl: '#007AFF',
    successColor: '#34C759',
    warningColor: '#FFCC00',
    errorColor: '#FF3B30',
    infoColor: '#5AC8FA',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
    fontSize: '15px',
    lineHeight: '1.6',
  },
  Card: {
    color: 'var(--card-bg)',
    borderColor: 'var(--border-color)',
    boxShadow: '0 10px 30px var(--shadow-color)',
    borderRadius: '16px',
    paddingMedium: '32px',
    headerFontSizeMedium: '20px',
    headerTextColor: 'var(--text-primary)',
  },
  Button: {
    borderRadius: '10px',
    heightMedium: '44px',
    textColorText: 'var(--text-primary)',
    textColorPrimary: '#FFFFFF',
    textColorHoverPrimary: '#FFFFFF',
    textColorPressedPrimary: '#FFFFFF',
  },
  Input: {
    color: 'var(--input-bg)',
    borderColor: 'var(--border-color)',
    borderHoverColor: 'var(--primaryColor)',
    borderFocusColor: 'var(--primaryColor)',
    textColor: 'var(--text-primary)',
    borderRadius: '8px',
    paddingMedium: '12px 14px',
  },
}

onMounted(initTheme)
</script>

<style>
:root {
  --bg-primary: #ffffff;
  --text-primary: #1d1d1f;
  --nav-bg: #f5f5f7;
  --hover-bg: rgba(0, 0, 0, 0.05);
  --active-bg: rgba(0, 0, 0, 0.08);
  --border-color: rgba(0, 0, 0, 0.1);
  --topbar-height: 60px;
}

html, body, #app {
  height: 100%;
  margin: 0;
  overflow-x: hidden;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  transition: background-color 0.3s ease, color 0.3s ease;
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

/* Naive UI 全局组件样式 */
.n-card {
  background-color: var(--card-bg) !important;
  color: var(--text-primary) !important;
  border-color: var(--border-color) !important;
  box-shadow: 0 4px 12px var(--shadow-color) !important;
}

.n-input .n-input__input,
.n-input .n-input__textarea,
.n-select .n-base-selection,
.n-base-selection {
  background-color: var(--input-bg) !important;
  color: var(--text-primary) !important;
  border-color: var(--border-color) !important;
}

.n-button.n-button--quaternary-type {
  background-color: transparent !important;
  transition: background-color 0.2s ease;
}
.n-button.n-button--quaternary-type:hover {
  background-color: var(--hover-bg) !important;
}
.n-button.n-button--quaternary-type:active {
  background-color: var(--active-bg) !important;
}

.n-h1, .n-h2, .n-h3, .n-h4, .n-h5, .n-h6 {
  color: var(--text-primary);
}

/* .n-gradient-text {
} */
.n-p {
  color: var(--text-primary);
}
</style>
