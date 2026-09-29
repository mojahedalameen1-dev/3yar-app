<template>
  <div class="notifications-view">
    <div class="d-flex align-center mb-6">
      <v-btn icon="mdi-arrow-right" variant="text" class="me-2" aria-label="العودة" @click="$router.back()"></v-btn>
      <h1 class="text-h4 font-weight-bold">التنبيهات</h1>
      <v-spacer></v-spacer>
      <v-chip v-if="notificationsStore.totalNotificationCount > 0" color="primary" variant="tonal" aria-label="عدد التنبيهات">
        {{ notificationsStore.totalNotificationCount }} تنبيه
      </v-chip>
    </div>

    <section aria-labelledby="vehicle-reminders-heading" class="mb-8">
      <div class="d-flex align-center mb-3">
        <v-icon color="info" class="me-2" aria-hidden="true">mdi-car-alert</v-icon>
        <h2 id="vehicle-reminders-heading" class="text-h6 font-weight-bold">تنبيهات سيارتك</h2>
        <v-chip v-if="notificationsStore.actionReminderCount" class="ms-3" color="info" size="small" variant="tonal">
          {{ notificationsStore.actionReminderCount }}
        </v-chip>
      </div>

      <v-alert v-if="vehicleSourceError" type="warning" variant="tonal" class="mb-3" role="alert">
        تعذر تحديث بعض تنبيهات السيارة. نعرض المتاح من البيانات.
        <v-btn size="small" variant="text" :loading="vehicleRetrying" :disabled="vehicleRetrying" @click="retryVehicleSources">إعادة المحاولة</v-btn>
      </v-alert>

      <v-card class="glass-card">
        <v-list v-if="notificationsStore.actionReminders.length" class="bg-transparent py-0">
          <v-list-item
            v-for="reminder in notificationsStore.actionReminders"
            :key="reminder.id"
            :to="reminder.actionRoute"
            class="py-3 reminder-item"
          >
            <template #prepend>
              <v-avatar :color="reminderColor(reminder.severity)" variant="tonal" size="44" class="me-2">
                <v-icon>{{ reminderIcon(reminder.source, reminder.severity) }}</v-icon>
              </v-avatar>
            </template>
            <v-list-item-title class="font-weight-bold text-wrap">{{ reminder.title }}</v-list-item-title>
            <v-list-item-subtitle class="text-wrap mt-1">{{ reminder.message }}</v-list-item-subtitle>
            <template #append><v-icon aria-hidden="true">mdi-chevron-left</v-icon></template>
          </v-list-item>
        </v-list>
        <div v-else-if="vehicleSourcesLoading" class="text-center py-8" role="status">
          <v-progress-circular indeterminate color="primary" aria-label="جارٍ تحميل تنبيهات السيارة" />
        </div>
        <div v-else-if="vehicleSourceError" class="empty-state py-8" role="status">
          <v-icon size="44" color="warning" aria-hidden="true">mdi-information-outline</v-icon>
          <div class="text-body-2 text-medium-emphasis mt-3">تعذر التحقق من جميع تنبيهات السيارة.</div>
        </div>
        <div v-else-if="!vehicleSourceError" class="empty-state py-8">
          <v-icon size="48" color="success" aria-hidden="true">mdi-check-circle-outline</v-icon>
          <div class="text-body-1 text-medium-emphasis mt-3">لا توجد تنبيهات تحتاج إجراءً الآن</div>
        </div>
      </v-card>
    </section>

    <section aria-labelledby="announcements-heading">
      <div class="d-flex align-center mb-3">
        <v-icon color="primary" class="me-2" aria-hidden="true">mdi-bullhorn-outline</v-icon>
        <h2 id="announcements-heading" class="text-h6 font-weight-bold">إعلانات عيار</h2>
        <v-chip v-if="notificationsStore.unreadCount" class="ms-3" color="primary" size="small" variant="tonal">
          {{ notificationsStore.unreadCount }} جديد
        </v-chip>
      </div>

      <v-alert v-if="notificationsStore.announcementError || notificationsStore.readHistoryError" type="warning" variant="tonal" class="mb-3" role="alert">
        {{ notificationsStore.announcementError ? 'تعذر تحديث إعلانات عيار.' : 'تعذر تحديث حالة قراءة الإعلانات.' }}
        <v-btn size="small" variant="text" :loading="announcementRetrying" :disabled="announcementRetrying" @click="retryAnnouncements">إعادة المحاولة</v-btn>
      </v-alert>

      <v-card v-if="notificationsStore.announcements.length" class="glass-card">
        <v-list class="bg-transparent py-0">
          <v-list-item
            v-for="ann in notificationsStore.announcements"
            :key="ann.id"
            :class="['announcement-item py-3', { 'is-unread': isUnread(ann.id) }]"
          >
            <template #prepend>
              <v-avatar :color="getTypeColor(ann.type)" size="44" class="me-2 flex-shrink-0">
                <v-icon color="white">{{ getTypeIcon(ann.type) }}</v-icon>
              </v-avatar>
            </template>
            <v-list-item-title class="font-weight-bold text-wrap">{{ ann.title }}</v-list-item-title>
            <v-list-item-subtitle class="text-wrap mt-1">{{ ann.message }}</v-list-item-subtitle>
            <template #append>
              <div class="text-caption text-medium-emphasis text-no-wrap ms-2">{{ formatDate(ann.created_at) }}</div>
            </template>
          </v-list-item>
        </v-list>
      </v-card>
      <v-card v-else-if="notificationsStore.announcementsLoading" class="glass-card text-center py-8" role="status">
        <v-progress-circular indeterminate color="primary" aria-label="جارٍ تحميل إعلانات عيار" />
      </v-card>
      <v-card v-else-if="!notificationsStore.announcementError" class="glass-card empty-state py-8">
        <v-icon size="48" color="grey-lighten-1" aria-hidden="true">mdi-bullhorn-outline</v-icon>
        <div class="text-body-1 text-medium-emphasis mt-3">لا توجد إعلانات حاليًا</div>
      </v-card>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, nextTick } from 'vue'
import { useNotificationsStore } from '@/stores/notifications'
import { useDocumentsStore } from '@/stores/documents'
import { useTasksStore } from '@/stores/tasks'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/ar'

dayjs.extend(relativeTime)
dayjs.locale('ar')

const notificationsStore = useNotificationsStore()
const documentsStore = useDocumentsStore()
const tasksStore = useTasksStore()
const vehicleRetrying = ref(false)
const announcementRetrying = ref(false)
const vehicleSourceError = computed(() => Boolean(documentsStore.error || tasksStore.error))
const vehicleSourcesLoading = computed(() => documentsStore.loading || tasksStore.loading)

function isUnread(id) {
  return notificationsStore.readHistoryReady
    && !notificationsStore.readAnnouncements.some(r => r.announcement_id === id)
}

function reminderColor(severity) {
  return { critical: 'error', warning: 'warning', info: 'info' }[severity] || 'primary'
}

function reminderIcon(source, severity) {
  if (source === 'maintenance') return severity === 'critical' ? 'mdi-wrench-clock' : 'mdi-wrench-outline'
  return severity === 'critical' ? 'mdi-file-alert' : 'mdi-file-document-alert-outline'
}

function getTypeColor(type) {
  const colors = {
    info: 'blue',
    warning: 'orange',
    success: 'green',
    error: 'red'
  }
  return colors[type] || 'blue'
}

function getTypeIcon(type) {
  const icons = {
    info: 'mdi-information',
    warning: 'mdi-alert',
    success: 'mdi-check-circle',
    error: 'mdi-alert-octagon'
  }
  return icons[type] || 'mdi-bell'
}

function formatDate(date) {
  return dayjs(date).fromNow()
}

async function retryVehicleSources() {
  vehicleRetrying.value = true
  const requests = []
  if (documentsStore.error) requests.push(documentsStore.fetchDocuments())
  if (tasksStore.error) requests.push(tasksStore.fetchTasks())
  try { await Promise.all(requests) } finally { vehicleRetrying.value = false }
}

async function retryAnnouncements() {
  announcementRetrying.value = true
  try {
    const requests = []
    if (notificationsStore.announcementError) requests.push(notificationsStore.fetchAnnouncements())
    if (notificationsStore.readHistoryError) requests.push(notificationsStore.fetchReadHistory())
    await Promise.all(requests)
  } finally { announcementRetrying.value = false }
}

onMounted(async () => {
  await Promise.all([notificationsStore.fetchAnnouncements(), notificationsStore.fetchReadHistory()])
  await nextTick()
  if (notificationsStore.readHistoryReady && notificationsStore.announcements.length) {
    await notificationsStore.markAllAsRead()
  }
})
</script>

<style scoped>
.reminder-item + .reminder-item,
.announcement-item + .announcement-item { border-top: 1px solid rgba(var(--v-border-color), 0.18); }
.is-unread { background: rgba(var(--v-theme-primary), 0.05) !important; border-inline-start: 3px solid rgb(var(--v-theme-primary)); }
.text-wrap { white-space: normal; overflow-wrap: anywhere; }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
}
</style>
