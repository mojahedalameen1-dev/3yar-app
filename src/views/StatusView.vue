<template>
  <main class="public-passport" dir="rtl">
    <header class="public-passport-header">
      <div class="d-flex align-center ga-3">
        <v-img :src="ayarLogo" width="42" height="42" alt="شعار عيار" class="flex-grow-0" />
        <div>
          <p class="text-overline text-primary mb-0">عيار</p>
          <h1 class="text-h5 font-weight-bold">جواز السيارة</h1>
        </div>
      </div>
      <p class="text-body-2 text-medium-emphasis mb-0">معلومات شاركها مالك السيارة</p>
    </header>

    <v-card v-if="state === 'loading'" rounded="xl" class="pa-8 text-center" role="status" aria-live="polite">
      <v-progress-circular indeterminate color="primary" class="mb-4" />
      <p class="mb-0">جاري تحميل جواز السيارة…</p>
    </v-card>

    <v-card v-else-if="state !== 'ready'" rounded="xl" class="pa-6 pa-sm-10 text-center">
      <v-icon size="40" color="primary" class="mb-4">{{ state === 'error' ? 'mdi-cloud-alert-outline' : 'mdi-share-off-outline' }}</v-icon>
      <h2 class="text-h6 mb-3" role="status">{{ state === 'error' ? messages.error : messages.unavailable }}</h2>
      <v-btn v-if="state === 'error'" color="primary" class="mt-2" @click="loadPassport">إعادة المحاولة</v-btn>
    </v-card>

    <template v-else-if="passport">
      <v-card rounded="xl" class="pa-5 pa-sm-7 mb-5" variant="outlined">
        <div class="passport-identity">
          <div>
            <h2 class="text-h5 font-weight-bold mb-2">{{ [passport.car.make, passport.car.model].filter(Boolean).join(' ') || 'السيارة' }}</h2>
            <p class="text-body-1 text-medium-emphasis mb-0">
              {{ passport.car.year ?? 'سنة غير مسجلة' }}<span v-if="passport.car.color"> · {{ passport.car.color }}</span>
            </p>
          </div>
          <div class="odometer-summary">
            <p class="text-caption text-medium-emphasis mb-1">العداد الحالي</p>
            <p class="text-h5 font-weight-bold mb-0">{{ formatNumber(passport.car.currentOdometer) }} <span class="text-body-2">كم</span></p>
          </div>
        </div>
      </v-card>

      <div class="passport-summary mb-5">
        <v-card rounded="lg" variant="tonal" class="pa-4">
          <p class="text-body-2 text-medium-emphasis mb-1">عمليات الصيانة المتاحة</p>
          <p class="text-h6 font-weight-bold mb-0">{{ formatNumber(passport.summary.maintenanceCount) }}</p>
        </v-card>
        <v-card rounded="lg" variant="tonal" class="pa-4">
          <p class="text-body-2 text-medium-emphasis mb-1">آخر صيانة مسجلة</p>
          <p class="text-h6 font-weight-bold mb-0">{{ formatDate(passport.summary.lastMaintenanceDate) }}</p>
        </v-card>
      </div>

      <v-card rounded="xl" class="pa-5 pa-sm-7 mb-5">
        <h2 class="text-h6 font-weight-bold mb-4">سجل الصيانة</h2>
        <p v-if="!passport.maintenance.length" class="text-body-1 text-medium-emphasis mb-0">لا توجد عمليات صيانة متاحة للمشاركة.</p>
        <ol v-else class="maintenance-list">
          <li v-for="(record, index) in passport.maintenance" :key="index" class="maintenance-item">
            <div class="flex-grow-1">
              <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ record.name || 'صيانة' }}</h3>
              <p class="text-body-2 text-medium-emphasis mb-0">{{ formatDate(record.date) }}</p>
            </div>
            <p class="text-body-2 mb-0">{{ formatNumber(record.odometerReading) }} كم</p>
          </li>
        </ol>
        <p v-if="passport.truncated" class="text-body-2 text-medium-emphasis mt-4 mb-0">هذا ملخص محدود؛ قد لا يشمل كل السجلات أو نسخ الوثائق.</p>
      </v-card>

      <v-card rounded="xl" class="pa-5 pa-sm-7 mb-5">
        <h2 class="text-h6 font-weight-bold mb-4">حالة وثائق السيارة</h2>
        <p v-if="!passport.documents.length" class="text-body-1 text-medium-emphasis mb-0">لا توجد وثائق سيارة متاحة للمشاركة.</p>
        <ul v-else class="document-list">
          <li v-for="document in passport.documents" :key="document.type" class="document-item">
            <span class="text-body-1">{{ document.label }}</span>
            <v-chip :color="statusColor(document.status)" variant="tonal" class="document-status">{{ statusLabels[document.status] }}</v-chip>
          </li>
        </ul>
      </v-card>

      <v-alert type="info" variant="tonal" rounded="lg" class="passport-disclaimer">{{ messages.disclaimer }}</v-alert>
    </template>
  </main>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import ayarLogo from '@/assets/ayar-logo.png'
import { DOCUMENT_STATUS_LABELS_V1 } from '@/lib/document-status-v1'
import { loadPublicPassportV1, PUBLIC_PASSPORT_MESSAGES_V1 } from '@/lib/public-passport-v1'

const route = useRoute()
const messages = PUBLIC_PASSPORT_MESSAGES_V1
const statusLabels = DOCUMENT_STATUS_LABELS_V1
const passport = ref(null)
const state = ref('loading')
let requestVersion = 0
let controller
let previousRobots
let previousReferrer
let robotsMeta
let referrerMeta

async function loadPassport() {
  const version = ++requestVersion
  controller?.abort()
  controller = new globalThis.AbortController()
  // Clear a previously delivered DTO before every recheck or URL change.
  passport.value = null
  state.value = 'loading'
  const result = await loadPublicPassportV1({ hash: route.hash, legacy: route.meta.legacyShare === true, signal: controller.signal })
  if (version !== requestVersion) return
  passport.value = result.passport
  state.value = result.state
}

function protectMeta(name, content) {
  let element = document.querySelector(`meta[name="${name}"]`)
  const previous = element ? element.getAttribute('content') : null
  if (!element) {
    element = document.createElement('meta')
    element.name = name
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
  return { element, previous }
}

function restoreMeta(element, previous) {
  if (!element) return
  if (previous === null) element.remove()
  else element.setAttribute('content', previous)
}

function visibilityChanged() {
  if (document.visibilityState === 'hidden') {
    ++requestVersion
    controller?.abort()
    passport.value = null
    state.value = 'loading'
  } else loadPassport()
}

function pageHidden() {
  ++requestVersion
  controller?.abort()
  passport.value = null
  state.value = 'loading'
}

function pageShown(event) {
  if (event.persisted) loadPassport()
}

function formatNumber(value) {
  return value === null ? 'غير مسجل' : value.toLocaleString('ar-SA')
}

function formatDate(value) {
  return value ? new Date(`${value}T00:00:00Z`).toLocaleDateString('ar-SA', { calendar: 'gregory', timeZone: 'UTC' }) : 'غير مسجل'
}

function statusColor(status) {
  return { valid: 'success', expiring_soon: 'warning', expired: 'error', needs_expiry: 'info' }[status]
}

watch(() => [route.hash, route.meta.legacyShare], loadPassport)

onMounted(() => {
  const robots = protectMeta('robots', 'noindex, nofollow')
  robotsMeta = robots.element
  previousRobots = robots.previous
  const referrer = protectMeta('referrer', 'no-referrer')
  referrerMeta = referrer.element
  previousReferrer = referrer.previous
  document.addEventListener('visibilitychange', visibilityChanged)
  window.addEventListener('pagehide', pageHidden)
  window.addEventListener('pageshow', pageShown)
  loadPassport()
})

onUnmounted(() => {
  ++requestVersion
  controller?.abort()
  passport.value = null
  document.removeEventListener('visibilitychange', visibilityChanged)
  window.removeEventListener('pagehide', pageHidden)
  window.removeEventListener('pageshow', pageShown)
  restoreMeta(robotsMeta, previousRobots)
  restoreMeta(referrerMeta, previousReferrer)
})
</script>

<style scoped>
.public-passport {
  min-height: 100dvh;
  max-width: 860px;
  margin-inline: auto;
  padding: 24px;
  background: rgb(var(--v-theme-background));
}
.public-passport-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-block-end: 28px;
}
.passport-identity, .maintenance-item, .document-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  min-width: 0;
  overflow-wrap: anywhere;
}
.passport-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.maintenance-list, .document-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.maintenance-item, .document-item {
  padding-block: 16px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}
.maintenance-item:last-child, .document-item:last-child { border-bottom: 0; }
.document-status { height: auto; min-height: 32px; white-space: normal; }
.document-status :deep(.v-chip__content) { white-space: normal; }
.passport-disclaimer { line-height: 1.8; }
@media (max-width: 600px) {
  .public-passport { padding: 20px 16px; }
  .passport-summary { grid-template-columns: 1fr; }
  .passport-identity { align-items: flex-start; }
}
</style>
