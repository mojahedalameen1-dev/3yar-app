<template>
  <div class="notifications-view">
    <div class="d-flex align-center mb-6">
      <v-btn icon="mdi-arrow-right" variant="text" class="me-2" @click="$router.back()"></v-btn>
      <h1 class="text-h4 font-weight-bold">الإشعارات</h1>
      <v-spacer></v-spacer>
      <v-chip v-if="notificationsStore.unreadCount > 0" color="error" variant="flat">
        {{ notificationsStore.unreadCount }} رسالة جديدة
      </v-chip>
    </div>

    <div v-if="notificationsStore.loading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
    </div>

    <div v-else-if="notificationsStore.announcements.length === 0" class="empty-state">
      <v-icon size="80" color="grey-lighten-2">mdi-bell-off-outline</v-icon>
      <div class="text-h6 text-medium-emphasis mt-4">لا توجد إشعارات حالياً</div>
    </div>

    <v-row v-else>
      <v-col v-for="ann in notificationsStore.announcements" :key="ann.id" cols="12">
        <v-card 
          :class="['notification-card', { 'is-unread': isUnread(ann.id) }]"
          rounded="xl"
          elevation="2"
        >
          <div class="d-flex pa-4">
            <v-avatar :color="getTypeColor(ann.type)" size="48" class="me-4 flex-shrink-0">
              <v-icon color="white">{{ getTypeIcon(ann.type) }}</v-icon>
            </v-avatar>
            
            <div class="flex-grow-1">
              <div class="d-flex align-center justify-space-between mb-1">
                <h3 class="text-h6 font-weight-bold">{{ ann.title }}</h3>
                <span class="text-caption text-medium-emphasis">{{ formatDate(ann.created_at) }}</span>
              </div>
              <p class="text-body-1 text-medium-emphasis">{{ ann.message }}</p>
              
              <div v-if="isUnread(ann.id)" class="mt-2">
                <v-chip color="error" size="x-small" variant="flat" class="font-weight-bold">جديد</v-chip>
              </div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useNotificationsStore } from '@/stores/notifications'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/ar'

dayjs.extend(relativeTime)
dayjs.locale('ar')

const notificationsStore = useNotificationsStore()

function isUnread(id) {
  return !notificationsStore.readAnnouncements.some(r => r.announcement_id === id)
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

onMounted(async () => {
  await notificationsStore.fetchAnnouncements()
  await notificationsStore.fetchReadHistory()
  
  // Mark as read after a short delay or immediately
  if (notificationsStore.unreadCount > 0) {
    setTimeout(() => {
      notificationsStore.markAllAsRead()
    }, 2000)
  }
})
</script>

<style scoped>
.notification-card {
  transition: all 0.3s ease;
  border-right: 4px solid transparent;
}

.is-unread {
  background: rgba(var(--v-theme-primary), 0.05) !important;
  border-right-color: rgb(var(--v-theme-error)) !important;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
}
</style>
