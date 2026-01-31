import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useTheme } from 'vuetify'

export const useThemeStore = defineStore('theme', () => {
    const theme = useTheme()

    // Initialize theme from localStorage or default to 'dark'
    const currentTheme = ref(localStorage.getItem('theme') || 'dark')
    const isDarkMode = ref(currentTheme.value === 'dark')

    function initialize() {
        // Set initial Vuetify theme
        theme.global.name.value = currentTheme.value
        isDarkMode.value = currentTheme.value === 'dark'
    }

    function toggleTheme() {
        const newTheme = currentTheme.value === 'dark' ? 'light' : 'dark'
        setTheme(newTheme)
    }

    function setTheme(newTheme) {
        currentTheme.value = newTheme
        theme.global.name.value = newTheme
        isDarkMode.value = newTheme === 'dark'
        localStorage.setItem('theme', newTheme)
    }

    return {
        currentTheme,
        isDarkMode,
        initialize,
        toggleTheme,
        setTheme
    }
})
