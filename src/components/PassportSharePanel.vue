<template>
  <v-card class="glass-card pa-5 pa-sm-6 passport-sharing" aria-labelledby="passport-share-title">
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-3">
      <h2 id="passport-share-title" class="text-h6 font-weight-bold">مشاركة جواز السيارة</h2>
      <v-chip v-if="statusLoaded" :color="enabled ? 'success' : 'grey'" variant="tonal">
        {{ enabled ? 'المشاركة مفعّلة' : 'المشاركة متوقفة' }}
      </v-chip>
    </div>
    <p class="text-body-2 text-medium-emphasis mb-4">
      شارك معلومات أساسية وسجل صيانة محدود دون إظهار بياناتك الشخصية أو مستنداتك الخاصة.
      اللوحة وVIN والتكاليف والمرفقات لا تظهر في الرابط العام.
    </p>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" role="alert">
      {{ error }}
      <v-btn variant="text" :disabled="busy" @click="runOperation('getStatus')">إعادة المحاولة</v-btn>
    </v-alert>
    <div v-if="busy && !statusLoaded" class="d-flex align-center ga-3 py-3" role="status">
      <v-progress-circular indeterminate size="24" width="2" color="primary" aria-label="جارٍ التحقق من المشاركة" />
      <span>جارٍ التحقق من حالة المشاركة…</span>
    </div>
    <template v-else-if="statusLoaded && enabled && shareUrl">
      <v-text-field
        ref="linkField"
        :model-value="shareUrl"
        label="رابط المشاركة — يظهر فقط لك"
        dir="ltr"
        readonly
        variant="outlined"
        hide-details
        class="share-link mb-4"
        @focus="selectLink"
      />
      <div class="d-flex flex-wrap ga-2 mb-3">
        <v-btn color="primary" prepend-icon="mdi-content-copy" :disabled="busy" @click="copyLink">نسخ الرابط</v-btn>
        <v-btn variant="tonal" prepend-icon="mdi-share-variant-outline" :disabled="busy" @click="shareLink">مشاركة الرابط</v-btn>
        <v-btn :href="shareUrl" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer" variant="text" prepend-icon="mdi-open-in-new" :disabled="busy">
          معاينة ما سيراه الآخرون
        </v-btn>
      </div>
      <v-divider class="my-4" />
      <div class="d-flex flex-wrap ga-2">
        <v-btn variant="outlined" :loading="pendingOperation === 'rotate'" :disabled="busy" prepend-icon="mdi-refresh" @click="askConfirmation('rotate')">إنشاء رابط جديد</v-btn>
        <v-btn color="error" variant="text" :loading="pendingOperation === 'disable'" :disabled="busy" prepend-icon="mdi-link-off" @click="askConfirmation('disable')">إيقاف المشاركة</v-btn>
      </div>
      <p class="text-caption text-medium-emphasis mt-3">أي شخص لديه الرابط يستطيع عرض الجواز العام؛ يمكنك إيقافه أو استبداله في أي وقت.</p>
    </template>
    <v-btn v-else-if="statusLoaded" color="primary" prepend-icon="mdi-link-plus" :loading="busy" :disabled="busy" @click="runOperation('enable')">تفعيل المشاركة</v-btn>
    <p v-if="feedback" class="text-body-2 mt-3" role="status" aria-live="polite">{{ feedback }}</p>

    <v-dialog v-model="confirmationOpen" max-width="460" :persistent="busy" scrollable>
      <v-card v-if="confirmation" class="pa-2">
        <v-card-title class="dialog-heading">{{ confirmation.title }}</v-card-title>
        <v-card-text class="text-body-1">{{ confirmation.message }}</v-card-text>
        <v-card-actions class="flex-wrap ga-2">
          <v-btn variant="text" :disabled="busy" @click="confirmationOpen = false">إلغاء</v-btn>
          <v-spacer />
          <v-btn :color="confirmationOperation === 'disable' ? 'error' : 'primary'" variant="flat" :loading="busy" :disabled="busy" @click="confirmOperation">{{ confirmation.confirm }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { firebaseAuth } from '../lib/firebase'
import {
  buildPassportShareUrlV1,
  copyPassportLinkV1,
  getPassportShareConfirmationV1,
  requestPassportShareV1,
  sharePassportLinkV1
} from '../lib/passport-sharing-v1'

const props = defineProps({ carId: { type: String, required: true }, userId: { type: String, required: true } })
const enabled = ref(false)
const token = ref(null)
const statusLoaded = ref(false)
const pendingOperation = ref(null)
const error = ref('')
const feedback = ref('')
const linkField = ref(null)
const confirmationOpen = ref(false)
const confirmationOperation = ref(null)
const busy = computed(() => pendingOperation.value !== null)
const shareUrl = computed(() => enabled.value ? buildPassportShareUrlV1(window.location.origin, token.value) : null)
const confirmation = computed(() => getPassportShareConfirmationV1(confirmationOperation.value))
let requestVersion = 0
let activeRequest = null

function clearState() {
  enabled.value = false
  token.value = null
  statusLoaded.value = false
  error.value = ''
  feedback.value = ''
  confirmationOpen.value = false
  confirmationOperation.value = null
}

async function runOperation(operation) {
  if (busy.value) return
  const version = ++requestVersion
  const expectedUserId = props.userId
  const expectedCarId = props.carId
  activeRequest = new globalThis.AbortController()
  pendingOperation.value = operation
  error.value = ''
  feedback.value = ''
  try {
    const result = await requestPassportShareV1({
      carId: expectedCarId,
      operation,
      signal: activeRequest.signal,
      getIdToken: async () => {
        const user = firebaseAuth.currentUser
        if (!user || user.uid !== expectedUserId) throw new Error('AUTH_CHANGED')
        return user.getIdToken()
      }
    })
    if (version !== requestVersion || props.userId !== expectedUserId || props.carId !== expectedCarId || firebaseAuth.currentUser?.uid !== expectedUserId) return
    enabled.value = result.enabled
    token.value = result.token
    statusLoaded.value = true
    if (operation === 'enable') feedback.value = 'تم تفعيل المشاركة.'
    if (operation === 'rotate') feedback.value = 'تم إنشاء رابط جديد؛ الرابط السابق لم يعد متاحًا.'
    if (operation === 'disable') feedback.value = 'تم إيقاف المشاركة.'
  } catch (failure) {
    if (version !== requestVersion) return
    // A lost mutation response must not leave an obsolete bearer link on screen.
    token.value = null
    enabled.value = false
    statusLoaded.value = false
    error.value = failure.message
  } finally {
    if (version === requestVersion) {
      pendingOperation.value = null
      activeRequest = null
    }
  }
}

function askConfirmation(operation) {
  confirmationOperation.value = operation
  confirmationOpen.value = true
}

async function confirmOperation() {
  const operation = confirmationOperation.value
  confirmationOpen.value = false
  await runOperation(operation)
}

function selectLink() {
  const input = linkField.value?.$el?.querySelector('input')
  input?.focus()
  input?.select()
}

function feedbackFor(result) {
  if (result === 'copied') return 'تم نسخ الرابط.'
  if (result === 'shared') return 'تمت المشاركة.'
  if (result === 'manual') return 'تم تحديد الرابط. استخدم خيار النسخ في جهازك.'
  return ''
}

async function copyLink() {
  if (!shareUrl.value || busy.value) return
  const version = requestVersion
  const result = await copyPassportLinkV1(shareUrl.value, { manualSelect: selectLink })
  if (version === requestVersion) feedback.value = feedbackFor(result)
}

async function shareLink() {
  if (!shareUrl.value || busy.value) return
  const version = requestVersion
  const result = await sharePassportLinkV1(shareUrl.value, { manualSelect: selectLink })
  if (version === requestVersion) feedback.value = feedbackFor(result)
}

watch(() => [props.userId, props.carId], () => {
  requestVersion += 1
  activeRequest?.abort()
  activeRequest = null
  pendingOperation.value = null
  clearState()
  runOperation('getStatus')
}, { immediate: true })

onBeforeUnmount(() => {
  requestVersion += 1
  activeRequest?.abort()
  token.value = null
})
</script>

<style scoped>
.passport-sharing { min-width: 0; }
.share-link :deep(input) { font-size: 0.875rem; }
.dialog-heading { white-space: normal; overflow-wrap: anywhere; }
</style>
