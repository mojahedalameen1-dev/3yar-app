import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import '@mdi/font/css/materialdesignicons.css'
import './assets/styles/main.css'

// When a new PWA build takes control, refresh the open tab once so a cached
// bundle (and its old Firebase configuration) cannot remain visible.
if ('serviceWorker' in navigator) {
  let refreshedForNewWorker = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshedForNewWorker) return
    refreshedForNewWorker = true
    window.location.reload()
  })
}

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(vuetify)

app.mount('#app')
