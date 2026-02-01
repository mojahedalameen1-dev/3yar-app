<template>
  <div class="control-tower">
    <!-- Hero Header -->
    <div class="tower-header">
      <div class="header-bg"></div>
      <div class="header-content">
        <div class="d-flex align-center justify-space-between flex-wrap gap-4">
          <div class="d-flex align-center gap-4">
            <div class="header-icon">
              <v-icon size="32" color="white">mdi-rocket-launch</v-icon>
            </div>
            <div>
              <h1 class="text-h4 font-weight-bold text-white mb-1">مركز تحكم عيار</h1>
              <p class="text-body-2 text-white-70">Iyar Control Tower - رؤية شاملة لكل البيانات</p>
            </div>
          </div>
          <!-- Return to App Button -->
          <v-btn
            color="white"
            variant="outlined"
            class="return-btn"
            @click="returnToApp"
          >
            <v-icon start>mdi-arrow-right</v-icon>
            العودة للتطبيق
          </v-btn>
        </div>
      </div>
    </div>

    <!-- Main Tabs -->
    <v-tabs
      v-model="activeTab"
      class="tower-tabs"
      slider-color="cyan"
      bg-color="transparent"
      grow
    >
      <v-tab value="analytics" class="tab-item">
        <v-icon start>mdi-chart-areaspline</v-icon>
        التحليلات التنفيذية
      </v-tab>
      <v-tab value="crm" class="tab-item">
        <v-icon start>mdi-account-group</v-icon>
        إدارة المستخدمين
      </v-tab>
      <v-tab value="forge" class="tab-item">
        <v-icon start>mdi-cog-sync</v-icon>
        التحكم النظامي
      </v-tab>
      <v-tab value="activity" class="tab-item">
        <v-icon start>mdi-pulse</v-icon>
        البث المباشر
      </v-tab>
    </v-tabs>

    <!-- Tab Content -->
    <v-window v-model="activeTab" class="tab-window">
      <!-- Tab 1: Executive Analytics -->
      <v-window-item value="analytics">
        <div class="tab-content">
          <!-- Hero Stats Grid -->
          <v-row class="mb-6">
            <v-col v-for="stat in heroStats" :key="stat.title" cols="12" sm="6" lg="3">
              <div class="hero-stat-card" :class="`glow-${stat.color}`">
                <div class="stat-glow"></div>
                <div class="stat-content">
                  <div class="stat-icon-wrapper" :class="`bg-${stat.color}`">
                    <v-icon size="28" color="white">{{ stat.icon }}</v-icon>
                  </div>
                  <div class="stat-info">
                    <div class="stat-value">{{ stat.value }}</div>
                    <div class="stat-label">{{ stat.title }}</div>
                    <div v-if="stat.growth !== undefined" class="stat-growth" :class="stat.growth >= 0 ? 'positive' : 'negative'">
                      <v-icon size="12">{{ stat.growth >= 0 ? 'mdi-trending-up' : 'mdi-trending-down' }}</v-icon>
                      {{ Math.abs(stat.growth) }} آخر 24 ساعة
                    </div>
                  </div>
                </div>
              </div>
            </v-col>
          </v-row>

          <!-- Charts Row -->
          <v-row>
            <!-- Growth Curve Chart -->
            <v-col cols="12" lg="8">
              <div class="glass-card chart-card">
                <div class="card-header">
                  <h3 class="card-title">
                    <v-icon class="me-2" color="cyan">mdi-chart-line</v-icon>
                    منحنى النمو
                  </h3>
                  <span class="card-subtitle">المستخدمين والسيارات - آخر 30 يوم</span>
                </div>
                <div class="chart-container">
                  <Line v-if="growthChartReady" :data="growthChartData" :options="lineChartOptions" />
                  <div v-else class="chart-placeholder">
                    <v-progress-circular indeterminate color="cyan"></v-progress-circular>
                  </div>
                </div>
              </div>
            </v-col>

            <!-- Market Dominance Donut -->
            <v-col cols="12" lg="4">
              <div class="glass-card chart-card">
                <div class="card-header">
                  <h3 class="card-title">
                    <v-icon class="me-2" color="pink">mdi-chart-donut</v-icon>
                    توزيع الماركات
                  </h3>
                  <span class="card-subtitle">الهيمنة السوقية</span>
                </div>
                <div class="chart-container donut-container">
                  <Doughnut v-if="brandChartReady" :data="brandChartData" :options="donutChartOptions" />
                  <div v-else class="chart-placeholder">
                    <v-progress-circular indeterminate color="pink"></v-progress-circular>
                  </div>
                </div>
              </div>
            </v-col>

            <!-- Maintenance Heatmap -->
            <v-col cols="12">
              <div class="glass-card chart-card">
                <div class="card-header">
                  <h3 class="card-title">
                    <v-icon class="me-2" color="amber">mdi-fire</v-icon>
                    خريطة الصيانة الحرارية
                  </h3>
                  <span class="card-subtitle">أكثر المهام تنفيذاً</span>
                </div>
                <div class="chart-container bar-container">
                  <Bar v-if="taskChartReady" :data="taskChartData" :options="barChartOptions" />
                  <div v-else class="chart-placeholder">
                    <v-progress-circular indeterminate color="amber"></v-progress-circular>
                  </div>
                </div>
              </div>
            </v-col>
          </v-row>
        </div>
      </v-window-item>

      <!-- Tab 2: User CRM -->
      <v-window-item value="crm">
        <div class="tab-content">
          <!-- Search & Filter -->
          <div class="glass-card mb-4 pa-4">
            <v-row align="center">
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="userSearch"
                  prepend-inner-icon="mdi-magnify"
                  label="البحث في المستخدمين..."
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="search-field"
                  clearable
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6" class="d-flex justify-end gap-2">
                <v-chip color="cyan" variant="flat">
                  <v-icon start>mdi-account</v-icon>
                  {{ adminStore.users.length }} مستخدم
                </v-chip>
                <v-chip color="pink" variant="flat">
                  <v-icon start>mdi-car</v-icon>
                  {{ adminStore.cars.length }} سيارة
                </v-chip>
              </v-col>
            </v-row>
          </div>

          <!-- Users Data Table -->
          <div class="glass-card">
            <v-data-table
              :headers="userHeaders"
              :items="filteredUsers"
              :search="userSearch"
              class="data-table"
              hover
              @click:row="openUserPanel"
            >
              <template #item.name="{ item }">
                <div class="d-flex align-center gap-3">
                  <v-avatar color="cyan" size="36">
                    <span class="text-body-2 font-weight-bold">{{ getInitials(item) }}</span>
                  </v-avatar>
                  <div>
                    <div class="font-weight-medium">{{ item.first_name }} {{ item.last_name }}</div>
                    <div class="text-caption text-medium-emphasis">{{ item.user_id?.slice(0, 8) }}...</div>
                  </div>
                </div>
              </template>
              <template #item.phone="{ item }">
                <v-btn
                  v-if="item.phone"
                  variant="text"
                  color="success"
                  size="small"
                  :href="`https://wa.me/${item.phone}`"
                  target="_blank"
                  @click.stop
                >
                  <v-icon start>mdi-whatsapp</v-icon>
                  {{ item.phone }}
                </v-btn>
                <span v-else class="text-medium-emphasis">-</span>
              </template>
              <template #item.cars="{ item }">
                <v-chip color="info" size="small" variant="tonal">
                  {{ getUserCarsCount(item.user_id) }} سيارة
                </v-chip>
              </template>
              <template #item.records="{ item }">
                <v-chip color="success" size="small" variant="tonal">
                  {{ getUserRecordsCount(item.user_id) }} صيانة
                </v-chip>
              </template>
              <template #item.created_at="{ item }">
                {{ formatDate(item.created_at) }}
              </template>
              <template #item.actions="{ item }">
                <v-btn
                  icon
                  variant="text"
                  color="cyan"
                  size="small"
                  @click.stop="openUserPanel(null, { item })"
                >
                  <v-icon>mdi-eye</v-icon>
                </v-btn>
              </template>
            </v-data-table>
          </div>
        </div>
      </v-window-item>

      <!-- Tab 3: System Forge -->
      <v-window-item value="forge">
        <div class="tab-content">
          <v-row>
            <!-- Template Manager -->
            <v-col cols="12" lg="6">
              <div class="glass-card">
                <div class="card-header pa-4">
                  <h3 class="card-title">
                    <v-icon class="me-2" color="orange">mdi-wrench-cog</v-icon>
                    قوالب الصيانة الافتراضية
                  </h3>
                  <span class="card-subtitle">المهام التي تُضاف للمستخدمين الجدد</span>
                </div>
                <v-divider></v-divider>
                <v-list class="template-list bg-transparent">
                  <v-list-item
                    v-for="template in adminStore.templates"
                    :key="template.id"
                    class="template-item"
                  >
                    <template #prepend>
                      <v-avatar color="orange" size="40" variant="tonal">
                        <v-icon>{{ template.icon || 'mdi-wrench' }}</v-icon>
                      </v-avatar>
                    </template>
                    <v-list-item-title class="font-weight-medium">{{ template.name }}</v-list-item-title>
                    <v-list-item-subtitle>
                      <span v-if="template.interval_km">{{ template.interval_km.toLocaleString() }} كم</span>
                      <span v-if="template.interval_km && template.interval_months"> / </span>
                      <span v-if="template.interval_months">{{ template.interval_months }} شهر</span>
                    </v-list-item-subtitle>
                    <template #append>
                      <v-chip :color="getPriorityColor(template.priority)" size="x-small" variant="flat">
                        {{ template.priority }}
                      </v-chip>
                    </template>
                  </v-list-item>
                </v-list>
              </div>
            </v-col>

            <!-- Broadcast Hub -->
            <v-col cols="12" lg="6">
              <div class="glass-card">
                <div class="card-header pa-4">
                  <h3 class="card-title">
                    <v-icon class="me-2" color="red">mdi-bullhorn</v-icon>
                    مركز البث
                  </h3>
                  <span class="card-subtitle">إرسال إعلانات للجميع</span>
                </div>
                <v-divider></v-divider>
                <div class="pa-4">
                  <v-form @submit.prevent="sendAnnouncement">
                    <v-text-field
                      v-model="announcementForm.title"
                      label="عنوان الإعلان"
                      variant="outlined"
                      density="compact"
                      class="mb-3"
                    ></v-text-field>
                    <v-textarea
                      v-model="announcementForm.message"
                      label="نص الإعلان"
                      variant="outlined"
                      rows="3"
                      class="mb-3"
                    ></v-textarea>
                    <v-select
                      v-model="announcementForm.type"
                      :items="announcementTypes"
                      item-title="label"
                      item-value="value"
                      label="نوع الإعلان"
                      variant="outlined"
                      density="compact"
                      class="mb-3"
                    ></v-select>
                    <v-btn
                      color="red"
                      variant="flat"
                      block
                      type="submit"
                      :loading="sendingAnnouncement"
                    >
                      <v-icon start>mdi-send</v-icon>
                      إرسال البث
                    </v-btn>
                  </v-form>
                </div>

                <!-- Recent Announcements -->
                <v-divider></v-divider>
                <div class="pa-4">
                  <div class="text-overline text-medium-emphasis mb-2">الإعلانات الأخيرة</div>
                  <div v-if="adminStore.announcements.length === 0" class="text-center py-4 text-medium-emphasis">
                    لا توجد إعلانات
                  </div>
                  <v-list v-else class="bg-transparent" density="compact">
                    <v-list-item
                      v-for="ann in adminStore.announcements.slice(0, 3)"
                      :key="ann.id"
                      class="px-0"
                    >
                      <template #prepend>
                        <v-icon :color="getAnnouncementColor(ann.type)" size="small">
                          {{ getAnnouncementIcon(ann.type) }}
                        </v-icon>
                      </template>
                      <v-list-item-title class="text-body-2">{{ ann.title }}</v-list-item-title>
                      <v-list-item-subtitle class="text-caption">
                        {{ formatDate(ann.created_at) }}
                      </v-list-item-subtitle>
                      <template #append>
                        <v-switch
                          :model-value="ann.is_active"
                          color="success"
                          density="compact"
                          hide-details
                          @update:model-value="toggleAnnouncement(ann.id, $event)"
                        ></v-switch>
                      </template>
                    </v-list-item>
                  </v-list>
                </div>
              </div>
            </v-col>
          </v-row>
        </div>
      </v-window-item>

      <!-- Tab 4: Live Activity Stream -->
      <v-window-item value="activity">
        <div class="tab-content">
          <div class="glass-card activity-stream">
            <div class="card-header pa-4 d-flex align-center">
              <div>
                <h3 class="card-title">
                  <v-icon class="me-2 pulse-icon" color="red">mdi-broadcast</v-icon>
                  البث المباشر
                </h3>
                <span class="card-subtitle">ما يحدث الآن على المنصة</span>
              </div>
              <v-spacer></v-spacer>
              <v-chip color="red" variant="flat" size="small" class="live-indicator">
                <v-icon start size="10" class="blink">mdi-circle</v-icon>
                مباشر
              </v-chip>
            </div>
            <v-divider></v-divider>
            
            <div class="activity-list">
              <transition-group name="activity-fade">
                <div
                  v-for="activity in adminStore.activityFeed"
                  :key="activity.id"
                  class="activity-item"
                >
                  <div class="activity-icon" :class="`bg-${getActivityColor(activity.action)}`">
                    <v-icon size="18" color="white">{{ getActivityIcon(activity.action) }}</v-icon>
                  </div>
                  <div class="activity-content">
                    <div class="activity-text">
                      <span class="user-name">{{ getActivityUserName(activity) }}</span>
                      {{ getActivityText(activity) }}
                    </div>
                    <div class="activity-time">{{ formatTimeAgo(activity.created_at) }}</div>
                  </div>
                </div>
              </transition-group>
              
              <div v-if="adminStore.activityFeed.length === 0" class="text-center py-8 text-medium-emphasis">
                <v-icon size="48" class="mb-2">mdi-sleep</v-icon>
                <div>لا نشاط حتى الآن</div>
              </div>
            </div>
          </div>
        </div>
      </v-window-item>
    </v-window>

    <!-- User Details Side Panel -->
    <v-navigation-drawer
      v-model="showUserPanel"
      location="left"
      temporary
      width="500"
      class="user-panel"
    >
      <template v-if="selectedUser">
        <div class="panel-header">
          <v-btn icon variant="text" @click="showUserPanel = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
          <span class="text-h6">تفاصيل المستخدم</span>
        </div>

        <!-- User Profile Section -->
        <div class="panel-section">
          <div class="d-flex align-center gap-4 mb-4">
            <v-avatar color="cyan" size="64">
              <span class="text-h5 font-weight-bold">{{ getInitials(selectedUser) }}</span>
            </v-avatar>
            <div>
              <div class="text-h6 font-weight-bold">{{ selectedUser.first_name }} {{ selectedUser.last_name }}</div>
              <div class="text-caption text-medium-emphasis">{{ selectedUser.user_id }}</div>
            </div>
          </div>
          
          <div class="info-grid">
            <div class="info-item">
              <v-icon color="cyan" size="20">mdi-phone</v-icon>
              <span>{{ selectedUser.phone || 'غير متوفر' }}</span>
              <v-btn
                v-if="selectedUser.phone"
                icon
                variant="text"
                color="success"
                size="x-small"
                :href="`https://wa.me/${selectedUser.phone}`"
                target="_blank"
              >
                <v-icon size="16">mdi-whatsapp</v-icon>
              </v-btn>
            </div>
            <div class="info-item">
              <v-icon color="cyan" size="20">mdi-calendar</v-icon>
              <span>انضم {{ formatDate(selectedUser.created_at) }}</span>
            </div>
          </div>
        </div>

        <v-divider></v-divider>

        <!-- User's Cars -->
        <div class="panel-section">
          <div class="section-title">
            <v-icon color="info" class="me-2">mdi-car-multiple</v-icon>
            السيارات ({{ selectedUserCars.length }})
          </div>
          <div v-if="selectedUserCars.length === 0" class="text-center py-4 text-medium-emphasis">
            لا توجد سيارات
          </div>
          <div v-else class="cars-list">
            <div v-for="car in selectedUserCars" :key="car.id" class="car-item">
              <v-img
                v-if="car.image"
                :src="car.image"
                height="80"
                cover
                class="car-image rounded-lg"
              ></v-img>
              <div v-else class="car-placeholder-img">
                <v-icon size="32" color="grey">mdi-car</v-icon>
              </div>
              <div class="car-info">
                <div class="font-weight-bold">{{ car.make }} {{ car.model }}</div>
                <div class="text-caption text-medium-emphasis">{{ car.year }} • {{ car.plate_number }}</div>
                <v-chip size="x-small" color="cyan" variant="tonal">
                  {{ (car.current_odometer || 0).toLocaleString() }} كم
                </v-chip>
              </div>
            </div>
          </div>
        </div>

        <v-divider></v-divider>

        <!-- Maintenance History -->
        <div class="panel-section">
          <div class="section-title">
            <v-icon color="success" class="me-2">mdi-history</v-icon>
            سجل الصيانة ({{ selectedUserRecords.length }})
          </div>
          <div v-if="selectedUserRecords.length === 0" class="text-center py-4 text-medium-emphasis">
            لا توجد سجلات
          </div>
          <v-timeline v-else density="compact" side="end" class="history-timeline">
            <v-timeline-item
              v-for="record in selectedUserRecords.slice(0, 5)"
              :key="record.id"
              size="small"
              dot-color="success"
            >
              <div class="timeline-content">
                <div class="font-weight-medium">{{ record.task_name }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ formatDate(record.date) }} • {{ (record.cost || 0).toLocaleString() }} ر.س
                </div>
              </div>
            </v-timeline-item>
          </v-timeline>
        </div>

        <v-divider></v-divider>

        <!-- Documents -->
        <div class="panel-section">
          <div class="section-title">
            <v-icon color="warning" class="me-2">mdi-file-document-multiple</v-icon>
            المستندات ({{ selectedUserDocuments.length }})
          </div>
          <div v-if="selectedUserDocuments.length === 0" class="text-center py-4 text-medium-emphasis">
            لا توجد مستندات
          </div>
          <div v-else class="docs-grid">
            <div
              v-for="doc in selectedUserDocuments"
              :key="doc.id"
              class="doc-item"
              @click="viewDocument(doc)"
            >
              <v-icon size="24" :color="getDocTypeColor(doc.type)">{{ getDocTypeIcon(doc.type) }}</v-icon>
              <div class="doc-type">{{ doc.type }}</div>
              <div class="doc-expiry text-caption">
                {{ doc.expiry_date ? formatDate(doc.expiry_date) : '-' }}
              </div>
            </div>
          </div>
        </div>
      </template>
    </v-navigation-drawer>

    <!-- Document Viewer Dialog -->
    <v-dialog v-model="showDocViewer" max-width="800">
      <v-card v-if="selectedDocument" class="glass-card">
        <v-card-title class="d-flex justify-space-between align-center">
          <span>{{ selectedDocument.type }}</span>
          <v-btn icon variant="text" @click="showDocViewer = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <v-img
            v-if="selectedDocument.image"
            :src="selectedDocument.image"
            max-height="500"
            contain
          ></v-img>
          <div v-else class="text-center py-8 text-medium-emphasis">
            لا توجد صورة
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" location="bottom">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminStore } from '@/stores/admin'
import { Line, Doughnut, Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/ar'

dayjs.extend(relativeTime)
dayjs.locale('ar')

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const router = useRouter()
const adminStore = useAdminStore()

// Navigation
function returnToApp() {
  router.push({ name: 'dashboard' })
}

// State
const activeTab = ref('analytics')
const userSearch = ref('')
const showUserPanel = ref(false)
const selectedUser = ref(null)
const showDocViewer = ref(false)
const selectedDocument = ref(null)
const sendingAnnouncement = ref(false)
const snackbar = ref({ show: false, text: '', color: 'success' })

// Chart ready states
const growthChartReady = ref(false)
const brandChartReady = ref(false)
const taskChartReady = ref(false)

// Announcement form
const announcementForm = ref({
  title: '',
  message: '',
  type: 'info'
})

const announcementTypes = [
  { label: 'معلومات', value: 'info' },
  { label: 'تحذير', value: 'warning' },
  { label: 'نجاح', value: 'success' },
  { label: 'خطأ', value: 'error' }
]

// User table headers
const userHeaders = [
  { title: 'المستخدم', key: 'name', sortable: true },
  { title: 'الهاتف', key: 'phone', sortable: false },
  { title: 'السيارات', key: 'cars', sortable: false },
  { title: 'الصيانات', key: 'records', sortable: false },
  { title: 'تاريخ الانضمام', key: 'created_at', sortable: true },
  { title: '', key: 'actions', sortable: false }
]

// Computed
const heroStats = computed(() => [
  {
    title: 'إجمالي المستخدمين',
    value: adminStore.analytics.totalUsers.toLocaleString(),
    icon: 'mdi-account-group',
    color: 'cyan',
    growth: adminStore.analytics.last24hGrowth
  },
  {
    title: 'حجم الأسطول',
    value: adminStore.analytics.totalCars.toLocaleString(),
    icon: 'mdi-car-multiple',
    color: 'pink'
  },
  {
    title: 'حجم الصيانة',
    value: adminStore.analytics.totalRecords.toLocaleString(),
    icon: 'mdi-wrench',
    color: 'amber'
  },
  {
    title: 'التأثير الاقتصادي',
    value: `${adminStore.analytics.totalCost.toLocaleString()} ر.س`,
    icon: 'mdi-cash-multiple',
    color: 'green'
  }
])

const filteredUsers = computed(() => {
  if (!userSearch.value) return adminStore.users
  const search = userSearch.value.toLowerCase()
  return adminStore.users.filter(u =>
    (u.first_name?.toLowerCase().includes(search)) ||
    (u.last_name?.toLowerCase().includes(search)) ||
    (u.phone?.includes(search))
  )
})

const selectedUserCars = computed(() => {
  if (!selectedUser.value) return []
  return adminStore.getCarsForUser(selectedUser.value.user_id)
})

const selectedUserRecords = computed(() => {
  if (!selectedUser.value) return []
  return adminStore.getRecordsForUser(selectedUser.value.user_id)
})

const selectedUserDocuments = computed(() => {
  if (!selectedUser.value) return []
  return adminStore.getDocumentsForUser(selectedUser.value.user_id)
})

// Chart Data
const growthChartData = computed(() => {
  const labels = adminStore.analytics.userGrowth.map(d => 
    dayjs(d.date).format('DD/MM')
  )
  
  return {
    labels,
    datasets: [
      {
        label: 'المستخدمين الجدد',
        data: adminStore.analytics.userGrowth.map(d => d.count),
        borderColor: '#00BCD4',
        backgroundColor: 'rgba(0, 188, 212, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'السيارات الجديدة',
        data: adminStore.analytics.carGrowth.map(d => d.count),
        borderColor: '#E91E63',
        backgroundColor: 'rgba(233, 30, 99, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  }
})

const brandChartData = computed(() => {
  const brands = adminStore.analytics.brandDistribution
  const labels = Object.keys(brands)
  const data = Object.values(brands)
  
  return {
    labels,
    datasets: [{
      data,
      backgroundColor: [
        '#00BCD4', '#E91E63', '#FFC107', '#4CAF50', '#9C27B0',
        '#FF5722', '#2196F3', '#795548', '#607D8B', '#FF9800'
      ]
    }]
  }
})

const taskChartData = computed(() => {
  const tasks = adminStore.analytics.taskDistribution
  const sortedTasks = Object.entries(tasks)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
  
  return {
    labels: sortedTasks.map(t => t[0]),
    datasets: [{
      label: 'عدد المرات',
      data: sortedTasks.map(t => t[1]),
      backgroundColor: 'rgba(255, 193, 7, 0.8)',
      borderColor: '#FFC107',
      borderWidth: 1,
      borderRadius: 8
    }]
  }
})

// Chart Options
const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      labels: { color: 'rgba(255,255,255,0.7)' }
    }
  },
  scales: {
    x: {
      grid: { color: 'rgba(255,255,255,0.05)' },
      ticks: { color: 'rgba(255,255,255,0.5)' }
    },
    y: {
      grid: { color: 'rgba(255,255,255,0.05)' },
      ticks: { color: 'rgba(255,255,255,0.5)' }
    }
  }
}

const donutChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { color: 'rgba(255,255,255,0.7)', padding: 15 }
    }
  }
}

const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y',
  plugins: {
    legend: { display: false }
  },
  scales: {
    x: {
      grid: { color: 'rgba(255,255,255,0.05)' },
      ticks: { color: 'rgba(255,255,255,0.5)' }
    },
    y: {
      grid: { display: false },
      ticks: { color: 'rgba(255,255,255,0.7)' }
    }
  }
}

// Methods
function getInitials(user) {
  const first = user.first_name?.charAt(0) || ''
  const last = user.last_name?.charAt(0) || ''
  return (first + last).toUpperCase() || '?'
}

function getUserCarsCount(userId) {
  return adminStore.cars.filter(c => c.user_id === userId).length
}

function getUserRecordsCount(userId) {
  return adminStore.records.filter(r => r.user_id === userId).length
}

function formatDate(date) {
  return dayjs(date).format('DD/MM/YYYY')
}

function formatTimeAgo(date) {
  return dayjs(date).fromNow()
}

function openUserPanel(event, { item }) {
  selectedUser.value = item
  showUserPanel.value = true
}

function viewDocument(doc) {
  selectedDocument.value = doc
  showDocViewer.value = true
}

function getPriorityColor(priority) {
  const colors = { high: 'error', medium: 'warning', low: 'info' }
  return colors[priority] || 'grey'
}

function getAnnouncementColor(type) {
  const colors = { info: 'info', warning: 'warning', success: 'success', error: 'error' }
  return colors[type] || 'grey'
}

function getAnnouncementIcon(type) {
  const icons = {
    info: 'mdi-information',
    warning: 'mdi-alert',
    success: 'mdi-check-circle',
    error: 'mdi-alert-circle'
  }
  return icons[type] || 'mdi-bell'
}

function getDocTypeIcon(type) {
  const icons = {
    'استمارة': 'mdi-card-account-details',
    'تأمين': 'mdi-shield-check',
    'رخصة': 'mdi-license',
    'فحص': 'mdi-clipboard-check'
  }
  return icons[type] || 'mdi-file-document'
}

function getDocTypeColor(type) {
  const colors = {
    'استمارة': 'cyan',
    'تأمين': 'green',
    'رخصة': 'orange',
    'فحص': 'purple'
  }
  return colors[type] || 'grey'
}

function getActivityColor(action) {
  const colors = {
    added_car: 'cyan',
    updated_car: 'info',
    recorded_maintenance: 'success',
    updated_odometer: 'amber'
  }
  return colors[action] || 'grey'
}

function getActivityIcon(action) {
  const icons = {
    added_car: 'mdi-car-plus',
    updated_car: 'mdi-car-cog',
    recorded_maintenance: 'mdi-wrench-check',
    updated_odometer: 'mdi-speedometer'
  }
  return icons[action] || 'mdi-bell'
}

function getActivityUserName(activity) {
  const profile = activity.profiles
  if (profile) {
    return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'مستخدم'
  }
  return 'مستخدم'
}

function getActivityText(activity) {
  const texts = {
    added_car: `أضاف سيارة جديدة (${activity.details?.make || ''} ${activity.details?.model || ''})`,
    updated_car: `حدّث بيانات سيارته`,
    recorded_maintenance: `سجّل صيانة (${activity.details?.task_name || ''})`,
    updated_odometer: `حدّث العداد إلى ${(activity.details?.reading || 0).toLocaleString()} كم`
  }
  return texts[activity.action] || 'قام بنشاط'
}

async function sendAnnouncement() {
  if (!announcementForm.value.title || !announcementForm.value.message) {
    snackbar.value = { show: true, text: 'يرجى ملء جميع الحقول', color: 'warning' }
    return
  }

  sendingAnnouncement.value = true
  const result = await adminStore.postAnnouncement(announcementForm.value)
  sendingAnnouncement.value = false

  if (result.success) {
    snackbar.value = { show: true, text: 'تم إرسال الإعلان بنجاح', color: 'success' }
    announcementForm.value = { title: '', message: '', type: 'info' }
  } else {
    snackbar.value = { show: true, text: 'فشل في إرسال الإعلان', color: 'error' }
  }
}

async function toggleAnnouncement(id, isActive) {
  await adminStore.toggleAnnouncement(id, isActive)
}

// Lifecycle
onMounted(async () => {
  // Fetch all data
  await adminStore.fetchAnalytics()
  await adminStore.fetchAnnouncements()
  await adminStore.fetchTemplates()
  await adminStore.fetchActivityFeed()

  // Enable real-time subscription
  adminStore.subscribeToActivity()

  // Set chart ready states
  setTimeout(() => {
    growthChartReady.value = true
    brandChartReady.value = true
    taskChartReady.value = true
  }, 300)
})

onUnmounted(() => {
  adminStore.unsubscribeFromActivity()
})
</script>

<style scoped>
/* Import Arabic font */
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap');

.control-tower {
  font-family: 'Tajawal', sans-serif;
  min-height: 100vh;
  background: linear-gradient(135deg, #0a1628 0%, #0d0d1a 50%, #000000 100%);
  padding-bottom: 40px;
}

/* Header Styles */
.tower-header {
  position: relative;
  padding: 32px 24px;
  margin-bottom: 24px;
  overflow: hidden;
}

.header-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(0, 188, 212, 0.15) 0%, rgba(156, 39, 176, 0.1) 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.header-content {
  position: relative;
  z-index: 1;
}

.header-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: linear-gradient(135deg, #00BCD4, #9C27B0);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 32px rgba(0, 188, 212, 0.3);
}

.text-white-70 {
  color: rgba(255, 255, 255, 0.7);
}

/* Return Button */
.return-btn {
  border-color: rgba(255, 255, 255, 0.4) !important;
  color: white !important;
  font-weight: 500;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.return-btn:hover {
  background: rgba(255, 255, 255, 0.15) !important;
  border-color: rgba(255, 255, 255, 0.8) !important;
  transform: translateX(4px);
}

/* Tabs */
.tower-tabs {
  margin: 0 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.tab-item {
  color: rgba(255, 255, 255, 0.6) !important;
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
}

.tab-item:hover {
  color: rgba(255, 255, 255, 0.9) !important;
}

.tab-window {
  padding: 24px;
}

.tab-content {
  max-width: 1600px;
  margin: 0 auto;
}

/* Hero Stats */
.hero-stat-card {
  position: relative;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 24px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.hero-stat-card:hover {
  transform: translateY(-4px);
  border-color: rgba(255, 255, 255, 0.15);
}

.stat-glow {
  position: absolute;
  top: -50%;
  right: -50%;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  opacity: 0.15;
  filter: blur(60px);
  transition: opacity 0.3s ease;
}

.glow-cyan .stat-glow { background: #00BCD4; }
.glow-pink .stat-glow { background: #E91E63; }
.glow-amber .stat-glow { background: #FFC107; }
.glow-green .stat-glow { background: #4CAF50; }

.hero-stat-card:hover .stat-glow {
  opacity: 0.25;
}

.stat-content {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.stat-icon-wrapper {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.bg-cyan { background: linear-gradient(135deg, #00BCD4, #0097A7); }
.bg-pink { background: linear-gradient(135deg, #E91E63, #C2185B); }
.bg-amber { background: linear-gradient(135deg, #FFC107, #FFA000); }
.bg-green { background: linear-gradient(135deg, #4CAF50, #388E3C); }
.bg-info { background: linear-gradient(135deg, #2196F3, #1976D2); }
.bg-success { background: linear-gradient(135deg, #4CAF50, #388E3C); }
.bg-warning { background: linear-gradient(135deg, #FF9800, #F57C00); }
.bg-error { background: linear-gradient(135deg, #f44336, #D32F2F); }

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  line-height: 1.2;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}

.stat-growth {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 20px;
}

.stat-growth.positive {
  background: rgba(76, 175, 80, 0.2);
  color: #4CAF50;
}

.stat-growth.negative {
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
}

/* Glass Cards */
.glass-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  backdrop-filter: blur(20px);
  overflow: hidden;
}

.chart-card {
  height: 100%;
}

.card-header {
  padding: 20px 24px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  display: flex;
  align-items: center;
  margin: 0;
}

.card-subtitle {
  display: block;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 4px;
}

.chart-container {
  padding: 0 24px 24px;
  height: 280px;
}

.donut-container {
  height: 300px;
}

.bar-container {
  height: 320px;
}

.chart-placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Data Table */
.data-table {
  background: transparent !important;
}

.data-table :deep(.v-table__wrapper) {
  background: transparent;
}

.data-table :deep(th) {
  background: rgba(255, 255, 255, 0.03) !important;
  color: rgba(255, 255, 255, 0.7) !important;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
}

.data-table :deep(td) {
  color: rgba(255, 255, 255, 0.9) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
}

.data-table :deep(tr:hover td) {
  background: rgba(255, 255, 255, 0.05) !important;
  cursor: pointer;
}

.search-field :deep(.v-field) {
  background: rgba(255, 255, 255, 0.05);
}

/* Template List */
.template-list {
  max-height: 400px;
  overflow-y: auto;
}

.template-item {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

/* Activity Stream */
.activity-stream {
  min-height: 500px;
}

.activity-list {
  max-height: 600px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background 0.2s ease;
}

.activity-item:hover {
  background: rgba(255, 255, 255, 0.03);
}

.activity-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
}

.activity-text {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  margin-bottom: 4px;
}

.user-name {
  font-weight: 600;
  color: #00BCD4;
}

.activity-time {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.live-indicator {
  animation: pulse 2s infinite;
}

.blink {
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0.3; }
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(244, 67, 54, 0); }
  100% { box-shadow: 0 0 0 0 rgba(244, 67, 54, 0); }
}

.pulse-icon {
  animation: pulse-icon 2s infinite;
}

@keyframes pulse-icon {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Activity Transition */
.activity-fade-enter-active {
  transition: all 0.3s ease;
}

.activity-fade-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

/* User Panel */
.user-panel {
  background: linear-gradient(180deg, #0a1628 0%, #0d0d1a 100%) !important;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff;
}

.panel-section {
  padding: 20px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

.cars-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.car-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
}

.car-image {
  width: 100px;
  flex-shrink: 0;
}

.car-placeholder-img {
  width: 100px;
  height: 80px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.car-info {
  flex: 1;
  color: rgba(255, 255, 255, 0.9);
}

.history-timeline {
  padding: 0 !important;
}

.timeline-content {
  color: rgba(255, 255, 255, 0.9);
}

.docs-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.doc-item {
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.doc-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.doc-type {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 8px;
}

.doc-expiry {
  color: rgba(255, 255, 255, 0.5);
}
</style>
