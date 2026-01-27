<template>
  <div class="user-profile">
    <!-- Logged In State -->
    <template v-if="authStore.isAuthenticated">
      <v-menu location="top end" :offset="8">
        <template #activator="{ props }">
          <div class="profile-section" v-bind="props">
            <!-- User Info Display -->
            <div class="user-info px-4 py-3">
              <v-avatar color="primary" size="42" class="elevation-2 mb-2">
                <span class="text-h6 font-weight-bold text-white">
                  {{ userInitials }}
                </span>
              </v-avatar>
              <div class="user-details text-center">
                <div class="user-name text-truncate">
                  {{ displayName }}
                </div>
                <div class="user-email text-truncate">
                  {{ authStore.userEmail }}
                </div>
              </div>
            </div>
            <!-- Menu trigger hint -->
            <div class="menu-hint d-flex align-center justify-center py-2">
              <v-icon size="16" class="opacity-50">mdi-chevron-up</v-icon>
            </div>
          </div>
        </template>
        <v-card class="rounded-xl elevation-4" min-width="200">
          <v-list density="compact" class="py-2">
            <v-list-item to="/settings" class="px-4">
              <template #prepend>
                <v-icon size="20" color="primary">mdi-cog</v-icon>
              </template>
              <v-list-item-title>الإعدادات</v-list-item-title>
            </v-list-item>
            <v-divider class="my-1"></v-divider>
            <v-list-item @click="emit('logout')" class="px-4">
              <template #prepend>
                <v-icon size="20" color="error">mdi-logout</v-icon>
              </template>
              <v-list-item-title class="text-error">تسجيل الخروج</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>
      </v-menu>
    </template>

    <!-- Logged Out State -->
    <template v-else>
      <div class="px-4 py-3">
        <v-btn color="primary" block to="/login">
          <v-icon start>mdi-login</v-icon>
          تسجيل الدخول
        </v-btn>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useProfileStore } from '@/stores/profile'

const authStore = useAuthStore()
const profileStore = useProfileStore()

const emit = defineEmits(['logout'])

// Fetch profile on mount if authenticated
onMounted(async () => {
  if (authStore.isAuthenticated && !profileStore.hasProfile) {
    await profileStore.fetchProfile()
  }
})

// Display name: use profile name if available, otherwise email prefix
const displayName = computed(() => {
  if (profileStore.fullName) {
    return profileStore.fullName
  }
  // Fallback to email prefix
  const email = authStore.userEmail
  return email ? email.split('@')[0] : 'مستخدم'
})

// User initials from profile name or email
const userInitials = computed(() => {
  if (profileStore.firstName) {
    const first = profileStore.firstName.charAt(0)
    const last = profileStore.lastName?.charAt(0) || ''
    return `${first}${last}`.toUpperCase()
  }
  // Fallback to email initial
  return authStore.userInitials
})
</script>

<style scoped>
.user-profile {
  border-top: 1px solid rgba(var(--v-border-color), 0.1);
  padding-bottom: 8px;
}

.profile-section {
  cursor: pointer;
  margin: 8px;
  border-radius: 12px;
  transition: background-color 0.2s ease;
  background: rgba(var(--v-theme-surface-variant), 0.3);
}

.profile-section:hover {
  background: rgba(var(--v-theme-primary), 0.08);
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.user-details {
  width: 100%;
  max-width: 160px;
}

.user-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  line-height: 1.3;
}

.user-email {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  line-height: 1.3;
}

.menu-hint {
  border-top: 1px solid rgba(var(--v-border-color), 0.08);
}
</style>
