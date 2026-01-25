<template>
  <v-app :theme="theme">
    <!-- Mobile App Bar -->
    <v-app-bar v-if="isMobile" class="app-bar-mobile" elevation="0">
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-toolbar-title class="d-flex align-center ps-0">
        <v-img :src="ayarLogo" width="32" height="32" class="me-2" contain></v-img>
        <span class="text-h6 font-weight-bold" style="line-height: 1;">عيار</span>
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn icon @click="toggleTheme">
        <v-icon>{{ theme === 'dark' ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
      </v-btn>
    </v-app-bar>

    <!-- Navigation Drawer -->
    <v-navigation-drawer
      v-model="drawer"
      :rail="rail && !isMobile"
      :temporary="isMobile"
      :permanent="!isMobile"
      class="app-nav"
    >
      <v-list-item
        :prepend-icon="rail && !isMobile ? 'mdi-car' : undefined"
        class="nav-header pa-4"
      >
        <template v-if="!rail || isMobile">
          <div class="d-flex align-center ps-2 branding-container">
            <div class="logo-wrapper-new me-3 elevation-1">
              <v-img :src="ayarLogo" width="40" height="40" contain></v-img>
            </div>
            <div>
              <div class="text-h6 font-weight-bold text-primary" style="line-height: 1.2;">عيار</div>
              <div class="text-caption text-medium-emphasis">رفيق سيارتك الذكي</div>
            </div>
          </div>
        </template>
      </v-list-item>

      <v-divider class="my-2"></v-divider>

      <!-- Quick Stats in Sidebar -->
      <div v-if="(!rail || isMobile) && carStore.hasCar" class="px-4 py-2">
        <v-card class="quick-stats-card" variant="tonal" color="primary">
          <v-card-text class="pa-3">
            <div class="d-flex align-center justify-space-between">
              <div>
                <div class="text-caption text-medium-emphasis">العداد الحالي</div>
                <div class="text-subtitle-1 font-weight-bold">
                  {{ carStore.car?.currentOdometer?.toLocaleString() || 0 }} كم
                </div>
              </div>
              <v-avatar color="primary" size="36">
                <v-icon size="20">mdi-speedometer</v-icon>
              </v-avatar>
            </div>
          </v-card-text>
        </v-card>
      </div>

      <v-list density="comfortable" nav class="px-2 mt-2">
        <v-list-item
          v-for="item in navItems"
          :key="item.route"
          :to="item.route"
          :prepend-icon="item.icon"
          :title="rail && !isMobile ? '' : item.title"
          rounded="lg"
          class="nav-item mb-1"
          :class="{ 'nav-item-active': $route.name === item.name }"
          @click="isMobile ? drawer = false : null"
        >
          <template v-if="item.badge && (!rail || isMobile)" #append>
            <v-badge
              v-if="item.badge > 0"
              :content="item.badge"
              color="error"
              inline
            ></v-badge>
          </template>
        </v-list-item>
      </v-list>

      <template #append>
        <v-divider class="my-2"></v-divider>
        <v-list density="comfortable" nav class="px-2">
          <v-list-item
            v-if="!isMobile"
            :prepend-icon="theme === 'dark' ? 'mdi-weather-sunny' : 'mdi-weather-night'"
            :title="rail ? '' : (theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي')"
            rounded="lg"
            class="nav-item"
            @click="toggleTheme"
          ></v-list-item>
          <v-list-item
            v-if="!isMobile"
            :prepend-icon="rail ? 'mdi-chevron-left' : 'mdi-chevron-right'"
            :title="rail ? '' : 'تصغير القائمة'"
            rounded="lg"
            class="nav-item"
            @click="rail = !rail"
          ></v-list-item>
        </v-list>
      </template>
    </v-navigation-drawer>

    <!-- Main Content -->
    <v-main class="app-main">
      <v-container fluid class="pa-4 pa-md-6">
        <router-view v-slot="{ Component }">
          <transition name="slide-fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </v-container>
    </v-main>

    <!-- Global Snackbar -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3000"
      location="bottom"
      class="custom-snackbar"
    >
      <div class="d-flex align-center">
        <v-icon class="me-2">{{ getSnackbarIcon(snackbar.color) }}</v-icon>
        {{ snackbar.text }}
      </div>
      <template #actions>
        <v-btn variant="text" size="small" @click="snackbar.show = false">
          إغلاق
        </v-btn>
      </template>
    </v-snackbar>

    <!-- Floating Action Button for Mobile -->
    <v-fab
      v-if="isMobile && $route.name !== 'settings'"
      icon="mdi-plus"
      color="primary"
      location="bottom end"
      size="large"
      class="fab-button"
      @click="handleFabClick"
    ></v-fab>
  </v-app>
</template>

<script setup>
import { ref, computed, provide, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTasksStore } from '@/stores/tasks'
import { useCarStore } from '@/stores/car'
import { useDocumentsStore } from '@/stores/documents'
import { useRecordsStore } from '@/stores/records'
import { useOdometerStore } from '@/stores/odometer'
import ayarLogo from '@/assets/ayar-logo.png'

const route = useRoute()
const router = useRouter()
const tasksStore = useTasksStore()
const carStore = useCarStore()
const documentsStore = useDocumentsStore()
const recordsStore = useRecordsStore()
const odometerStore = useOdometerStore()

// App loading state
const appLoading = ref(true)

// Theme
const theme = ref(localStorage.getItem('theme') || 'dark')

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  localStorage.setItem('theme', theme.value)
}

// Responsive
const isMobile = ref(false)
const drawer = ref(true)
const rail = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth < 960
  if (isMobile.value) {
    drawer.value = false
    rail.value = false
  } else {
    drawer.value = true
  }
}

// Initialize data from Supabase
async function initializeData() {
  try {
    await carStore.fetchCar()
    // Fetch other data in parallel
    await Promise.all([
      tasksStore.fetchTasks(),
      documentsStore.fetchDocuments(),
      recordsStore.fetchRecords(),
      odometerStore.fetchReadings()
    ])
  } catch (error) {
    console.error('Error initializing data:', error)
  } finally {
    appLoading.value = false
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  initializeData()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

const navItems = computed(() => [
  { 
    title: 'لوحة التحكم', 
    icon: 'mdi-view-dashboard', 
    route: '/', 
    name: 'dashboard',
    badge: tasksStore.alertTasks.length + documentsStore.alertDocuments.length
  },
  { 
    title: 'مهام الصيانة', 
    icon: 'mdi-wrench', 
    route: '/tasks', 
    name: 'tasks',
    badge: 0
  },
  { 
    title: 'سجل الصيانة', 
    icon: 'mdi-history', 
    route: '/records', 
    name: 'records',
    badge: 0
  },
  { 
    title: 'وثائق السيارة', 
    icon: 'mdi-file-document-multiple', 
    route: '/documents', 
    badge: documentsStore.alertDocuments.length
  },
  {  
    title: 'الإعدادات', 
    icon: 'mdi-cog', 
    route: '/settings', 
    name: 'settings',
    badge: 0
  }
])

// FAB Handler
function handleFabClick() {
  if (route.name === 'dashboard' && !carStore.hasCar) {
    router.push('/settings')
  } else if (route.name === 'tasks') {
    // Emit event for tasks page
  }
}

// Snackbar
const snackbar = ref({
  show: false,
  text: '',
  color: 'success'
})

function showSnackbar(text, color = 'success') {
  snackbar.value = { show: true, text, color }
}

function getSnackbarIcon(color) {
  const icons = {
    success: 'mdi-check-circle',
    error: 'mdi-alert-circle',
    warning: 'mdi-alert',
    info: 'mdi-information'
  }
  return icons[color] || 'mdi-check-circle'
}

provide('showSnackbar', showSnackbar)
provide('isMobile', isMobile)
</script>

<style scoped>
.app-bar-mobile {
  background: rgba(var(--v-theme-surface), 0.95) !important;
  backdrop-filter: blur(10px);
}

.app-nav {
  background: rgba(var(--v-theme-surface), 0.98) !important;
  backdrop-filter: blur(20px);
  border-left: 1px solid rgba(var(--v-border-color), 0.08) !important;
}

.nav-header {
  min-height: 72px;
}

.logo-wrapper {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1976D2, #1565C0);
}

.quick-stats-card {
  background: rgba(var(--v-theme-primary), 0.08) !important;
}

.nav-item {
  transition: all 0.2s ease;
}

.nav-item:hover {
  background: rgba(var(--v-theme-primary), 0.08) !important;
}

.nav-item-active {
  background: rgba(var(--v-theme-primary), 0.15) !important;
}

.nav-item-active .v-list-item-title {
  color: rgb(var(--v-theme-primary)) !important;
  font-weight: 600;
}

.nav-item-active .v-icon {
  color: rgb(var(--v-theme-primary)) !important;
}

.app-main {
  background: rgb(var(--v-theme-background));
  min-height: 100vh;
}

/* Page transitions */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s ease-in;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.custom-snackbar :deep(.v-snackbar__wrapper) {
  border-radius: 12px;
}

.fab-button {
  margin-bottom: 16px;
  margin-left: 16px;
}

.logo-wrapper-new {
  background: white;
  border-radius: 12px;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
}

@media (max-width: 600px) {
  .fab-button {
    margin-bottom: 24px;
  }
}
</style>
