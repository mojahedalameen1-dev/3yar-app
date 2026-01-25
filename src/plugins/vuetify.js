import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ar } from 'vuetify/locale'

const lightTheme = {
    dark: false,
    colors: {
        background: '#F5F5FA',
        surface: '#FFFFFF',
        'surface-variant': '#E8EAF6',
        primary: '#0D3C61', // Navy Blue
        secondary: '#C66C1E', // Bronze
        error: '#D32F2F',
        warning: '#F57C00',
        info: '#0288D1',
        success: '#388E3C',
        'status-late': '#D32F2F',
        'status-due': '#F57C00',
        'status-soon': '#FFA000',
        'status-good': '#388E3C',
    }
}

const darkTheme = {
    dark: true,
    colors: {
        background: '#0a1929', // Dark Navy
        surface: '#102a43',
        'surface-variant': '#1E3A5F',
        primary: '#4DA8DA', // Lighter Blue for dark mode visibility
        secondary: '#E6A26B', // Lighter Bronze for dark mode
        error: '#EF5350',
        warning: '#FFA726',
        info: '#29B6F6',
        success: '#66BB6A',
        'status-late': '#EF5350',
        'status-due': '#FFA726',
        'status-soon': '#FFCA28',
        'status-good': '#66BB6A',
    }
}

export default createVuetify({
    components,
    directives,
    locale: {
        locale: 'ar',
        fallback: 'ar',
        messages: { ar }
    },
    theme: {
        defaultTheme: 'dark',
        themes: {
            light: lightTheme,
            dark: darkTheme
        }
    },
    defaults: {
        VBtn: {
            rounded: 'lg',
            elevation: 0
        },
        VCard: {
            rounded: 'xl',
            elevation: 0
        },
        VTextField: {
            variant: 'outlined',
            density: 'comfortable',
            rounded: 'lg'
        },
        VSelect: {
            variant: 'outlined',
            density: 'comfortable',
            rounded: 'lg'
        }
    }
})
