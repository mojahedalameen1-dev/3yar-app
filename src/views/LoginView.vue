<template>
  <div class="login-page">
    <!-- Header -->
    <header class="auth-header">
      <router-link to="/" class="logo d-flex align-center gap-2">
        <div class="logo-wrapper">
          <v-img :src="ayarLogo" width="32" height="32" contain></v-img>
        </div>
        <span class="logo-text">عيار</span>
      </router-link>
    </header>

    <div class="login-container">
      <!-- Logo Section -->
      <div class="logo-section text-center mb-8">
        <div class="logo-icon mx-auto mb-4">
          <v-img :src="ayarLogo" width="64" height="64" contain></v-img>
        </div>
        <h1 class="page-title mb-2">مرحباً بعودتك</h1>
        <p class="page-subtitle">سجّل دخولك للوصول إلى لوحة التحكم</p>
      </div>

      <!-- Login Card -->
      <v-card class="auth-card">
        <v-card-text class="pa-6 pa-sm-8">
          <v-form ref="loginForm" v-model="formValid" @submit.prevent="handleLogin">
            <div class="form-group mb-4">
              <label class="form-label">البريد الإلكتروني</label>
              <v-text-field
                v-model="email"
                type="email"
                placeholder="example@email.com"
                prepend-inner-icon="mdi-email-outline"
                :rules="emailRules"
                variant="outlined"
                density="comfortable"
                dir="ltr"
                class="auth-input"
                bg-color="rgba(255,255,255,0.03)"
              ></v-text-field>
            </div>

            <div class="form-group mb-2">
              <label class="form-label">كلمة المرور</label>
              <v-text-field
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••"
                prepend-inner-icon="mdi-lock-outline"
                :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                :rules="passwordRules"
                variant="outlined"
                density="comfortable"
                dir="ltr"
                class="auth-input"
                bg-color="rgba(255,255,255,0.03)"
                @click:append-inner="showPassword = !showPassword"
              ></v-text-field>
            </div>

            <div class="d-flex justify-end mb-6">
              <v-btn variant="text" size="small" color="primary" class="px-0" @click="showForgotPassword = true">
                نسيت كلمة المرور؟
              </v-btn>
            </div>

            <v-btn
              color="primary"
              size="x-large"
              block
              :loading="loading"
              :disabled="!formValid"
              type="submit"
              class="auth-btn mb-4"
            >
              <v-icon start>mdi-login</v-icon>
              تسجيل الدخول
            </v-btn>

            <!-- Error Alert -->
            <v-alert
              v-if="errorMessage"
              type="error"
              variant="tonal"
              density="compact"
              class="mb-4"
              closable
              @click:close="errorMessage = ''"
            >
              {{ errorMessage }}
            </v-alert>
          </v-form>

          <v-divider class="my-6">
            <span class="divider-text">أو</span>
          </v-divider>

          <div class="text-center">
            <span class="text-medium-emphasis">ليس لديك حساب؟</span>
            <router-link to="/register" class="auth-link ms-1">
              إنشاء حساب جديد
            </router-link>
          </div>
        </v-card-text>
      </v-card>

      <!-- Footer -->
      <div class="auth-footer text-center mt-8">
        <p class="text-caption text-medium-emphasis">
          © {{ new Date().getFullYear() }} عيار - جميع الحقوق محفوظة
        </p>
      </div>
    </div>

    <!-- Forgot Password Dialog -->
    <v-dialog v-model="showForgotPassword" max-width="400">
      <v-card class="auth-dialog">
        <v-card-title class="pa-5">
          <v-icon color="primary" class="me-2">mdi-lock-reset</v-icon>
          استعادة كلمة المرور
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-5">
          <p class="mb-4 text-body-2 text-medium-emphasis">
            أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور.
          </p>
          <v-text-field
            v-model="resetEmail"
            label="البريد الإلكتروني"
            type="email"
            prepend-inner-icon="mdi-email-outline"
            variant="outlined"
            dir="ltr"
            class="auth-input"
            bg-color="rgba(255,255,255,0.03)"
          ></v-text-field>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showForgotPassword = false">إلغاء</v-btn>
          <v-btn color="primary" :loading="loading" @click="handleResetPassword">
            إرسال الرابط
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import ayarLogo from '@/assets/ayar-logo.png'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// Form state
const loginForm = ref(null)
const formValid = ref(false)
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')

// Forgot password
const showForgotPassword = ref(false)
const resetEmail = ref('')

// Validation rules
const emailRules = [
  v => !!v || 'البريد الإلكتروني مطلوب',
  v => /.+@.+\..+/.test(v) || 'البريد الإلكتروني غير صحيح'
]

const passwordRules = [
  v => !!v || 'كلمة المرور مطلوبة',
  v => v.length >= 6 || 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
]

async function handleLogin() {
  if (!formValid.value) return
  
  loading.value = true
  errorMessage.value = ''

  const result = await authStore.signIn(email.value, password.value)
  
  loading.value = false
  
  if (result.success) {
    const redirect = route.query.redirect || '/dashboard'
    router.push(redirect)
  } else {
    errorMessage.value = getErrorMessage(result.error)
  }
}

async function handleResetPassword() {
  if (!resetEmail.value) return

  loading.value = true
  const result = await authStore.resetPassword(resetEmail.value)
  loading.value = false
  
  if (result.success) {
    showForgotPassword.value = false
    errorMessage.value = ''
    // Show success (reusing error message area)
  } else {
    errorMessage.value = getErrorMessage(result.error)
  }
}

function getErrorMessage(error) {
  const errorMap = {
    'Invalid login credentials': 'بيانات الدخول غير صحيحة',
    'Email not confirmed': 'يرجى تأكيد بريدك الإلكتروني أولاً',
    'Too many requests': 'محاولات كثيرة، يرجى الانتظار قليلاً'
  }
  return errorMap[error] || error || 'حدث خطأ، يرجى المحاولة مرة أخرى'
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0a1929 0%, #1a2744 50%, #0d2137 100%);
  padding: 24px;
  font-family: 'Tajawal', sans-serif;
}

/* Header */
.auth-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  padding: 16px 24px;
  z-index: 10;
}

.logo {
  text-decoration: none;
}

.logo-wrapper {
  width: 40px;
  height: 40px;
  background: white;
  border-radius: 10px;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-text {
  font-size: 1.25rem;
  font-weight: 700;
  color: #42a5f5;
}

/* Container */
.login-container {
  width: 100%;
  max-width: 420px;
}

.logo-icon {
  width: 88px;
  height: 88px;
  background: white;
  border-radius: 24px;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 32px rgba(25, 118, 210, 0.25);
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: white;
}

.page-subtitle {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.6);
}

/* Auth Card */
.auth-card {
  background: rgba(255, 255, 255, 0.03) !important;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 24px !important;
}

.auth-dialog {
  background: #1a2744 !important;
  border-radius: 20px !important;
}

/* Form */
.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 8px;
}

.auth-input :deep(.v-field) {
  background: rgba(255, 255, 255, 0.05) !important;
  border-radius: 12px !important;
}

.auth-input :deep(.v-field__outline) {
  color: rgba(255, 255, 255, 0.15) !important;
}

.auth-input :deep(.v-field--focused .v-field__outline) {
  color: #42a5f5 !important;
}

.auth-input :deep(.v-field__input) {
  color: white !important;
}

.auth-input :deep(.v-field__input::placeholder) {
  color: rgba(255, 255, 255, 0.3) !important;
}

.auth-input :deep(.v-icon) {
  color: rgba(255, 255, 255, 0.5) !important;
}

.auth-btn {
  font-weight: 700;
  border-radius: 12px !important;
  text-transform: none;
  letter-spacing: 0;
}

.divider-text {
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.875rem;
  padding: 0 16px;
}

.auth-link {
  color: #42a5f5;
  text-decoration: none;
  font-weight: 600;
}

.auth-link:hover {
  text-decoration: underline;
}

.text-medium-emphasis {
  color: rgba(255, 255, 255, 0.6) !important;
}

/* Responsive */
@media (max-width: 600px) {
  .login-container {
    padding: 0;
  }
  
  .auth-card {
    border-radius: 20px !important;
  }
}
</style>
