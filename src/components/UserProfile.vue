<template>
  <div class="user-profile">
    <!-- Logged In State -->
    <template v-if="authStore.isAuthenticated">
      <v-menu location="top end" :offset="8">
        <template #activator="{ props }">
          <v-list-item 
            class="profile-item px-4 py-3" 
            v-bind="props"
            :ripple="true"
          >
            <template #prepend>
              <v-avatar color="primary" size="42" class="elevation-2">
                <span class="text-h6 font-weight-bold text-white">
                  {{ authStore.userInitials }}
                </span>
              </v-avatar>
            </template>
            <v-list-item-title class="font-weight-medium text-truncate" style="max-width: 140px;">
              {{ authStore.userEmail }}
            </v-list-item-title>
            <v-list-item-subtitle class="text-caption d-flex align-center gap-1">
              <v-icon size="10" color="success">mdi-circle</v-icon>
              حساب نشط
            </v-list-item-subtitle>
            <template #append>
              <v-icon size="18" class="opacity-60">mdi-chevron-up</v-icon>
            </template>
          </v-list-item>
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
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const emit = defineEmits(['logout'])
</script>

<style scoped>
.user-profile {
  border-top: 1px solid rgba(var(--v-border-color), 0.1);
  padding-bottom: 8px;
}

.profile-item {
  cursor: pointer;
  border-radius: 12px;
  margin: 8px;
  transition: background-color 0.2s ease;
}

.profile-item:hover {
  background: rgba(var(--v-theme-primary), 0.08);
}
</style>
