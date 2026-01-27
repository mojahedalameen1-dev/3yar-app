<template>
  <v-dialog
    v-model="showDialog"
    max-width="500"
    persistent
    class="profile-setup-dialog"
  >
    <v-card class="rounded-xl elevation-8">
      <!-- Header -->
      <div class="header-bg pa-6 d-flex flex-column align-center text-center">
        <v-avatar color="surface" size="80" class="elevation-4 mb-4">
          <v-icon size="40" color="primary">mdi-account-details</v-icon>
        </v-avatar>
        <div class="text-h5 font-weight-bold text-white mb-1">إكمال الملف الشخصي</div>
        <div class="text-body-2 text-white opacity-80">
          من فضلك أكمل بياناتك لنقدم لك تجربة مخصصة
        </div>
      </div>

      <!-- Form -->
      <v-card-text class="pa-6 pt-8">
        <v-form ref="form" v-model="valid" @submit.prevent>
          <div class="row-inputs d-flex gap-4">
            <v-text-field
              v-model="formData.firstName"
              label="الاسم الأول"
              :rules="[v => !!v || 'مطلوب']"
              variant="outlined"
              color="primary"
              prepend-inner-icon="mdi-account"
              class="flex-grow-1"
            ></v-text-field>

            <v-text-field
              v-model="formData.lastName"
              label="الاسم الأخير"
              :rules="[v => !!v || 'مطلوب']"
              variant="outlined"
              color="primary"
              prepend-inner-icon="mdi-account-outline"
              class="flex-grow-1"
            ></v-text-field>
          </div>

          <v-text-field
            v-model="formData.phone"
            label="رقم الجوال (اختياري)"
            variant="outlined"
            color="primary"
            prepend-inner-icon="mdi-phone"
            type="tel"
            class="mt-2"
          ></v-text-field>
        </v-form>
      </v-card-text>

      <!-- Actions -->
      <v-divider></v-divider>
      <v-card-actions class="pa-4 bg-surface-variant-light">
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          size="large"
          variant="flat"
          block
          :loading="loading"
          :disabled="!valid"
          @click="saveProfile"
          rounded="lg"
        >
          حفظ ومتابعة
          <v-icon end>mdi-arrow-left</v-icon>
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useProfileStore } from '@/stores/profile'
import { useAuthStore } from '@/stores/auth'

const profileStore = useProfileStore()
const authStore = useAuthStore()

const valid = ref(false)
const loading = ref(false)
const formData = ref({
  firstName: '',
  lastName: '',
  phone: ''
})

// Dialog visibility logic
const showDialog = computed(() => {
  // Show if authenticated AND profile exists (loaded) AND profile is NOT complete
  // We check hasProfile to ensure we attempted to fetch it first
  // We check user is authenticated to avoid showing on login/landing
  return authStore.isAuthenticated && 
         profileStore.hasProfile && 
         !profileStore.isComplete
})

// Initialize form when data is available
watch(() => profileStore.profile, (newProfile) => {
  if (newProfile) {
    formData.value = {
      firstName: newProfile.firstName || '',
      lastName: newProfile.lastName || '',
      phone: newProfile.phone || ''
    }
  }
}, { immediate: true })

async function saveProfile() {
  if (!valid.value) return
  
  loading.value = true
  try {
    const success = await profileStore.updateProfile({
      firstName: formData.value.firstName,
      lastName: formData.value.lastName,
      phone: formData.value.phone
    })
    
    // Dialog will close automatically because isComplete will become true
  } catch (error) {
    console.error('Error saving profile:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.header-bg {
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, rgb(var(--v-theme-secondary)) 100%);
}

.row-inputs {
  display: flex;
  gap: 16px;
}
/* RTL spacing */
.gap-4 {
  gap: 16px;
}

.bg-surface-variant-light {
  background-color: rgba(var(--v-theme-surface-variant), 0.3);
}
</style>
