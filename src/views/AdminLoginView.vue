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
        <v-text-field
          v-model="username"
          label="اسم المستخدم"
          prepend-inner-icon="mdi-account"
          variant="outlined"
          color="cyan"
          class="mb-4"
          :rules="[v => !!v || 'مطلوب']"
        ></v-text-field>

        <v-text-field
          v-model="password"
          label="كلمة المرور"
          prepend-inner-icon="mdi-lock"
          :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
          :type="showPassword ? 'text' : 'password'"
          variant="outlined"
          color="cyan"
          class="mb-6"
          :rules="[v => !!v || 'مطلوب']"
          @click:append-inner="showPassword = !showPassword"
        ></v-text-field>

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
import { supabase } from '@/lib/supabase'
import { useProfileStore } from '@/stores/profile'

const router = useRouter()
const profileStore = useProfileStore()

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

// Hardcoded Credentials
const ADMIN_USER = 'admin'
const ADMIN_PASS = 'Mm58858Mm'

async function handleLogin() {
  error.value = ''
  loading.value = true

  try {
    // 1. Validate Form credentials
    if (username.value !== ADMIN_USER || password.value !== ADMIN_PASS) {
      throw new Error('بيانات الدخول غير صحيحة')
    }

    // 2. Check if user is authenticated in Supabase
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('يجب تسجيل الدخول بحسابك أولاً')
    }

    // 3. Promote User to Admin in Database (This is the "Golden Key" step)
    // We try to update their role to 'admin' directly.
    // NOTE: This usually requires RLS policies to allow users to update their own role, 
    // OR we rely on the migration script having run.
    // If the migration script ran, admins have bypass RLS.
    // But how do they BECOME admin first time? 
    // We will attempt the update. If it fails due to RLS, we assume they are already admin or need manual intervention.
    
    // Attempt database promotion
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('user_id', session.user.id)

    if (updateError) {
      console.warn('Could not auto-promote user in DB (RLS might block):', updateError)
      // We continue anyway, hoping they are already admin or that session storage is enough for UI access,
      // though data fetching might fail if they aren't DB admins.
    }

    // 4. Set Session Storage (Browser-level lock)
    sessionStorage.setItem('adminKey', 'valid')

    // 5. Update Local Store
    profileStore.setRole('admin')

    // 6. Redirect
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
