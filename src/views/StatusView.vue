<template>
  <div class="status-page">
    <div class="status-gradient-bg"></div>
    
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="loader-content text-center">
        <v-progress-circular indeterminate color="cyan-accent-3" size="64" width="6"></v-progress-circular>
        <p class="text-h6 mt-6 font-weight-light text-cyan-accent-1">جاري تحميل الجواز الرقمي...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container d-flex flex-column align-center justify-center h-100 pa-6">
      <v-icon size="80" color="red-accent-2" class="mb-4">mdi-shield-alert-outline</v-icon>
      <h2 class="text-h4 font-weight-bold mb-2">الرابط غير صالح</h2>
      <p class="text-body-1 opacity-70 text-center mb-6">لا يمكن الوصول لبيانات السيارة. قد يكون الرابط منتهياً أو غير صحيح.</p>
    </div>

    <!-- Digital Passport Content -->
    <v-main v-else-if="car" class="passport-content pa-0">
      <div class="hero-section">
        <v-img
          :src="car.image || 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=2070&auto=format&fit=crop'"
          cover
          height="100%"
          class="hero-image"
        >
          <div class="hero-overlay"></div>
          <div class="hero-content d-flex flex-column justify-end h-100 pa-6 pb-12 position-relative">
            <v-chip color="cyan-accent-3" variant="flat" class="align-self-start mb-4 font-weight-bold">
              {{ car.year }}
            </v-chip>
            <h1 class="text-h2 font-weight-black text-white mb-2 brand-font text-wrap">
              {{ car.make }} {{ car.model }}
            </h1>

          </div>
        </v-img>
      </div>

      <v-container class="content-container position-relative z-index-2">
        <!-- Odometer Hero Card -->
        <v-card class="passport-card hero-stat-card mb-6" elevation="10">
          <v-card-text class="d-flex align-center justify-space-between pa-6 pa-md-8">
            <div>
              <div class="text-overline text-cyan-accent-1 mb-1">عداد المسافات الحالي</div>
              <div class="d-flex align-baseline">
                <span class="text-h3 font-weight-black text-white me-2 font-number">
                  {{ car.current_odometer?.toLocaleString() || 0 }}
                </span>
                <span class="text-h6 opacity-70">كم</span>
              </div>
            </div>
            <div class="hero-icon-wrapper">
              <v-icon size="48" color="cyan-accent-3">mdi-speedometer</v-icon>
            </div>
          </v-card-text>
        </v-card>

        <!-- Maintenance Grid -->
        <div class="text-h5 font-weight-bold mb-4 d-flex align-center">
          <v-icon color="cyan-accent-3" class="me-2">mdi-wrench-clock</v-icon>
          حالة الصيانة
        </div>
        
        <template v-if="statusCards.length > 0">
          <v-row>
            <v-col cols="12" sm="6" v-for="task in statusCards" :key="task.title">
              <v-card class="passport-card h-100" hover>
                <v-card-text class="pa-5">
                  <div class="d-flex justify-space-between align-start mb-4">
                    <div class="d-flex align-center">
                      <div class="icon-box me-3" :class="`bg-${task.color}-darken`">
                        <v-icon :color="task.color">{{ task.icon }}</v-icon>
                      </div>
                      <div>
                        <div class="text-h6 font-weight-bold">{{ task.title }}</div>
                        <div class="text-caption opacity-60">{{ task.name }}</div>
                      </div>
                    </div>
                    <v-chip :color="task.color" size="small" variant="flat" class="font-weight-bold">
                      {{ task.label }}
                    </v-chip>
                  </div>
                  
                  <div class="status-metrics mt-4 pt-4 border-t">
                    <div class="d-flex justify-space-between text-body-2 mb-2">
                      <span class="opacity-70">آخر تغيير:</span>
                      <span class="font-weight-medium font-number">{{ task.lastKm.toLocaleString() }} كم</span>
                    </div>
                    <div class="d-flex justify-space-between text-body-2">
                      <span class="opacity-70">المتبقي:</span>
                      <span class="font-weight-bold font-number" :class="`text-${task.color}`">
                        {{ task.remainingKm > 0 ? task.remainingKm.toLocaleString() : 0 }} كم
                      </span>
                    </div>
                    <v-progress-linear
                      :model-value="task.progress"
                      :color="task.color"
                      height="4"
                      rounded
                      class="mt-3"
                    ></v-progress-linear>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </template>
        
        <div v-else class="text-center py-12 opacity-60">
          <v-icon size="64" color="grey" class="mb-4">mdi-clipboard-text-off-outline</v-icon>
          <div class="text-h6">لا توجد مهام صيانة مجدولة</div>
          <p class="text-body-2">سجل الصيانة لهذه المركبة نظيف حالياً</p>
        </div>
        


        <!-- Footer -->
        <div class="text-center mt-12 mb-6 opacity-50">
          <v-img :src="ayarLogo" width="30" class="mx-auto mb-2 opacity-80"></v-img>
          <p class="text-caption">Ayar Digital Passport</p>
        </div>
      </v-container>
    </v-main>
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
    
    // Sort tasks by logic (Late -> Recent) if needed, otherwise use default order
    if (carData.maintenance_tasks && carData.maintenance_tasks.length > 0) {
       tasks.value = carData.maintenance_tasks.sort((a, b) => {
         // Sort by priority or ID for stable view
         return b.id - a.id 
       })
       console.log('Tasks loaded:', tasks.value)
    } else {
       console.warn('No maintenance tasks found embedded in car data')
       tasks.value = [] // Ensure empty array
    }

  } catch (err) {
    error.value = 'حدث خطأ في تحميل البيانات'
    console.error('Error fetching car status:', err)
  } finally {
    loading.value = false
  }
})

const statusCards = computed(() => {
  return tasks.value.map(task => {
    return {
      title: task.name,
      icon: getTaskIcon(task.name),
      name: task.name,
      ...getTaskMetrics(task)
    }
  })
})

function getTaskIcon(name) {
  if (!name) return 'mdi-wrench'
  const n = name.toLowerCase()
  if (n.includes('زيت') || n.includes('oil')) return 'mdi-oil'
  if (n.includes('فرامل') || n.includes('brake')) return 'mdi-car-brake-abs'
  if (n.includes('إطار') || n.includes('كفر') || n.includes('tire')) return 'mdi-tire'
  if (n.includes('فلتر') || n.includes('filter')) return 'mdi-air-filter'
  if (n.includes('بطارية') || n.includes('battery')) return 'mdi-car-battery'
  if (n.includes('سيور') || n.includes('belt')) return 'mdi-engine-belt'
  if (n.includes('بواجي') || n.includes('spark')) return 'mdi-car-spark-plug'
  if (n.includes('فحص') || n.includes('check')) return 'mdi-car-wrench'
  return 'mdi-wrench-clock'
}

function getTaskMetrics(task) {
  if (!task) {
    return { 
      label: 'غير متوفر', 
      color: 'grey',
      lastKm: 0,
      remainingKm: 0,
      progress: 0 
    }
  }

  const currentOdometer = car.value?.current_odometer || 0
  const lastOdometer = task.last_maintenance_odometer || 0
  const interval = task.interval_km || 5000
  const kmSinceLast = currentOdometer - lastOdometer
  const remaining = interval - kmSinceLast
  const progress = Math.min((kmSinceLast / interval) * 100, 100)

  let status = { label: 'جيد', color: 'cyan-accent-3' }
  if (remaining <= 0) status = { label: 'متأخر', color: 'red-accent-2' }
  else if (remaining <= 1000) status = { label: 'قريب', color: 'amber-accent-3' }

  return {
    ...status,
    lastKm: lastOdometer,
    remainingKm: remaining,
    progress: progress
  }
}



function formatDate(date) {
  if (!date) return 'غير محدد'
  return dayjs(date).format('DD/MM/YYYY - HH:mm')
}
</script>

<style scoped>
/* Fonts */
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;900&display=swap');

.status-page {
  min-height: 100vh;
  background-color: #0A1929;
  font-family: 'Tajawal', sans-serif;
  color: white;
  position: relative;
  overflow-x: hidden;
}

.brand-font {
  font-family: 'Tajawal', sans-serif !important;
}

.font-number {
  font-family: 'Roboto', sans-serif;
  letter-spacing: 0.5px;
}

.loading-state {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0A1929;
}

.hero-section {
  position: relative;
  height: 400px;
}

.passport-card {
  background: rgba(30, 41, 59, 0.7) !important;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08); /* border-slate-700/50 */
  border-radius: 20px !important;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.passport-card:hover {
  border-color: rgba(56, 189, 248, 0.3); /* Cyan border */
}

/* Hero Stat Card */
.hero-stat-card {
  border-left: 4px solid #00E5FF;
}

.hero-icon-wrapper {
  width: 80px;
  height: 80px;
  background: rgba(0, 229, 255, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Icons */
.icon-box {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
}

.bg-cyan-accent-3-darken { background: rgba(0, 229, 255, 0.15); }
.bg-red-accent-2-darken { background: rgba(255, 82, 82, 0.15); }
.bg-amber-accent-3-darken { background: rgba(255, 196, 0, 0.15); }

/* Borders */
.border-t {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

/* Doc Card */
.doc-card {
  background: rgba(15, 23, 42, 0.6) !important;
}

.text-cyan-accent-3 { color: #00E5FF !important; }
.text-cyan-accent-1 { color: #84FFFF !important; }

/* Responsive */
@media (max-width: 600px) {
  .hero-section { height: 320px; }
  /* Ensure header text doesn't overflow or too big */
  .text-h2 { font-size: 1.75rem !important; line-height: 1.2 !important; }
  /* Adjust container negative margin to be responsive */
  .content-container { 
    padding: 16px; 
    margin-top: -40px !important; 
  }
}

@media (min-width: 601px) {
  .hero-section { height: 400px; }
  .content-container { 
    margin-top: -64px !important; 
  }
}

.hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(10,25,41,0.2) 0%, rgba(10,25,41,0.6) 50%, rgba(10,25,41,1) 100%);
  z-index: 1;
}

.hero-content {
  z-index: 2;
}
</style>
