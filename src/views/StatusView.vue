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
      <!-- Hero Section -->
      <div class="hero-section">
        <v-img
          :src="car.image || 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=2070&auto=format&fit=crop'"
          cover
          height="400"
          class="hero-image"
          gradient="to bottom, rgba(10,25,41,0.3), rgba(10,25,41,1)"
        >
          <div class="hero-content d-flex flex-column justify-end h-100 pa-6 pb-12">
            <v-chip color="cyan-accent-3" variant="flat" class="align-self-start mb-4 font-weight-bold">
              {{ car.year }}
            </v-chip>
            <h1 class="text-h2 font-weight-black text-white mb-2 brand-font">
              {{ car.make }} {{ car.model }}
            </h1>
            <div class="d-flex align-center gap-2 opacity-80">
              <v-icon color="cyan-accent-3" size="small">mdi-shield-check</v-icon>
              <span class="text-subtitle-1">جواز السيارة الرقمي - موثق</span>
            </div>
          </div>
        </v-img>
      </div>

      <v-container class="content-container mt-n12 position-relative z-index-2">
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
        
        <!-- Documents Section (Safe View) -->
        <div class="mt-8" v-if="documents.length > 0">
           <div class="text-h5 font-weight-bold mb-4 d-flex align-center">
            <v-icon color="cyan-accent-3" class="me-2">mdi-file-certificate</v-icon>
            حالة الوثائق
          </div>
          
          <v-row>
            <v-col cols="12" md="4" v-for="doc in documents" :key="doc.id">
              <v-card class="passport-card doc-card">
                <v-card-text class="d-flex align-center pa-4">
                  <v-icon :color="getDocStatusColor(doc)" size="32" class="me-4 opacity-80">{{ getDocIcon(doc.type) }}</v-icon>
                  <div>
                    <div class="text-subtitle-1 font-weight-bold">{{ getDocLabel(doc.type) }}</div>
                    <div class="text-caption" :class="`text-${getDocStatusColor(doc)}`">
                      {{ getDocStatus(doc) }}
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>

        <!-- Footer -->
        <div class="text-center mt-12 mb-6 opacity-50">
          <v-img :src="ayarLogo" width="30" class="mx-auto mb-2 opacity-80"></v-img>
          <p class="text-caption">Ayar Digital Passport</p>
        </div>
      </v-container>
    </v-main>
  </div>

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

const statusCards = computed(() => {
  const getTask = (keyword) => tasks.value.find(t => t.name?.includes(keyword))
  
  const cards = [
    { title: 'الزيت', keyword: 'زيت', icon: 'mdi-oil' },
    { title: 'الفرامل', keyword: 'فرامل', icon: 'mdi-car-brake-abs' },
    { title: 'الإطارات', keyword: 'إطار', icon: 'mdi-tire' },
    { title: 'الفلتر', keyword: 'فلتر', icon: 'mdi-air-filter' }
  ]

  return cards.map(card => {
    const task = getTask(card.keyword)
    return {
      title: card.title,
      icon: card.icon,
      name: task?.name || card.title,
      ...getTaskMetrics(task)
    }
  })
})

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
  .text-h2 { font-size: 2rem !important; }
  .content-container { padding: 16px; margin-top: -64px !important; }
}
