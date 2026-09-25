<template>
  <main class="setup-car-page">
    <v-container class="py-8 py-md-12" fluid>
      <v-row justify="center">
        <v-col cols="12" sm="10" md="8" lg="7" xl="6">
          <v-card class="setup-card pa-5 pa-sm-8 rounded-xl" elevation="4">
            <header class="text-center mb-6">
              <v-avatar color="primary" size="68" class="mb-4">
                <v-icon size="38" color="white">mdi-car-wrench</v-icon>
              </v-avatar>
              <h1 class="text-h5 text-sm-h4 font-weight-bold mb-2">أهلاً بك في عيار</h1>
              <p class="text-body-2 text-sm-body-1 text-medium-emphasis mb-5">
                نجهز سيارتك وخطة صيانتها في ثلاث خطوات قصيرة.
              </p>
              <div class="d-flex justify-center align-center ga-2 mb-2" aria-label="خطوات إعداد السيارة">
                <v-chip v-for="item in steps" :key="item.value" size="small" :color="step === item.value ? 'primary' : 'default'" :variant="step === item.value ? 'flat' : 'tonal'">
                  {{ item.value }}. {{ item.label }}
                </v-chip>
              </div>
              <v-progress-linear :model-value="(step / steps.length) * 100" color="primary" rounded height="5" />
            </header>

            <v-window v-model="step" :touch="false">
              <v-window-item :value="1">
                <div class="mb-4">
                  <h2 class="text-h6 font-weight-bold mb-1">بيانات السيارة</h2>
                  <p class="text-body-2 text-medium-emphasis">أدخل المعلومات الأساسية؛ ويمكنك تعديلها لاحقًا.</p>
                </div>
                <v-form ref="carForm" v-model="isFormValid" @submit.prevent="continueStep">
                  <v-row dense>
                    <v-col cols="12" sm="6">
                      <v-text-field v-model="formData.make" label="ماركة السيارة *" prepend-inner-icon="mdi-car" variant="outlined" :rules="[rules.required]" autocomplete="organization" />
                    </v-col>
                    <v-col cols="12" sm="6">
                      <v-text-field v-model="formData.model" label="الموديل *" prepend-inner-icon="mdi-car-side" variant="outlined" :rules="[rules.required]" />
                    </v-col>
                    <v-col cols="12" sm="6">
                      <v-text-field v-model.number="formData.year" label="سنة الصنع *" prepend-inner-icon="mdi-calendar" variant="outlined" type="number" :rules="[rules.required, rules.year]" />
                    </v-col>
                    <v-col cols="12" sm="6">
                      <v-text-field v-model="formData.plateNumber" label="رقم اللوحة (اختياري)" prepend-inner-icon="mdi-card-text" variant="outlined" />
                    </v-col>
                    <v-col cols="12">
                      <v-text-field v-model="formData.color" label="اللون (اختياري)" prepend-inner-icon="mdi-palette" variant="outlined" />
                    </v-col>
                  </v-row>
                </v-form>
              </v-window-item>

              <v-window-item :value="2">
                <div class="mb-5">
                  <h2 class="text-h6 font-weight-bold mb-1">العداد الحالي</h2>
                  <p class="text-body-2 text-medium-emphasis">أدخل القراءة الظاهرة الآن في السيارة. سنحفظها كقراءة بداية، لا كسجل صيانة.</p>
                </div>
                <v-form ref="odometerForm" @submit.prevent="continueStep">
                  <v-text-field
                    v-model.number="formData.currentOdometer"
                    label="قراءة العداد الحالية"
                    type="number"
                    min="0"
                    step="1"
                    suffix="كم"
                    prepend-inner-icon="mdi-speedometer"
                    variant="outlined"
                    inputmode="numeric"
                    :rules="[rules.odometer]"
                  />
                </v-form>
              </v-window-item>

              <v-window-item :value="3">
                <div class="mb-4">
                  <h2 class="text-h6 font-weight-bold mb-1">خطة الصيانة</h2>
                  <p class="text-body-2 text-medium-emphasis">هذه مهام مقترحة. اضبط ما تعرفه الآن، واترك الباقي لوقت لاحق.</p>
                </div>
                <v-alert type="info" variant="tonal" density="comfortable" class="mb-4">
                  المهمة التي لا نعرف خط بدايتها ستظهر «تحتاج إعداد»؛ لن نعرضها كمتأخرة.
                </v-alert>
                <div class="maintenance-plan-list">
                  <v-card v-for="task in defaultTasks" :key="task.setupKey" variant="outlined" class="pa-3 pa-sm-4">
                    <div class="d-flex align-start justify-space-between ga-3">
                      <div class="min-width-0">
                        <div class="font-weight-bold">{{ task.name }}</div>
                        <div class="text-caption text-medium-emphasis mt-1">{{ intervalLabel(task) }}</div>
                        <v-chip
                          size="x-small"
                          class="mt-2"
                          :color="baselineDrafts[task.setupKey]?.baselineType === 'tracking_start' ? 'info' : baselineDrafts[task.setupKey]?.baselineType === 'reported_maintenance' ? 'success' : 'blue-grey'"
                          variant="tonal"
                        >
                          {{ baselineLabel(baselineDrafts[task.setupKey]) }}
                        </v-chip>
                      </div>
                      <v-btn height="44" variant="tonal" color="primary" class="flex-shrink-0" @click="openBaseline(task)">
                        {{ baselineDrafts[task.setupKey]?.baselineType === 'unknown' ? 'إعداد' : 'تعديل' }}
                      </v-btn>
                    </div>
                  </v-card>
                </div>
              </v-window-item>
            </v-window>

            <v-alert v-if="error" type="error" variant="tonal" class="mt-5" role="alert">
              {{ error }}
            </v-alert>

            <footer class="d-flex flex-wrap align-center justify-space-between ga-2 mt-6">
              <v-btn v-if="step > 1" variant="text" :disabled="loading || carStore.hasCar" @click="step--">السابق</v-btn>
              <span v-else />
              <div class="d-flex flex-wrap justify-end ga-2">
                <v-btn v-if="step < 3" color="primary" :disabled="step === 1 && !isFormValid" @click="continueStep">
                  التالي <v-icon end>mdi-chevron-left</v-icon>
                </v-btn>
                <template v-else>
                  <v-btn variant="text" :disabled="loading" @click="finishSetup">تخطي إعداد الخطة الآن</v-btn>
                  <v-btn color="primary" :loading="loading" :disabled="loading" @click="finishSetup">
                    {{ carStore.hasCar ? 'إكمال الإعداد' : 'إنشاء السيارة والخطة' }}
                  </v-btn>
                </template>
              </div>
            </footer>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <MaintenanceBaselineDialog
      v-model="showBaselineDialog"
      :task="selectedTask"
      :current-odometer="Number(formData.currentOdometer) || 0"
      :baseline="selectedTask ? baselineDrafts[selectedTask.setupKey] : null"
      @save="saveBaselineDraft"
    />
  </main>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCarStore } from '@/stores/car'
import { useOdometerStore } from '@/stores/odometer'
import { useTasksStore } from '@/stores/tasks'
import MaintenanceBaselineDialog from '@/components/MaintenanceBaselineDialog.vue'

const router = useRouter()
const carStore = useCarStore()
const odometerStore = useOdometerStore()
const tasksStore = useTasksStore()

const steps = [
  { value: 1, label: 'السيارة' },
  { value: 2, label: 'العداد' },
  { value: 3, label: 'الصيانة' }
]
const step = ref(1)
const carForm = ref(null)
const odometerForm = ref(null)
const isFormValid = ref(false)
const loading = ref(false)
const error = ref('')
const showBaselineDialog = ref(false)
const selectedTask = ref(null)
const baselineDrafts = reactive({})
const initialReadingSaved = ref(false)

const formData = reactive({
  make: '',
  model: '',
  year: new Date().getFullYear(),
  plateNumber: '',
  color: '',
  currentOdometer: 0
})

const rules = {
  required: value => Boolean(String(value || '').trim()) || 'هذا الحقل مطلوب',
  year: value => (Number(value) >= 1900 && Number(value) <= new Date().getFullYear() + 1) || 'سنة الصنع غير صحيحة',
  odometer: value => (Number.isFinite(Number(value)) && Number(value) >= 0) || 'أدخل قراءة صحيحة تساوي صفرًا أو أكثر'
}

const defaultTasks = tasksStore.getDefaultTasks().map(task => ({
  ...task,
  setupKey: `first-car-default-${task.id}`
}))

function continueStep() {
  if (step.value === 1) {
    carForm.value?.validate().then(({ valid }) => {
      if (valid) step.value = 2
    })
    return
  }
  if (step.value === 2) {
    odometerForm.value?.validate().then(({ valid }) => {
      if (valid) step.value = 3
    })
  }
}

function openBaseline(task) {
  selectedTask.value = task
  showBaselineDialog.value = true
}

function saveBaselineDraft(baseline) {
  if (!selectedTask.value) return
  baselineDrafts[selectedTask.value.setupKey] = baseline
  showBaselineDialog.value = false
}

function baselineLabel(baseline) {
  if (baseline?.baselineType === 'reported_maintenance') return 'آخر صيانة معروفة'
  if (baseline?.baselineType === 'tracking_start') return 'بداية متابعة'
  return 'تحتاج إعداد'
}

function intervalLabel(task) {
  const parts = []
  if (task.intervalKm) parts.push(`كل ${Number(task.intervalKm).toLocaleString('ar-SA')} كم`)
  if (task.intervalMonths) parts.push(`كل ${task.intervalMonths} شهر`)
  return parts.join(' أو ')
}

async function finishSetup() {
  if (loading.value) return
  loading.value = true
  error.value = ''

  try {
    const currentOdometer = Number(formData.currentOdometer)
    if (!carStore.hasCar) {
      await carStore.addCar({
        make: formData.make,
        model: formData.model,
        year: Number(formData.year),
        plateNumber: formData.plateNumber,
        color: formData.color,
        initialOdometer: currentOdometer,
        currentOdometer
      })
    }

    await odometerStore.fetchReadings()
    const initialReadingNotes = 'قراءة العداد عند بدء المتابعة'
    if (!initialReadingSaved.value && !odometerStore.readings.some(reading => reading.notes === initialReadingNotes)) {
      await odometerStore.addReading({
        reading: currentOdometer,
        date: new Date().toISOString(),
        notes: initialReadingNotes
      })
      initialReadingSaved.value = true
    }

    await tasksStore.fetchTasks()
    for (const task of defaultTasks) {
      const existing = tasksStore.tasks.find(item => item.setupKey === task.setupKey)
      const baseline = baselineDrafts[task.setupKey] || {
        baselineType: 'unknown',
        lastMaintenanceDate: null,
        lastMaintenanceOdometer: null
      }
      if (existing) {
        await tasksStore.updateTask(existing.id, baseline)
        continue
      }
      await tasksStore.addTask({
        ...task,
        ...baseline,
        setupKey: task.setupKey,
        isRecurring: true
      })
    }

    await router.replace({ name: 'dashboard' })
  } catch (submitError) {
    console.error('Vehicle onboarding failed:', submitError)
    error.value = /[\u0600-\u06FF]/.test(submitError.message || '')
      ? submitError.message
      : 'تعذر إكمال الإعداد. بياناتك المحفوظة لم تُحذف؛ أعد المحاولة لإكمال الخطوات المتبقية.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.setup-car-page {
  min-height: 100vh;
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), .05), rgb(var(--v-theme-surface)));
}

.setup-card { max-width: 920px; margin-inline: auto; }
.maintenance-plan-list { display: grid; gap: 12px; padding: 2px; }
.min-width-0 { min-width: 0; }
</style>
