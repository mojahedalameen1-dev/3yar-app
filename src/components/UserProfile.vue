<template>
  <div class="user-profile">
    <!-- Logged In State -->
    <template v-if="authStore.isAuthenticated">
      <v-list-item class="px-4 py-3">
        <template #prepend>
          <v-avatar color="primary" size="40">
            <span class="text-h6 font-weight-bold text-white">
              {{ authStore.userInitials }}
            </span>
          </v-avatar>
        </template>
        <v-list-item-title class="font-weight-medium text-truncate" style="max-width: 140px;">
          {{ authStore.userEmail }}
        </v-list-item-title>
        <v-list-item-subtitle class="text-caption">
          حساب نشط
        </v-list-item-subtitle>
        <template #append>
          <v-menu>
            <template #activator="{ props }">
              <v-btn icon variant="text" size="small" v-bind="props">
                <v-icon>mdi-dots-vertical</v-icon>
              </v-btn>
            </template>
            <v-list density="compact" class="rounded-lg">
              <v-list-item @click="emit('logout')">
                <template #prepend>
                  <v-icon size="small" color="error">mdi-logout</v-icon>
                </template>
                <v-list-item-title class="text-error">تسجيل الخروج</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </template>
      </v-list-item>
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
}
</style>
