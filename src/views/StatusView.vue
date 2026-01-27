<template>
  <div class="status-page">
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      <p class="text-body-1 mt-4">جاري تحميل البيانات...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state text-center">
      <div class="error-icon mx-auto mb-4">
        <v-icon size="64" color="error">mdi-alert-circle</v-icon>
      </div>
      <h2 class="text-h5 font-weight-bold mb-2">عذراً!</h2>
      <p class="text-body-1 text-medium-emphasis mb-6">{{ error }}</p>
      <v-btn color="primary" to="/">العودة للصفحة الرئيسية</v-btn>
    </div>

    <!-- Status Content -->
    <div v-else-if="car" class="status-content">
      <!-- Header -->
      <div class="status-header text-center pa-6">
        <div class="car-badge mx-auto mb-4">
          <v-icon size="40" color="white">mdi-car</v-icon>
        </div>
        <h1 class="text-h4 font-weight-bold text-white mb-2">
          {{ car.make }} {{ car.model }}
        </h1>
        <v-chip color="primary" variant="flat" size="large" class="px-4">
          {{ car.year }}
        </v-chip>
      </div>

      <!-- Odometer Card -->
      <v-container class="pa-4">
        <v-card class="odometer-card mb-4">
          <v-card-text class="text-center pa-6">
            <v-icon size="32" color="primary" class="mb-2">mdi-speedometer</v-icon>
            <div class="text-h3 font-weight-bold text-primary mb-1">
              {{ car.current_odometer?.toLocaleString() || 0 }}
            </div>
            <div class="text-body-2 text-medium-emphasis">كيلومتر</div>
          </v-card-text>
        </v-card>

        <!-- Status Cards Grid -->
        <v-row>
          <v-col v-for="status in statusCards" :key="status.title" cols="6">
            <v-card 
              class="status-card h-100" 
              :class="`border-${status.color}`"
            >
              <v-card-text class="text-center pa-4">
                <div 
                  class="status-icon mx-auto mb-2"
                  :class="`bg-${status.color}`"
                >
                  <v-icon color="white" size="20">{{ status.icon }}</v-icon>
                </div>
                <div class="text-body-2 font-weight-bold mb-1">{{ status.title }}</div>
                <v-chip 
                  :color="status.color" 
                  size="small" 
                  variant="tonal"
                >
                  {{ status.label }}
                </v-chip>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Documents Status -->
        <v-card class="mt-4" v-if="documents.length > 0">
          <v-card-title class="pa-4">
            <v-icon color="info" class="me-2">mdi-file-document-multiple</v-icon>
            الوثائق
          </v-card-title>
          <v-divider></v-divider>
          <v-list class="bg-transparent">
            <v-list-item 
              v-for="doc in documents" 
              :key="doc.id"
              class="px-4"
            >
              <template #prepend>
                <v-avatar :color="getDocStatusColor(doc)" size="36" variant="tonal">
                  <v-icon size="18">{{ getDocIcon(doc.type) }}</v-icon>
                </v-avatar>
              </template>
              <v-list-item-title class="font-weight-medium">
                {{ getDocLabel(doc.type) }}
              </v-list-item-title>
              <v-list-item-subtitle>
                {{ getDocStatus(doc) }}
              </v-list-item-subtitle>
              <template #append>
                <v-chip 
                  :color="getDocStatusColor(doc)" 
                  size="x-small" 
                  variant="flat"
                >
                  {{ getDocStatusLabel(doc) }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
        </v-card>

        <!-- Last Updated -->
        <div class="last-updated text-center mt-6 mb-4">
          <v-icon size="16" class="me-1">mdi-clock-outline</v-icon>
          <span class="text-caption text-medium-emphasis">
            آخر تحديث: {{ formatDate(car.updated_at) }}
          </span>
        </div>
      </v-container>

      <!-- Footer -->
      <div class="status-footer text-center pa-6">
        <div class="d-flex align-center justify-center gap-2 mb-2">
          <v-img :src="ayarLogo" width="24" height="24" contain></v-img>
          <span class="text-body-2 font-weight-bold text-primary">عيار</span>
        </div>
        <p class="text-caption text-medium-emphasis">
          نظام ذكي لإدارة صيانة السيارات
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '@/lib/supabase'
import ayarLogo from '@/assets/ayar-logo.png'
import dayjs from 'dayjs'
import 'dayjs/locale/ar'

dayjs.locale('ar')

const route = useRoute()

// State
const car = ref(null)
const tasks = ref([])
const documents = ref([])
const loading = ref(true)
const error = ref(null)

// Fetch data on mount
onMounted(async () => {
  const shareToken = route.params.token
  
  if (!shareToken) {
    error.value = 'رابط غير صالح'
    loading.value = false
    return
  }

  try {
    // Fetch car by share token
    const { data: carData, error: carError } = await supabase
      .from('cars')
      .select('*')
      .eq('share_token', shareToken)
      .eq('public_share_enabled', true)
      .maybeSingle()

    if (carError || !carData) {
      error.value = 'لم يتم العثور على السيارة أو المشاركة غير مفعلة'
      loading.value = false
      return
    }

    car.value = carData

    // Fetch tasks for this car
    const { data: tasksData } = await supabase
      .from('maintenance_tasks')
      .select('*')
      .eq('car_id', carData.id)

    if (tasksData) {
      tasks.value = tasksData
    }

    // Fetch documents for this car
    const { data: docsData } = await supabase
      .from('documents')
      .select('*')
      .eq('car_id', carData.id)

    if (docsData) {
      documents.value = docsData
    }

  } catch (err) {
    error.value = 'حدث خطأ في تحميل البيانات'
    console.error('Error fetching car status:', err)
  } finally {
    loading.value = false
  }
})

// Status cards computed
const statusCards = computed(() => {
  const oilTask = tasks.value.find(t => t.name?.includes('زيت'))
  const brakeTask = tasks.value.find(t => t.name?.includes('فرامل'))
  const tireTask = tasks.value.find(t => t.name?.includes('إطار'))
  const airFilter = tasks.value.find(t => t.name?.includes('فلتر'))

  return [
    {
      title: 'الزيت',
      icon: 'mdi-oil',
      ...getTaskStatus(oilTask)
    },
    {
      title: 'الفرامل',
      icon: 'mdi-car-brake-abs',
      ...getTaskStatus(brakeTask)
    },
    {
      title: 'الإطارات',
      icon: 'mdi-tire',
      ...getTaskStatus(tireTask)
    },
    {
      title: 'الفلتر',
      icon: 'mdi-air-filter',
      ...getTaskStatus(airFilter)
    }
  ]
})

function getTaskStatus(task) {
  if (!task) {
    return { label: 'غير محدد', color: 'grey' }
  }

  // Calculate progress based on last maintenance
  const currentOdometer = car.value?.current_odometer || 0
  const lastOdometer = task.last_maintenance_odometer || 0
  const interval = task.interval_km || 5000
  const kmSinceLast = currentOdometer - lastOdometer
  const progress = (kmSinceLast / interval) * 100

  if (progress >= 100) {
    return { label: 'يحتاج صيانة', color: 'error' }
  } else if (progress >= 90) {
    return { label: 'قريب', color: 'warning' }
  } else if (progress >= 75) {
    return { label: 'متوسط', color: 'amber' }
  } else {
    return { label: 'جيد', color: 'success' }
  }
}

function getDocLabel(type) {
  const labels = {
    license: 'رخصة القيادة',
    registration: 'استمارة السيارة',
    insurance: 'التأمين'
  }
  return labels[type] || type
}

function getDocIcon(type) {
  const icons = {
    license: 'mdi-card-account-details',
    registration: 'mdi-file-document',
    insurance: 'mdi-shield-car'
  }
  return icons[type] || 'mdi-file'
}

function getDocStatus(doc) {
  if (!doc.expiry_date) return 'لا يوجد تاريخ انتهاء'
  const expiry = dayjs(doc.expiry_date)
  const today = dayjs()
  const daysLeft = expiry.diff(today, 'day')
  
  if (daysLeft < 0) {
    return `منتهية منذ ${Math.abs(daysLeft)} يوم`
  } else if (daysLeft === 0) {
    return 'تنتهي اليوم'
  } else {
    return `تنتهي خلال ${daysLeft} يوم`
  }
}

function getDocStatusLabel(doc) {
  if (!doc.expiry_date) return 'غير محدد'
  const expiry = dayjs(doc.expiry_date)
  const today = dayjs()
  const daysLeft = expiry.diff(today, 'day')
  
  if (daysLeft < 0) return 'منتهية'
  if (daysLeft <= 30) return 'قريبة'
  return 'سارية'
}

function getDocStatusColor(doc) {
  if (!doc.expiry_date) return 'grey'
  const expiry = dayjs(doc.expiry_date)
  const today = dayjs()
  const daysLeft = expiry.diff(today, 'day')
  
  if (daysLeft < 0) return 'error'
  if (daysLeft <= 30) return 'warning'
  return 'success'
}

function formatDate(date) {
  if (!date) return 'غير محدد'
  return dayjs(date).format('DD/MM/YYYY - HH:mm')
}
</script>

<style scoped>
.status-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #0a1929 0%, #1a2744 50%, #0d2137 100%);
  color: white;
}

.loading-state,
.error-state {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.status-header {
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.3), rgba(25, 118, 210, 0.1));
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.car-badge {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  background: linear-gradient(135deg, #1976D2, #1565C0);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 32px rgba(25, 118, 210, 0.4);
}

.odometer-card {
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
}

.status-card {
  background: rgba(255, 255, 255, 0.05) !important;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.status-card.border-success { border-color: rgba(76, 175, 80, 0.5); }
.status-card.border-warning { border-color: rgba(255, 152, 0, 0.5); }
.status-card.border-error { border-color: rgba(244, 67, 54, 0.5); }
.status-card.border-amber { border-color: rgba(255, 193, 7, 0.5); }
.status-card.border-grey { border-color: rgba(158, 158, 158, 0.5); }

.status-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.2);
}

.last-updated {
  color: rgba(255, 255, 255, 0.6);
}

:deep(.v-card) {
  background: rgba(255, 255, 255, 0.05) !important;
  color: white;
}

:deep(.v-list) {
  background: transparent !important;
}

:deep(.v-list-item-title),
:deep(.v-list-item-subtitle) {
  color: rgba(255, 255, 255, 0.9) !important;
}

:deep(.v-card-title) {
  color: white;
}
</style>
