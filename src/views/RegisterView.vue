<template>
  <div class="register-page">
    <!-- Header -->
    <header class="auth-header">
      <router-link to="/" class="logo d-flex align-center gap-2">
        <div class="logo-wrapper">
          <v-img :src="ayarLogo" width="32" height="32" contain></v-img>
        </div>
        <span class="logo-text">عيار</span>
      </router-link>
    </header>

    <div class="register-container">
      <!-- Logo Section -->
      <div class="logo-section text-center mb-6">
        <div class="logo-icon mx-auto mb-4">
          <v-img :src="ayarLogo" width="56" height="56" contain></v-img>
        </div>
        <h1 class="page-title mb-2">إنشاء حساب جديد</h1>
        <p class="page-subtitle">سجّل الآن لإدارة صيانة سيارتك بذكاء</p>
      </div>

      <!-- Register Card -->
      <v-card class="auth-card">
        <v-card-text class="pa-6 pa-sm-8">
          <v-form ref="registerForm" v-model="formValid" @submit.prevent="handleRegister">
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

            <div class="form-group mb-4">
              <label class="form-label">كلمة المرور</label>
              <v-text-field
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="6 أحرف على الأقل"
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

            <div class="form-group mb-6">
              <label class="form-label">تأكيد كلمة المرور</label>
              <v-text-field
                v-model="confirmPassword"
                :type="showPassword ? 'text' : 'password'"
                placeholder="أعد كتابة كلمة المرور"
                prepend-inner-icon="mdi-lock-check-outline"
                :rules="confirmPasswordRules"
                variant="outlined"
                density="comfortable"
                dir="ltr"
                class="auth-input"
                bg-color="rgba(255,255,255,0.03)"
              ></v-text-field>
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
              <v-icon start>mdi-account-plus</v-icon>
              إنشاء الحساب
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

          <!-- Google Sign Up -->
          <div class="mb-6">
            <v-divider class="mb-4">
              <span class="divider-text">أو التسجيل بواسطة</span>
            </v-divider>
            
            <v-btn
              block
              size="x-large"
              color="white"
              variant="flat"
              class="auth-btn google-btn mb-3"
              border
              @click="handleGoogleSignUp"
              :loading="loading"
            >
              <template #prepend>
                <div class="google-logo-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px">
                    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.223,0-9.654-3.343-11.303-8l-6.571,4.819C9.656,39.663,16.318,44,24,44z"/>
                    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                  </svg>
                </div>
              </template>
              <span class="text-secondary ms-2">التسجيل بواسطة جوجل</span>
            </v-btn>
          </div>

          <div class="text-center">
            <span class="text-medium-emphasis">لديك حساب بالفعل؟</span>
            <router-link to="/login" class="auth-link ms-1">
              تسجيل الدخول
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

    <!-- Success Dialog -->
    <v-dialog v-model="showSuccess" max-width="400" persistent>
      <v-card class="auth-dialog text-center pa-6">
        <div class="success-icon mx-auto mb-4">
          <v-icon size="48" color="white">mdi-check</v-icon>
        </div>
        <v-card-title class="text-h5 font-weight-bold pb-2 justify-center">
          تم إنشاء الحساب!
        </v-card-title>
        <v-card-text class="pb-6">
          <p class="text-body-1 mb-2">تم إرسال رابط التأكيد إلى بريدك الإلكتروني</p>
          <p class="text-body-2 text-medium-emphasis">{{ email }}</p>
        </v-card-text>
        <v-btn color="primary" size="large" block to="/login" class="auth-btn">
          العودة لتسجيل الدخول
        </v-btn>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import ayarLogo from '@/assets/ayar-logo.png'

const authStore = useAuthStore()

// Form state
const registerForm = ref(null)
const formValid = ref(false)
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')

// Success dialog
const showSuccess = ref(false)

// Validation rules
const emailRules = [
  v => !!v || 'البريد الإلكتروني مطلوب',
  v => /.+@.+\..+/.test(v) || 'البريد الإلكتروني غير صحيح'
]

const passwordRules = [
  v => !!v || 'كلمة المرور مطلوبة',
  v => v.length >= 6 || 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
]

const confirmPasswordRules = [
  v => !!v || 'تأكيد كلمة المرور مطلوب',
  v => v === password.value || 'كلمات المرور غير متطابقة'
]

async function handleRegister() {
  if (!formValid.value) return

  loading.value = true
  errorMessage.value = ''

  const result = await authStore.signUp(email.value, password.value)
  
  loading.value = false
  
  if (result.success) {
    showSuccess.value = true
  } else {
    errorMessage.value = getErrorMessage(result.error)
  }
}

async function handleGoogleSignUp() {
  loading.value = true
  errorMessage.value = ''
  
  // Use the same signInWithGoogle function as login
  // Supabase handles "Sign Up" vs "Sign In" automatically for OAuth
  const result = await authStore.signInWithGoogle()
  
  if (!result.success && result.error) {
    loading.value = false
    errorMessage.value = getErrorMessage(result.error)
  }
}

function getErrorMessage(error) {
  const errorMap = {
    'User already registered': 'هذا البريد مسجل بالفعل',
    'Password should be at least 6 characters': 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
    'Unable to validate email address': 'البريد الإلكتروني غير صحيح'
  }
  return errorMap[error] || error || 'حدث خطأ، يرجى المحاولة مرة أخرى'
}
</script>

<style scoped>
.register-page {
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
.register-container {
  width: 100%;
  max-width: 420px;
}

.logo-icon {
  width: 80px;
  height: 80px;
  background: white;
  border-radius: 20px;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 32px rgba(25, 118, 210, 0.25);
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
}

.page-subtitle {
  font-size: 0.95rem;
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

/* Success Icon */
.success-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4CAF50, #2E7D32);
  display: flex;
  align-items: center;
  justify-content: center;
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
  .register-container {
    padding: 0;
  }
  
  .auth-card {
    border-radius: 20px !important;
  }
}
</style>
