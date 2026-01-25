<template>
  <v-dialog v-model="dialog" max-width="800" persistent>
    <v-card class="rounded-xl overflow-hidden">
      <!-- Header -->
      <div class="wizard-header bg-primary pa-6 text-center position-relative">
        <v-btn 
          icon="mdi-close" 
          variant="text" 
          color="white" 
          position="absolute" 
          class="close-btn"
          @click="dialog = false"
        ></v-btn>
        
        <v-sheet 
          color="white" 
          class="rounded-circle d-flex align-center justify-center mx-auto mb-4 elevation-3" 
          width="110" 
          height="110"
        >
          <v-img :src="ayarLogo" width="80" height="80" contain></v-img>
        </v-sheet>
        <h2 class="text-h4 font-weight-bold text-white mb-2">مرحباً بك في عيار!</h2>
        <p class="text-white opacity-80">دعنا نجهز حسابك في دقائق</p>
      </div>

      <v-window v-model="step" class="pa-6">
        <!-- Step 1: Vehicle Info -->
        <v-window-item :value="1">
          <div class="text-center mb-6">
            <h3 class="text-h6 font-weight-bold mb-1">ما هي سيارتك؟</h3>
            <p class="text-caption text-medium-emphasis">أدخل المعلومات الأساسية لسيارتك</p>
          </div>
          
          <v-form ref="step1Form" v-model="step1Valid">
            <!-- Manufacturer Selection with Logos -->
            <div class="mb-4">
              <label class="text-body-2 text-medium-emphasis mb-2 d-block">الشركة الصانعة</label>
              <div class="brands-grid">
                <div 
                  v-for="brand in carBrands" 
                  :key="brand.value"
                  class="brand-item"
                  :class="{ 'brand-selected': carData.make === brand.value }"
                  @click="selectBrand(brand.value)"
                >
                  <div class="brand-logo">
                    <img :src="brand.logo" :alt="brand.label" />
                  </div>
                  <span class="brand-name">{{ brand.label }}</span>
                </div>
                <!-- Other option -->
                <div 
                  class="brand-item"
                  :class="{ 'brand-selected': showCustomMake }"
                  @click="selectOtherBrand"
                >
                  <div class="brand-logo other-logo">
                    <v-icon size="32" color="primary">mdi-plus</v-icon>
                  </div>
                  <span class="brand-name">أخرى</span>
                </div>
              </div>
              <!-- Custom manufacturer input -->
              <v-text-field
                v-if="showCustomMake"
                v-model="carData.make"
                label="اسم الشركة"
                placeholder="أدخل اسم الشركة"
                prepend-inner-icon="mdi-car"
                variant="outlined"
                rounded="lg"
                class="mt-3"
                :rules="[v => !!v || 'مطلوب']"
              ></v-text-field>
            </div>

            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="carData.model"
                  label="الموديل"
                  placeholder="مثال: كامري"
                  prepend-inner-icon="mdi-car-info"
                  variant="outlined"
                  rounded="lg"
                  :rules="[v => !!v || 'مطلوب']"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="carData.year"
                  label="سنة الصنع"
                  type="number"
                  prepend-inner-icon="mdi-calendar"
                  variant="outlined"
                  rounded="lg"
                  :rules="[v => !!v || 'مطلوب']"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="carData.plateNumber"
                  label="رقم اللوحة"
                  placeholder="مثال: أ ب ج 1234"
                  prepend-inner-icon="mdi-card-text"
                  variant="outlined"
                  rounded="lg"
                  :rules="[v => !!v || 'مطلوب']"
                ></v-text-field>
              </v-col>
            </v-row>
          </v-form>
        </v-window-item>

        <!-- Step 2: Odometer -->
        <v-window-item :value="2">
          <div class="text-center mb-8">
            <h3 class="text-h6 font-weight-bold mb-1">كم مشيت السيارة؟</h3>
            <p class="text-caption text-medium-emphasis">هذا يساعدنا في حساب مواعيد الصيانة</p>
          </div>

          <div class="d-flex justify-center mb-8">
            <div class="odometer-input-wrapper pa-6 rounded-xl bg-grey-lighten-4" style="width: 100%; max-width: 400px;">
              <v-text-field
                v-model.number="carData.currentOdometer"
                label="قراءة العداد الحالية"
                type="number"
                suffix="كم"
                prepend-inner-icon="mdi-speedometer"
                variant="outlined"
                rounded="lg"
                class="text-h5"
                autofocus
                :rules="[v => v >= 0 || 'قيمة غير صحيحة']"
              ></v-text-field>
            </div>
          </div>
        </v-window-item>

        <!-- Step 3: Daily Usage -->
        <v-window-item :value="3">
          <div class="text-center mb-8">
            <h3 class="text-h6 font-weight-bold mb-1">استخدامك اليومي</h3>
            <p class="text-caption text-medium-emphasis">تقدير المسافة التي تقطعها يومياً يساعد في التنبؤات الذكية</p>
          </div>

          <v-radio-group v-model="dailyUsage" class="usage-options">
            <v-row justify="center">
              <v-col cols="12" sm="4" v-for="option in usageOptions" :key="option.value">
                <v-card 
                  variant="outlined" 
                  class="h-100 cursor-pointer text-center pa-4 transition-all"
                  :class="{ 'border-primary bg-primary-lighten-5': dailyUsage === option.value }"
                  @click="dailyUsage = option.value"
                >
                  <v-icon size="40" color="primary" class="mb-3">{{ option.icon }}</v-icon>
                  <div class="text-h6 font-weight-bold mb-1">{{ option.label }}</div>
                  <div class="text-caption text-medium-emphasis">{{ option.desc }}</div>
                  <div class="mt-2 text-primary font-weight-bold">~{{ option.value }} كم/يوم</div>
                </v-card>
              </v-col>
            </v-row>
          </v-radio-group>
        </v-window-item>

        <!-- Step 4: Maintenance Plan -->
        <v-window-item :value="4">
          <div class="text-center mb-6">
            <h3 class="text-h6 font-weight-bold mb-1">خطة الصيانة المقترحة</h3>
            <p class="text-caption text-medium-emphasis">بناءً على معلوماتك، نقترح عليك خطة الصيانة التالية</p>
          </div>

          <v-list class="bg-grey-lighten-5 rounded-lg border mb-4" lines="two">
            <v-list-item v-for="(task, i) in defaultTasks" :key="i" :prepend-icon="task.icon">
              <v-list-item-title class="font-weight-bold">{{ task.name }}</v-list-item-title>
              <v-list-item-subtitle>
                <span v-if="task.km">كل {{ task.km.toLocaleString() }} كم</span>
                <span v-if="task.km && task.months"> أو </span>
                <span v-if="task.months">كل {{ task.months }} شهر</span>
              </v-list-item-subtitle>
              <template #append>
                <v-checkbox v-model="task.selected" color="primary" hide-details></v-checkbox>
              </template>
            </v-list-item>
          </v-list>
        </v-window-item>
      </v-window>

      <v-divider></v-divider>

      <!-- Actions -->
      <div class="pa-4 d-flex justify-space-between align-center">
        <v-btn
          v-if="step > 1"
          variant="text"
          @click="step--"
        >
          السابق
        </v-btn>
        <v-spacer v-else></v-spacer>

        <div class="step-dots d-flex gap-2">
          <div 
            v-for="s in 4" 
            :key="s"
            class="dot"
            :class="{ 'active': s === step, 'completed': s < step }"
          ></div>
        </div>

        <v-spacer></v-spacer>

        <v-btn
          v-if="step < 4"
          color="primary"
          :disabled="!canProceed"
          @click="step++"
        >
          التالي
          <v-icon end>mdi-chevron-left</v-icon>
        </v-btn>
        <v-btn
          v-else
          color="#C66C1E"
          class="text-white font-weight-bold"
          size="large"
          prepend-icon="mdi-check"
          @click="finishWizard"
          :loading="loading"
        >
          إنهاء وبدء الاستخدام
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useCarStore } from '@/stores/car'
import { useTasksStore } from '@/stores/tasks'
import { useOdometerStore } from '@/stores/odometer'
import ayarLogo from '@/assets/ayar-logo.png'

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue', 'finished'])

const dialog = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const step = ref(1)
const loading = ref(false)
const step1Form = ref(null)
const step1Valid = ref(false)
const showCustomMake = ref(false)

// Stores
const carStore = useCarStore()
const tasksStore = useTasksStore()
const odometerStore = useOdometerStore()

// Car brands with logos (popular in Saudi market)
const carBrands = [
  { value: 'تويوتا', label: 'تويوتا', logo: 'https://www.carlogos.org/car-logos/toyota-logo-2019-3700x1200.png' },
  { value: 'لكزس', label: 'لكزس', logo: 'https://www.carlogos.org/car-logos/lexus-logo-1988-1920x1080.png' },
  { value: 'هيونداي', label: 'هيونداي', logo: 'https://www.carlogos.org/car-logos/hyundai-logo-2011-1920x1080.png' },
  { value: 'كيا', label: 'كيا', logo: 'https://www.carlogos.org/car-logos/kia-logo-2021-2560x1440.png' },
  { value: 'نيسان', label: 'نيسان', logo: 'https://www.carlogos.org/car-logos/nissan-logo-2020-1920x1080.png' },
  { value: 'هوندا', label: 'هوندا', logo: 'https://www.carlogos.org/car-logos/honda-logo-1920x1080.png' },
  { value: 'فورد', label: 'فورد', logo: 'https://www.carlogos.org/car-logos/ford-logo-2017-1920x1080.png' },
  { value: 'شيفروليه', label: 'شيفروليه', logo: 'https://www.carlogos.org/car-logos/chevrolet-logo-2013-1920x1080.png' },
  { value: 'جي إم سي', label: 'جي إم سي', logo: 'https://www.carlogos.org/car-logos/gmc-logo-1920x1080.png' },
  { value: 'مرسيدس', label: 'مرسيدس', logo: 'https://www.carlogos.org/car-logos/mercedes-benz-logo-1916-1920x1080.png' },
  { value: 'بي إم دبليو', label: 'بي إم دبليو', logo: 'https://www.carlogos.org/car-logos/bmw-logo-2020-1920x1080.png' },
  { value: 'ميتسوبيشي', label: 'ميتسوبيشي', logo: 'https://www.carlogos.org/car-logos/mitsubishi-logo-1920x1080.png' },
  { value: 'مازدا', label: 'مازدا', logo: 'https://www.carlogos.org/car-logos/mazda-logo-2018-1920x1080.png' },
  { value: 'سوزوكي', label: 'سوزوكي', logo: 'https://www.carlogos.org/car-logos/suzuki-logo-1920x1080.png' },
  { value: 'جيب', label: 'جيب', logo: 'https://www.carlogos.org/car-logos/jeep-logo-1920x1080.png' }
]

// Brand selection functions
function selectBrand(brandValue) {
  showCustomMake.value = false
  carData.value.make = brandValue
}

function selectOtherBrand() {
  showCustomMake.value = true
  carData.value.make = ''
}

// Data
const carData = ref({
  make: '',
  model: '',
  year: new Date().getFullYear(),
  plateNumber: '',
  currentOdometer: 0
})

const dailyUsage = ref(30)
const usageOptions = [
  { value: 15, label: 'خفيف', desc: 'مشاوير قريبة داخل الحي', icon: 'mdi-walk' },
  { value: 45, label: 'متوسط', desc: 'الذهاب للعمل ومشاوير يومية', icon: 'mdi-car' },
  { value: 100, label: 'عالي', desc: 'مسافات طويلة وسفر متكرر', icon: 'mdi-road-variant' }
]

const defaultTasks = ref([
  { name: 'تغيير الزيت والفلتر', km: 5000, months: 3, icon: 'mdi-oil', selected: true, type: 'both', priority: 'high' },
  { name: 'فحص الإطارات والتدوير', km: 10000, months: 6, icon: 'mdi-car-tire-alert', selected: true, type: 'both', priority: 'medium' },
  { name: 'فحص الفرامل', km: 20000, months: 12, icon: 'mdi-disc-alert', selected: true, type: 'distance', priority: 'high' },
  { name: 'تغيير فلتر الهواء', km: 20000, months: 12, icon: 'mdi-air-filter', selected: true, type: 'distance', priority: 'medium' },
  { name: 'تجديد الاستمارة والفحص', km: null, months: 12, icon: 'mdi-file-document', selected: true, type: 'time', priority: 'high' }
])

// Validation
const canProceed = computed(() => {
  if (step.value === 1) return step1Valid.value && carData.value.make !== ''
  if (step.value === 2) return carData.value.currentOdometer >= 0
  return true
})

// Finish
async function finishWizard() {
  loading.value = true
  
  try {
    // 1. Calculate past reading if applicable
    const pastReading = (dailyUsage.value > 0 && carData.value.currentOdometer > (dailyUsage.value * 30))
      ? carData.value.currentOdometer - (dailyUsage.value * 30)
      : null

    // 2. Add Car (Initialize with past reading if exists to allow chronological addition)
    carStore.addCar({
      ...carData.value,
      initialOdometer: pastReading || carData.value.currentOdometer,
      currentOdometer: pastReading || carData.value.currentOdometer // Set current to match initial for now
    })

    // 3. Add Past Reading (to simulate daily average)
    if (pastReading) {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 30)
      
      odometerStore.addReading({
        reading: pastReading,
        date: pastDate.toISOString(),
        notes: 'Initial Estimate Base'
      })
      
      // 4. Now Add Current Reading (this will update car current odometer)
      odometerStore.addReading({
        reading: carData.value.currentOdometer,
        notes: 'Qeraah eftetahyuh (Initial Reading via Wizard)'
      })
    } else {
      // Just add current reading if no past estimate
      odometerStore.addReading({
        reading: carData.value.currentOdometer,
        notes: 'Qeraah eftetahyuh (Initial Reading via Wizard)'
      })
    }

    // 4. Add Selected Tasks
    tasksStore.resetTasks()
    tasksStore.tasks = []
    
    defaultTasks.value.filter(t => t.selected).forEach(task => {
      tasksStore.addTask({
        name: task.name,
        type: task.type,
        intervalKm: task.km,
        intervalMonths: task.months,
        priority: task.priority,
        isRecurring: true
      })
    })

    // Close dialog first, then emit finished
    emit('update:modelValue', false)
    emit('finished')
  } catch (error) {
    console.error('Wizard Error:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.wizard-header {
  background: linear-gradient(135deg, #0D3C61, #082A45);
}

.close-btn {
  top: 16px;
  right: 16px; /* RTL - right might be left visually? No, in RTL right is right. */
  /* Actually Vuetify RTL usually flips things. Just use top: 16px; right: 16px to pin to top corner. */
  /* If dir=rtl, absolute positioning usually respects left/right as is, but let's check. */
  /* For safety, in Vuetify with RTL, right might mean logical start/end. */
  /* Let's try explicit css first. */
  position: absolute !important; 
  top: 16px !important;
  right: 16px !important; /* Forces it to the right side regardless of RTL flipping logic if causing issues, but standard is fine. Actually in RTL right is right side of screen? No, right is valid. */
  z-index: 10;
}

.step-dots {
  display: flex;
  align-items: center;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.dot.active {
  background: rgb(var(--v-theme-primary));
  transform: scale(1.2);
}

.dot.completed {
  background: rgb(var(--v-theme-primary));
  opacity: 0.5;
}

.border-primary {
  border-color: rgb(var(--v-theme-primary)) !important;
  border-width: 2px !important;
}

.bg-primary-lighten-5 {
  background-color: rgba(var(--v-theme-primary), 0.05) !important;
}

.transition-all {
  transition: all 0.2s ease;
}

/* Brand Grid Styles */
.brands-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  max-height: 280px;
  overflow-y: auto;
  padding: 4px;
}

@media (max-width: 600px) {
  .brands-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.brand-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  border-radius: 12px;
  background: rgba(var(--v-theme-surface-variant), 0.3);
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.brand-item:hover {
  background: rgba(var(--v-theme-primary), 0.1);
  transform: translateY(-2px);
}

.brand-item.brand-selected {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.15);
}

.brand-logo {
  width: 50px;
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
}

.brand-logo img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.brand-logo.other-logo {
  background: rgba(var(--v-theme-primary), 0.1);
  border-radius: 8px;
}

.brand-name {
  font-size: 0.75rem;
  font-weight: 500;
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.8);
}
</style>
