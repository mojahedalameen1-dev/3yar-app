import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ar } from 'vuetify/locale'

const lightTheme = {
    dark: false,
    colors: {
        background: '#EEF2F6', // Softer gray-blue background
        surface: '#FFFFFF',
        'surface-variant': '#E3E8EF', // Subtle contrast
        'on-background': '#1A2C3D', // Dark text for readability
        'on-surface': '#1A2C3D',
        primary: '#0D3C61', // Navy Blue (brand)
        'primary-darken-1': '#092C48',
        secondary: '#C66C1E', // Bronze (brand)
        'secondary-darken-1': '#A85A16',
        error: '#C62828',
        warning: '#E65100',
        info: '#0277BD',
        success: '#2E7D32',
        'status-late': '#C62828',
        'status-due': '#E65100',
        'status-soon': '#F9A825',
        'status-good': '#2E7D32',
        // Border colors for visibility
        'border-color': 'rgba(13, 60, 97, 0.15)', // Navy with transparency
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
