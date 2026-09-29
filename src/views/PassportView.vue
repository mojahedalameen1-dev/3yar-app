<template>
  <div class="passport-view">
    <header class="mb-6">
      <div class="d-flex align-center ga-2 mb-2">
        <v-icon color="primary" aria-hidden="true">mdi-book-open-page-variant-outline</v-icon>
        <h1 class="text-h4 font-weight-bold">جواز السيارة</h1>
      </div>
      <p class="text-body-2 text-medium-emphasis">هوية وتاريخ سيارتك في مكان واحد. هذه الصفحة خاصة بك.</p>
    </header>

    <v-card v-if="state === 'loading'" class="glass-card pa-8 text-center" role="status">
      <v-progress-circular indeterminate color="primary" aria-label="جارٍ تحميل جواز السيارة" />
      <p class="mt-3">جارٍ تحميل جواز السيارة…</p>
    </v-card>
    <v-alert v-else-if="state === 'error'" type="error" variant="tonal" role="alert">
      تعذر تحميل جواز السيارة. لم نتمكن من التحقق من البيانات؛ لا يعني ذلك أن السجل فارغ.
      <v-btn variant="text" @click="loadPassport">إعادة المحاولة</v-btn>
    </v-alert>
    <v-card v-else-if="!passport" class="glass-card pa-8 text-center">
      <v-icon size="42" color="primary" aria-hidden="true">mdi-car-outline</v-icon>
      <h2 class="text-h6 mt-3 mb-2">{{ authStore.userId ? 'لا توجد سيارة لعرض جوازها' : 'سجّل الدخول لعرض جواز سيارتك' }}</h2>
      <v-btn class="mt-3" color="primary" :to="authStore.userId ? '/setup-car' : '/login'">{{ authStore.userId ? 'إضافة سيارة' : 'تسجيل الدخول' }}</v-btn>
    </v-card>

    <template v-else>
      <v-card class="glass-card identity-card pa-5 pa-sm-6 mb-5" aria-labelledby="passport-identity-title">
        <div class="d-flex flex-wrap align-start justify-space-between ga-4 mb-5">
          <div class="identity-title">
            <span class="text-caption text-medium-emphasis">السيارة</span>
            <h2 id="passport-identity-title" class="text-h5 font-weight-bold">{{ carName }}</h2>
            <p class="text-body-2 text-medium-emphasis mt-1">{{ passport.car.year || 'السنة غير مسجلة' }} · {{ passport.car.color || 'اللون غير مسجل' }}</p>
          </div>
          <div class="odometer-block">
            <span class="text-caption text-medium-emphasis">العداد الحالي</span>
            <p class="text-h5 font-weight-bold">{{ formatNumber(passport.car.currentOdometer) }} <span class="text-body-2 font-weight-regular">كم</span></p>
          </div>
        </div>
        <v-divider class="mb-4" />
        <dl class="private-identity">
          <div>
            <dt class="text-caption text-medium-emphasis">رقم اللوحة — خاص بالمالك</dt>
            <dd class="font-weight-medium">{{ passport.car.plateNumber || 'غير مسجل' }}</dd>
          </div>
          <div>
            <dt class="text-caption text-medium-emphasis">VIN — خاص بالمالك</dt>
            <dd class="font-weight-medium" dir="ltr">{{ passport.car.vin || 'غير مسجل' }}</dd>
          </div>
        </dl>
      </v-card>

      <v-row>
        <v-col cols="12" md="6">
          <v-card class="glass-card pa-5 h-100" aria-labelledby="passport-maintenance-title">
            <h2 id="passport-maintenance-title" class="text-h6 font-weight-bold mb-4">حالة الصيانة</h2>
            <div v-if="passport.maintenance.actionTask" class="mb-5">
              <p class="text-caption text-medium-emphasis mb-1">الإجراء الأهم</p>
              <div class="d-flex flex-wrap align-center ga-2">
                <span class="font-weight-bold">{{ passport.maintenance.actionTask.name }}</span>
                <v-chip :color="taskColor(passport.maintenance.actionTask.statusInfo.status)" variant="tonal" size="small">{{ taskLabel(passport.maintenance.actionTask.statusInfo.status) }}</v-chip>
              </div>
              <v-btn to="/tasks" variant="text" color="primary" class="mt-2 px-0">{{ passport.maintenance.actionTask.statusInfo.needsSetup ? 'إعداد المهمة' : 'عرض المهمة' }}</v-btn>
            </div>
            <p v-else class="text-body-2 mb-4">{{ passport.maintenance.tasksCount ? 'لا توجد مهمة مستحقة أو تحتاج إعدادًا الآن.' : 'لم تضف مهام صيانة بعد.' }}</p>
            <v-divider class="mb-4" />
            <p class="text-caption text-medium-emphasis mb-1">الصيانة القادمة</p>
            <template v-if="passport.maintenance.nextMaintenance">
              <p class="font-weight-medium">{{ passport.maintenance.nextMaintenance.name }}</p>
              <p v-if="passport.maintenance.nextMaintenance.statusInfo.estimatedDate" class="text-body-2 text-medium-emphasis mt-1">
                {{ passport.maintenance.nextMaintenance.statusInfo.estimatedDateSource === 'distance' ? 'موعد تقديري حسب الاستخدام:' : 'الموعد حسب الفترة الزمنية:' }}
                {{ formatDate(passport.maintenance.nextMaintenance.statusInfo.estimatedDate) }}
              </p>
              <p v-if="passport.maintenance.nextMaintenance.statusInfo.kmRemaining !== null" class="text-body-2 text-medium-emphasis mt-1">متبقي {{ formatNumber(passport.maintenance.nextMaintenance.statusInfo.kmRemaining) }} كم</p>
            </template>
            <p v-else class="text-body-2 text-medium-emphasis">لا توجد صيانة قادمة قابلة للتقدير الآن؛ راجع إعداد المهام.</p>
            <v-btn to="/tasks" variant="text" class="mt-3 px-0" color="primary">عرض مهام الصيانة</v-btn>
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card class="glass-card pa-5 h-100" aria-labelledby="passport-documents-title">
            <h2 id="passport-documents-title" class="text-h6 font-weight-bold mb-4">الوثائق</h2>
            <div v-if="passport.documents.total" class="d-flex flex-wrap ga-2 mb-4" role="list" aria-label="حالات الوثائق الأساسية والمخصصة">
              <v-chip v-for="item in documentStatusItems" :key="item.key" :color="item.color" role="listitem" variant="tonal">{{ item.label }}: {{ formatNumber(item.count) }}</v-chip>
            </div>
            <p v-else class="text-body-2 text-medium-emphasis mb-4">لا توجد وثائق مسجلة بعد.</p>
            <p class="text-caption text-medium-emphasis">هذا الملخص يشمل وثائقك الأساسية والمخصصة؛ ملفاتها تظل خاصة بك.</p>
            <v-btn to="/documents" variant="text" color="primary" class="mt-3 px-0">عرض الوثائق</v-btn>
            <v-divider class="my-4" />
            <h3 class="text-subtitle-1 font-weight-bold mb-3">التكاليف المسجلة</h3>
            <dl class="cost-summary">
              <div><dt class="text-caption text-medium-emphasis">سنة {{ passport.costs.year }}</dt><dd class="font-weight-bold">{{ formatCost(passport.costs.thisYear) }}</dd></div>
              <div><dt class="text-caption text-medium-emphasis">إجمالي التكاليف المعروفة</dt><dd class="font-weight-bold">{{ formatCost(passport.costs.totalKnown) }}</dd></div>
            </dl>
            <p v-if="passport.costs.unknownCount" class="text-caption text-medium-emphasis mt-3">{{ formatNumber(passport.costs.unknownCount) }} عملية بتكلفة غير مسجلة، لا تدخل في الإجمالي.</p>
            <p class="text-caption text-medium-emphasis mt-2">التكاليف لا تظهر في الجواز العام.</p>
          </v-card>
        </v-col>
      </v-row>

      <v-card class="glass-card pa-5 pa-sm-6 my-5" aria-labelledby="passport-history-title">
        <div class="d-flex flex-wrap align-center justify-space-between ga-2 mb-4">
          <h2 id="passport-history-title" class="text-h6 font-weight-bold">آخر عمليات الصيانة</h2>
          <v-btn to="/records" variant="text" color="primary">عرض السجل كاملًا</v-btn>
        </div>
        <p v-if="!passport.history.count" class="text-body-2 text-medium-emphasis">لا توجد عمليات صيانة مسجلة بعد. سجّل صيانة من صفحة المهام لبناء تاريخ السيارة.</p>
        <ol v-else class="maintenance-history">
          <li v-for="record in passport.history.recent" :key="record.id" class="history-row">
            <div class="history-description"><h3 class="text-subtitle-1 font-weight-medium">{{ record.taskName }}</h3><p class="text-caption text-medium-emphasis">{{ formatDate(record.date) }}</p></div>
            <div class="history-values"><p class="text-body-2">{{ formatNumber(record.odometerReading) }} كم</p><p class="text-caption text-medium-emphasis">{{ formatCost(record.cost) }}</p></div>
          </li>
        </ol>
        <p v-if="passport.history.count > 5" class="text-caption text-medium-emphasis mt-3">نعرض آخر 5 من {{ formatNumber(passport.history.count) }} عملية.</p>
      </v-card>

      <PassportSharePanel :key="`${authStore.userId}:${passport.car.id}`" :car-id="passport.car.id" :user-id="authStore.userId" />
    </template>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useCarStore } from '../stores/car'
import { supabase } from '../lib/firebase'
import { parseMaintenanceRecordDateV1 } from '../lib/maintenance-cost-insights-v1'
import { buildOwnerVehiclePassportV1 } from '../lib/vehicle-passport-v1'
import PassportSharePanel from '../components/PassportSharePanel.vue'

const authStore = useAuthStore()
const carStore = useCarStore()
const snapshot = ref(null)
const state = ref('loading')
let loadVersion = 0

const passport = computed(() => {
  const data = snapshot.value
  if (!data || data.userId !== authStore.userId || (carStore.car?.id && carStore.car.id !== data.car?.id)) return null
  return buildOwnerVehiclePassportV1(data)
})
const carName = computed(() => [passport.value?.car.make, passport.value?.car.model].filter(Boolean).join(' ') || 'سيارتك')
const documentStatusItems = computed(() => [
  { key: 'valid', label: 'سارية', color: 'success', count: passport.value?.documents.valid },
  { key: 'expiringSoon', label: 'قريبة الانتهاء', color: 'warning', count: passport.value?.documents.expiringSoon },
  { key: 'expired', label: 'منتهية', color: 'error', count: passport.value?.documents.expired },
  { key: 'needsExpiry', label: 'تحتاج تاريخ انتهاء', color: 'info', count: passport.value?.documents.needsExpiry }
])

async function loadPassport() {
  const version = ++loadVersion
  const userId = authStore.userId
  const selectedCarId = carStore.car?.id || null
  snapshot.value = null
  if (!userId) { state.value = 'empty'; return }
  state.value = 'loading'
  try {
    let carQuery = supabase.from('cars').select('*').eq('user_id', userId)
    carQuery = selectedCarId ? carQuery.eq('id', selectedCarId) : carQuery.limit(1)
    const result = await carQuery.maybeSingle()
    if (version !== loadVersion || authStore.userId !== userId) return
    if (result.error) throw new Error('LOAD_FAILED')
    const car = result.data
    if (!car || car.user_id !== userId || car.deletion_requested === true) { state.value = 'empty'; return }
    const tables = ['maintenance_tasks', 'maintenance_records', 'documents', 'odometer_readings']
    const results = await Promise.all(tables.map(table => supabase.from(table).select('*').eq('user_id', userId).eq('car_id', car.id)))
    if (version !== loadVersion || authStore.userId !== userId) return
    if (results.some(result => result.error)) throw new Error('LOAD_FAILED')
    snapshot.value = { userId, car, tasks: results[0].data, records: results[1].data, documents: results[2].data, readings: results[3].data }
    state.value = 'ready'
  } catch {
    if (version === loadVersion) { snapshot.value = null; state.value = 'error' }
  }
}

function formatNumber(value) {
  return value === null || value === undefined ? 'غير مسجل' : Number(value).toLocaleString('ar-SA', { maximumFractionDigits: 0 })
}

function formatCost(value) { return value === null ? 'التكلفة غير مسجلة' : `${Number(value).toLocaleString('ar-SA', { maximumFractionDigits: 2 })} ر.س` }
function formatDate(value) { return parseMaintenanceRecordDateV1(value)?.toLocaleDateString('ar-SA', { calendar: 'gregory' }) || 'التاريخ غير مسجل' }
function taskLabel(status) { return { late: 'متأخر', due: 'مستحق الآن', soon: 'قريب', needs_setup: 'تحتاج إعداد', good: 'على ما يرام' }[status] || '' }
function taskColor(status) { return { late: 'error', due: 'warning', soon: 'info', needs_setup: 'info', good: 'success' }[status] || 'grey' }

watch(() => [authStore.userId, carStore.car?.id], loadPassport, { immediate: true })
onBeforeUnmount(() => { loadVersion += 1; snapshot.value = null })
</script>

<style scoped>
.passport-view { max-width: 1120px; margin-inline: auto; min-width: 0; }
.identity-title, .odometer-block, .history-description, .history-values { min-width: 0; overflow-wrap: anywhere; }
.private-identity, .cost-summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
dd { margin: 4px 0 0; overflow-wrap: anywhere; }
.private-identity dd[dir="ltr"] { text-align: start; }
.maintenance-history { list-style: none; margin: 0; padding: 0; }
.history-row { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; padding-block: 14px; border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12); }
.history-row:last-child { border-bottom: 0; }
.history-values { font-variant-numeric: tabular-nums; }
@media (max-width: 480px) {
  .private-identity, .cost-summary { grid-template-columns: 1fr; }
  .passport-view h1 { font-size: 1.6rem !important; }
}
</style>
