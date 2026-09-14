<template>
  <div class="admin-login-container">
    <div class="login-bg"></div>
    <div class="login-particles"></div>
    
    <v-card class="login-card" elevation="24">
      <div class="card-header text-center mb-6">
        <div class="logo-wrapper mb-4">
          <v-icon size="40" color="cyan-accent-2">mdi-rocket-launch</v-icon>
        </div>
        <h1 class="text-h4 font-weight-bold text-white mb-2">Iyar Control Tower</h1>
        <p class="text-body-2 text-white-70">بوابة الإدارة المركزية</p>
      </div>

      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        closable
        class="mb-6"
        density="compact"
        @click:close="error = ''"
      >
        {{ error }}
      </v-alert>

      <v-form @submit.prevent="handleLogin" ref="form">
        <v-alert type="info" variant="tonal" class="mb-6">
          سجّل الدخول بحساب Firebase الممنوح صلاحية الإدارة، ثم تابع إلى لوحة التحكم.
        </v-alert>

        <v-btn
          block
          size="large"
          color="cyan"
          type="submit"
          :loading="loading"
          class="login-btn text-none"
        >
          <span class="font-weight-bold">الدخول للنظام</span>
          <v-icon end>mdi-arrow-right</v-icon>
        </v-btn>

        <div class="mt-4 text-center">
          <v-btn
            variant="text"
            color="white"
            size="small"
            class="text-caption opacity-70"
            to="/login"
          >
            العودة لتسجيل دخول المستخدمين
          </v-btn>
        </div>
      </v-form>
    </v-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase, isFirebaseAdmin } from '@/lib/firebase'
import { useProfileStore } from '@/stores/profile'

const router = useRouter()
const profileStore = useProfileStore()

const loading = ref(false)
const error = ref('')

async function handleLogin() {
  error.value = ''
  loading.value = true

  try {
    // Admin access is granted only through a Firebase Auth custom claim.
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('يجب تسجيل الدخول بحسابك أولاً')
    }

    if (!(await isFirebaseAdmin())) {
      throw new Error('هذا الحساب لا يملك صلاحية الإدارة في Firebase')
    }

    // Update Local Store
    profileStore.setRole('admin')

    // Redirect
    router.push({ name: 'control-tower' })

  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap');

.admin-login-container {
  font-family: 'Tajawal', sans-serif;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  position: relative;
  overflow: hidden;
}

.login-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 50%, #1a237e 0%, #000000 70%);
  opacity: 0.6;
}

.login-particles {
  position: absolute;
  inset: 0;
  background-image: 
    radial-gradient(circle at 20% 30%, rgba(0, 188, 212, 0.1) 0%, transparent 10%),
    radial-gradient(circle at 80% 70%, rgba(156, 39, 176, 0.1) 0%, transparent 10%);
  filter: blur(40px);
}

.login-card {
  width: 100%;
  max-width: 440px;
  background: rgba(255, 255, 255, 0.05) !important;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px !important;
  padding: 40px;
  position: relative;
  z-index: 10;
}

.logo-wrapper {
  width: 80px;
  height: 80px;
  margin: 0 auto;
  border-radius: 20px;
  background: rgba(0, 229, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 20px rgba(0, 229, 255, 0.2);
}

.text-white-70 {
  color: rgba(255, 255, 255, 0.7);
}

/* Inputs */
:deep(.v-field) {
  border-radius: 12px !important;
  background: rgba(0, 0, 0, 0.3) !important;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

:deep(.v-field--focused) {
  border-color: #00e5ff !important;
  box-shadow: 0 0 10px rgba(0, 229, 255, 0.2);
}

:deep(.v-label) {
  color: rgba(255, 255, 255, 0.6);
}

:deep(input) {
  color: #fff !important;
}

/* Button */
.login-btn {
  height: 48px !important;
  font-size: 16px;
  border-radius: 12px;
  background: linear-gradient(135deg, #00BCD4, #0097A7);
  box-shadow: 0 4px 15px rgba(0, 188, 212, 0.3);
  letter-spacing: 0.5px;
}
</style>
