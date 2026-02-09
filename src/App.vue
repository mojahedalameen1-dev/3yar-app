<template>
  <v-app :theme="theme">
    <ProfileSetup />
    <!-- Show navigation only for authenticated routes -->
    <template v-if="showNavigation">
      <!-- Mobile App Bar (Premium Style) -->
      <v-app-bar v-if="isMobile" class="app-bar-mobile-premium px-4" elevation="0" flat border="b">
        <div class="d-flex align-center w-100 justify-space-between">
          <div>
            <div class="text-caption text-medium-emphasis mb-n1">أهلاً،</div>
            <div class="text-h6 font-weight-bold">{{ profileStore.firstName || 'مستخدم' }}</div>
          </div>

          <v-avatar size="40" class="avatar-glow cursor-pointer" @click="router.push('/settings')">
            <v-img :src="profileStore.profile?.avatar_url || 'https://randomuser.me/api/portraits/lego/1.jpg'"></v-img>
          </v-avatar>
        </div>
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
            <!-- Theme Toggle Button -->
            <v-list-item
              :prepend-icon="themeStore.currentTheme === 'dark' ? 'mdi-weather-sunny' : 'mdi-weather-night'"
              :title="rail && !isMobile ? '' : (themeStore.currentTheme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي')"
              rounded="lg"
              class="nav-item"
              @click="toggleTheme"
            ></v-list-item>
            <!-- Collapse Menu Button -->
            <v-list-item
              v-if="!isMobile"
              :prepend-icon="rail ? 'mdi-chevron-left' : 'mdi-chevron-right'"
              :title="rail ? '' : 'تصغير القائمة'"
              rounded="lg"
              class="nav-item"
              @click="rail = !rail"
            ></v-list-item>
            <!-- Admin Panel Link (for admins only) -->
            <v-list-item
              v-if="profileStore.isAdmin"
              to="/admin-login"
              prepend-icon="mdi-rocket-launch"
              :title="rail && !isMobile ? '' : 'مركز التحكم'"
              rounded="lg"
              class="nav-item admin-link"
              @click="isMobile ? drawer = false : null"
            ></v-list-item>
          </v-list>
          
          <!-- User Profile -->
          <UserProfile v-if="authStore.isAuthenticated" @logout="handleLogout" />
        </template>
      </v-navigation-drawer>

      <!-- Bottom Navigation for Mobile -->
      <v-bottom-navigation
        v-if="isMobile"
        v-model="activeNav"
        class="mobile-bottom-nav"
        grow
        border="t"
        elevation="0"
      >
        <v-btn
          v-for="item in navItems.slice(0, 5)"
          :key="item.route"
          :value="item.name"
          :to="item.route"
          class="nav-btn-mobile"
        >
          <v-icon>{{ item.icon }}</v-icon>
          <span class="text-caption">{{ item.title }}</span>
          <div v-if="activeNav === item.name" class="active-dot"></div>
          <v-badge
            v-if="item.badge > 0"
            :content="item.badge"
            color="error"
            floating
            class="nav-badge-mobile"
          ></v-badge>
        </v-btn>
      </v-bottom-navigation>
    </template>

    <!-- Main Content -->
    <v-main :class="{ 'app-main': showNavigation }">
      <!-- Loading Overlay -->
      <div v-if="appLoading && showNavigation" class="loading-overlay">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
        <p class="text-body-1 mt-4">جاري التحميل...</p>
      </div>
      
      <v-container v-else fluid :class="showNavigation ? 'pa-4 pa-md-6' : 'pa-0'">
        <ErrorBoundary>
          <router-view v-slot="{ Component }">
            <transition name="slide-fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </ErrorBoundary>
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

    <v-fab
      v-if="isMobile && showNavigation && $route.name === 'tasks'"
      icon="mdi-plus"
      color="primary"
      location="bottom center"
      size="x-large"
      class="fab-button-mobile"
      @click="handleFabClick"
    ></v-fab>
  </v-app>
</template>

<script setup>
import { ref, computed, provide, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTasksStore } from '@/stores/tasks'
import { useCarStore } from '@/stores/car'
import { useDocumentsStore } from '@/stores/documents'
import { useRecordsStore } from '@/stores/records'
import { useOdometerStore } from '@/stores/odometer'
import { useProfileStore } from '@/stores/profile'
import { useThemeStore } from '@/stores/theme'
import { useNotificationsStore } from '@/stores/notifications'
import UserProfile from '@/components/UserProfile.vue'
import ProfileSetup from '@/components/ProfileSetup.vue'
import ErrorBoundary from '@/components/ErrorBoundary.vue'
import ayarLogo from '@/assets/ayar-logo.png'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const tasksStore = useTasksStore()
const carStore = useCarStore()
const documentsStore = useDocumentsStore()
const recordsStore = useRecordsStore()
const odometerStore = useOdometerStore()
const profileStore = useProfileStore()
const notificationsStore = useNotificationsStore()

// App loading state
const appLoading = ref(true)

// Check if current route is admin panel
const isAdminRoute = computed(() => {
  return route.meta.requiresAdmin === true
})

// Show navigation only for protected routes (but not admin panel)
const showNavigation = computed(() => {
  return !route.meta.public && authStore.isAuthenticated && !isAdminRoute.value
})

// Theme Store
const themeStore = useThemeStore()

function toggleTheme() {
  themeStore.toggleTheme()
}


// Responsive
const isMobile = ref(false)
const drawer = ref(true)
const rail = ref(false)
const activeNav = ref('dashboard')

watch(() => route.name, (val) => {
  activeNav.value = val
}, { immediate: true })

function checkMobile() {
  isMobile.value = window.innerWidth < 960
  if (isMobile.value) {
    drawer.value = false
    rail.value = false
  } else {
    drawer.value = true
  }
}

// Initialize auth and data
async function initialize() {
  // Initialize theme
  themeStore.initialize()

  // Initialize auth first
  await authStore.initialize()
  
  // If authenticated, fetch data
  if (authStore.isAuthenticated) {
    await initializeData()
  } else {
    appLoading.value = false
  }
}

// Initialize data from Supabase
async function initializeData() {
  try {
    // Fetch profile first
    await profileStore.fetchProfile()
    
    await carStore.fetchCar()
    // Only fetch other data if user has a car
    // This ensures new users start with a clean slate
    if (carStore.hasCar) {
      await Promise.all([
        tasksStore.fetchTasks(),
        documentsStore.fetchDocuments(),
        recordsStore.fetchRecords(),
        odometerStore.fetchReadings(),
        notificationsStore.fetchAnnouncements(),
        notificationsStore.fetchReadHistory()
      ])
      notificationsStore.subscribeToAnnouncements()
    }
  } catch (error) {
    console.error('Error initializing data:', error)
  } finally {
    appLoading.value = false
  }
}

// Watch for auth changes to reload data
watch(() => authStore.isAuthenticated, async (isAuth) => {
  if (isAuth) {
    appLoading.value = true
    await initializeData()
  }
})

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  initialize()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

const navItems = computed(() => [
  { 
    title: 'لوحة التحكم', 
    icon: 'mdi-view-dashboard', 
    route: '/dashboard', 
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
    title: 'الإشعارات',
    icon: 'mdi-bell',
    route: '/notifications',
    name: 'notifications',
    badge: notificationsStore.unreadCount
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

// Handle logout
async function handleLogout() {
  await authStore.signOut()
  router.push('/login')
  showSnackbar('تم تسجيل الخروج بنجاح')
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
.app-bar-mobile-premium {
  background: rgba(0, 0, 0, 0.8) !important;
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
  height: 70px !important;
}

.avatar-glow {
  border: 2px solid var(--electric-blue);
  box-shadow: 0 0 15px rgba(0, 122, 255, 0.3);
}

.mobile-bottom-nav {
  height: 75px !important;
  background: rgba(0, 0, 0, 0.85) !important;
  backdrop-filter: blur(25px);
  border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
  padding-bottom: 20px; /* Safe area for home indicator */
}

.nav-btn-mobile {
  min-width: 0 !important;
  color: #888 !important;
  position: relative;
}

.nav-btn-mobile :deep(.v-btn__content) {
  flex-direction: column;
  gap: 4px;
}

.nav-btn-mobile.v-btn--active {
  color: var(--electric-blue) !important;
}

.active-dot {
  width: 4px;
  height: 4px;
  background: var(--electric-blue);
  border-radius: 50%;
  position: absolute;
  bottom: 0px;
  left: 50%;
  transform: translateX(-50%);
  box-shadow: 0 0 8px var(--electric-blue);
}

.nav-badge-mobile {
  position: absolute;
  top: 10px;
  right: 25%;
}

.fab-button-mobile {
  bottom: 90px !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  z-index: 100;
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

/* Admin Link - Distinct styling */
.admin-link {
  margin-top: 8px;
  background: linear-gradient(135deg, rgba(0, 188, 212, 0.15), rgba(156, 39, 176, 0.1)) !important;
  border: 1px solid rgba(0, 188, 212, 0.3);
}

.admin-link:hover {
  background: linear-gradient(135deg, rgba(0, 188, 212, 0.25), rgba(156, 39, 176, 0.2)) !important;
  border-color: rgba(0, 188, 212, 0.5);
}

.admin-link .v-icon {
  color: #00BCD4 !important;
}

.app-main {
  background: rgb(var(--v-theme-background));
  min-height: 100vh;
}

.loading-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
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
