<template>
  <v-dialog :model-value="modelValue" max-width="560" scrollable :persistent="loading" @update:model-value="$emit('update:modelValue', $event)">
    <v-card class="rounded-xl">
      <v-card-title class="pa-5">
        <v-icon color="primary" class="me-2">mdi-wrench-clock</v-icon>
        إعداد {{ task?.name || 'مهمة الصيانة' }}
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-5">
        <p class="text-body-2 text-medium-emphasis mb-4">
          نحتاج خط بداية موثوقًا لحساب الموعد القادم. لن ننشئ سجل صيانة إلا عند تسجيل صيانة فعلية.
        </p>

        <v-radio-group v-model="choice" :disabled="loading" hide-details class="mb-3">
          <v-radio value="maintenance" label="أعرف آخر صيانة" />
          <v-radio value="tracking_start" label="ابدأ الحساب من اليوم" />
          <v-radio value="unknown" label="لا أعرف" />
        </v-radio-group>

        <template v-if="choice === 'maintenance'">
          <v-text-field
            v-model="lastMaintenanceDate"
            label="تاريخ آخر صيانة"
            type="date"
            prepend-inner-icon="mdi-calendar"
            :max="todayInput"
            :disabled="loading"
            class="mb-2"
          />
          <v-text-field
            v-if="needsDistance"
            v-model.number="lastMaintenanceOdometer"
            label="العداد وقت آخر صيانة"
            type="number"
            min="0"
            step="1"
            suffix="كم"
            prepend-inner-icon="mdi-speedometer"
            :disabled="loading"
            class="mb-2"
          />
        </template>

        <v-alert v-else-if="choice === 'tracking_start'" type="info" variant="tonal" class="mt-2" role="status">
          سنستخدم تاريخ اليوم وعداد السيارة الحالي كبداية للمتابعة. لن نضيف سجل صيانة.
        </v-alert>
        <v-alert v-else type="info" variant="tonal" class="mt-2" role="status">
          ستبقى المهمة «تحتاج إعداد» دون موعد أو تأخير محسوب، ويمكنك إعدادها لاحقًا.
        </v-alert>

        <v-alert v-if="formError" type="error" variant="tonal" class="mt-3" role="alert">
          {{ formError }}
        </v-alert>
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" :disabled="loading" @click="$emit('update:modelValue', false)">إلغاء</v-btn>
        <v-btn color="primary" :loading="loading" :disabled="loading" @click="saveBaseline">حفظ الإعداد</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { buildMaintenanceBaselineV1 } from '@/lib/maintenance-baseline-v1'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  task: { type: Object, default: null },
  currentOdometer: { type: Number, default: 0 },
  baseline: { type: Object, default: null },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'save'])
const choice = ref('unknown')
const lastMaintenanceDate = ref('')
const lastMaintenanceOdometer = ref(null)
const formError = ref('')
const todayInput = (() => {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
})()

const needsDistance = computed(() => props.task
  && (props.task.type === 'distance' || props.task.type === 'both')
  && Number(props.task.intervalKm) > 0)

watch(() => [props.modelValue, props.baseline, props.task], () => {
  if (!props.modelValue) return
  const baseline = props.baseline || props.task || {}
  choice.value = ['reported_maintenance', 'maintenance_record'].includes(baseline.baselineType)
    ? 'maintenance'
    : baseline.baselineType === 'tracking_start' ? 'tracking_start' : 'unknown'
  lastMaintenanceDate.value = baseline.lastMaintenanceDate ? baseline.lastMaintenanceDate.slice(0, 10) : ''
  lastMaintenanceOdometer.value = baseline.lastMaintenanceOdometer ?? null
  formError.value = ''
}, { immediate: true })

function saveBaseline() {
  formError.value = ''
  try {
    const baseline = buildMaintenanceBaselineV1({
      task: props.task,
      choice: choice.value,
      lastMaintenanceDate: lastMaintenanceDate.value,
      lastMaintenanceOdometer: lastMaintenanceOdometer.value,
      currentOdometer: props.currentOdometer,
      today: new Date()
    })
    emit('save', baseline)
  } catch (error) {
    formError.value = error.message || 'تعذر حفظ إعداد المهمة.'
  }
}
</script>
