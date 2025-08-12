import { ref, watch } from 'vue'

const isDarkMode = ref(false)

// 初始化主题
const initTheme = () => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
        isDarkMode.value = savedTheme === 'dark'
    }
    applyTheme()
}

// 切换主题
const toggleTheme = () => {
    isDarkMode.value = !isDarkMode.value
    localStorage.setItem('theme', isDarkMode.value ? 'dark' : 'light')
    applyTheme()
}

// 应用主题
const applyTheme = () => {
    const root = document.documentElement
    if (isDarkMode.value) {
        root.style.setProperty('--nav-bg', '#1c1c1e')
        root.style.setProperty('--bg-primary', '#1c1c1e')
        root.style.setProperty('--bg-secondary', '#2c2c2e')
        root.style.setProperty('--text-primary', '#ffffff')
        root.style.setProperty('--text-secondary', '#8e8e93')
        root.style.setProperty('--text-hover', '#2c2c2e')
        root.style.setProperty('--border-color', '#38383a')
        root.style.setProperty('--card-bg', '#2c2c2e')
        root.style.setProperty('--hover-bg', 'rgba(255, 255, 255, 0.1)') 
        root.style.setProperty('--active-bg', 'rgba(255, 255, 255, 0.15)') 
        root.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.3)')
        root.style.setProperty('--input-bg', '#3a3a3c')
        root.style.setProperty('--select-bg', '#3a3a3c')
        root.style.setProperty('--scrollbar-thumb', 'rgba(255, 255, 255, 0.2)')
        root.style.setProperty('--scrollbar-track', 'rgba(0, 0, 0, 0.1)')
        root.style.setProperty('--cesium-bg', 'rgba(43, 50, 54, 0.1)')
    } else {
        root.style.setProperty('--nav-bg', '#f5f5f7')
        root.style.setProperty('--bg-primary', '#ffffff')
        root.style.setProperty('--bg-secondary', '#f5f5f7')
        root.style.setProperty('--text-primary', '#1d1d1f')
        root.style.setProperty('--text-secondary', '#86868b')
        root.style.setProperty('--text-hover', '#d2d2d7')
        root.style.setProperty('--border-color', '#d2d2d7')
        root.style.setProperty('--card-bg', '#ffffff')
        root.style.setProperty('--hover-bg', 'rgba(0, 0, 0, 0.05)') 
        root.style.setProperty('--active-bg', 'rgba(0, 0, 0, 0.08)') 
        root.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.1)')
        root.style.setProperty('--input-bg', 'rgba(0, 0, 0, 0.05)')
        root.style.setProperty('--select-bg', 'rgba(0, 0, 0, 0.05)')
        root.style.setProperty('--scrollbar-thumb', 'rgba(0, 0, 0, 0.2)')
        root.style.setProperty('--cesium-bg', 'rgba(225, 225, 225, 0.1)')
        root.style.setProperty('--scrollbar-track', 'transparent')
    }
}

// 监听主题变化
watch(isDarkMode, () => {
    applyTheme()
})

export { isDarkMode, toggleTheme, initTheme } 