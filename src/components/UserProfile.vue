<template>
  <div class="user-profile">
    <!-- Logged In State -->
    <template v-if="authStore.isAuthenticated">
      <!-- User Info Display (clickable for settings only) -->
      <v-list-item 
        to="/settings" 
        class="profile-item px-4 py-3"
        :ripple="true"
      >
        <template #prepend>
          <v-avatar color="primary" size="42" class="elevation-2">
            <span class="text-h6 font-weight-bold text-white">
              {{ userInitials }}
            </span>
          </v-avatar>
        </template>
        <v-list-item-title class="user-name text-truncate">
          {{ displayName }}
        </v-list-item-title>
        <v-list-item-subtitle class="user-email text-truncate">
          {{ authStore.userEmail }}
        </v-list-item-subtitle>
        <template #append>
          <v-icon size="18" color="primary">mdi-cog</v-icon>
        </template>
      </v-list-item>

      <!-- Logout Button - DIRECT, no menu -->
      <div class="px-4 pb-2 pt-1">
        <v-btn
          color="error"
          variant="tonal"
          block
          size="small"
          prepend-icon="mdi-logout"
          @click="handleLogout"
          :loading="loggingOut"
        >
          تسجيل الخروج
        </v-btn>
      </div>
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
import { ref, computed, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProfileStore } from '@/stores/profile'

const router = useRouter()
const showSnackbar = inject('showSnackbar')
const authStore = useAuthStore()
const profileStore = useProfileStore()

// Loading state for logout
const loggingOut = ref(false)

// Fetch profile on mount if authenticated
onMounted(async () => {
  if (authStore.isAuthenticated && !profileStore.hasProfile) {
    await profileStore.fetchProfile()
  }
})

// Handle logout
async function handleLogout() {
  loggingOut.value = true
  
  try {
    // Sign out from Supabase & Clear State
    const result = await authStore.signOut()
    
    if (result.success) {
      if (showSnackbar) showSnackbar('تم تسجيل الخروج بنجاح', 'success')
      await router.push('/')
    } else {
      // Even if API failed, local state is cleared in store, so redirect
      console.warn('Logout had some issues but proceeding:', result.error)
      if (showSnackbar) showSnackbar('تم تسجيل الخروج محلياً', 'warning')
      window.location.href = '/'
    }
  } catch (error) {
    console.error('Logout Unexpected Error:', error)
    window.location.href = '/'
  } finally {
    loggingOut.value = false
  }
}

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

.profile-item {
  cursor: pointer;
  border-radius: 12px;
  margin: 8px;
  transition: background-color 0.2s ease;
}

.profile-item:hover {
  background: rgba(var(--v-theme-primary), 0.08);
}

.user-name {
  font-size: 0.9rem;
  font-weight: 600;
}

.user-email {
  font-size: 0.75rem;
  opacity: 0.7;
}
</style>
