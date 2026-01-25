<template>
  <div class="login-page">
    <div class="login-container">
      <!-- Logo Section -->
      <div class="logo-section text-center mb-8">
        <div class="logo-wrapper mx-auto mb-4">
          <v-img :src="ayarLogo" width="80" height="80" contain></v-img>
        </div>
        <h1 class="text-h4 font-weight-bold text-primary mb-2">عيار</h1>
        <p class="text-body-2 text-medium-emphasis">رفيق سيارتك الذكي</p>
      </div>

      <!-- Login Card -->
      <v-card class="login-card pa-6 pa-sm-8">
        <v-card-title class="text-h5 font-weight-bold text-center pb-2">
          تسجيل الدخول
        </v-card-title>
        <v-card-subtitle class="text-center pb-6">
          أدخل بياناتك للوصول إلى لوحة التحكم
        </v-card-subtitle>

        <v-form ref="loginForm" v-model="formValid" @submit.prevent="handleLogin">
          <v-text-field
            v-model="email"
            label="البريد الإلكتروني"
            type="email"
            prepend-inner-icon="mdi-email"
            :rules="emailRules"
            variant="outlined"
            class="mb-4"
            dir="ltr"
          ></v-text-field>

          <v-text-field
            v-model="password"
            label="كلمة المرور"
            :type="showPassword ? 'text' : 'password'"
            prepend-inner-icon="mdi-lock"
            :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
            :rules="passwordRules"
            variant="outlined"
            class="mb-2"
            dir="ltr"
            @click:append-inner="showPassword = !showPassword"
          ></v-text-field>

          <div class="d-flex justify-end mb-4">
            <v-btn variant="text" size="small" color="primary" @click="showForgotPassword = true">
              نسيت كلمة المرور؟
            </v-btn>
          </div>

          <v-btn
            color="primary"
            size="x-large"
            block
            :loading="authStore.loading"
            :disabled="!formValid"
            type="submit"
          >
            <v-icon start>mdi-login</v-icon>
            دخول
          </v-btn>
        </v-form>

        <v-divider class="my-6"></v-divider>

        <div class="text-center">
          <span class="text-body-2 text-medium-emphasis">ليس لديك حساب؟</span>
          <v-btn variant="text" color="primary" class="ms-1" to="/register">
            إنشاء حساب جديد
          </v-btn>
        </div>
      </v-card>

      <!-- Footer -->
      <div class="text-center mt-6">
        <p class="text-caption text-medium-emphasis">
          © {{ new Date().getFullYear() }} عيار - جميع الحقوق محفوظة
        </p>
      </div>
    </div>

    <!-- Error Snackbar -->
    <v-snackbar v-model="showError" color="error" :timeout="4000">
      {{ errorMessage }}
      <template #actions>
        <v-btn variant="text" @click="showError = false">إغلاق</v-btn>
      </template>
    </v-snackbar>

    <!-- Forgot Password Dialog -->
    <v-dialog v-model="showForgotPassword" max-width="400">
      <v-card class="rounded-xl">
        <v-card-title class="pa-5">
          <v-icon color="primary" class="me-2">mdi-lock-reset</v-icon>
          استعادة كلمة المرور
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-5">
          <p class="mb-4 text-body-2">أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور.</p>
          <v-text-field
            v-model="resetEmail"
            label="البريد الإلكتروني"
            type="email"
            prepend-inner-icon="mdi-email"
            variant="outlined"
            dir="ltr"
          ></v-text-field>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showForgotPassword = false">إلغاء</v-btn>
          <v-btn color="primary" :loading="authStore.loading" @click="handleResetPassword">
            إرسال الرابط
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import ayarLogo from '@/assets/ayar-logo.png'

const router = useRouter()
const authStore = useAuthStore()

// Form state
const loginForm = ref(null)
const formValid = ref(false)
const email = ref('')
const password = ref('')
const showPassword = ref(false)

// Forgot password
const showForgotPassword = ref(false)
const resetEmail = ref('')

// Error handling
const showError = ref(false)
const errorMessage = ref('')

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

  const result = await authStore.signIn(email.value, password.value)
  
  if (result.success) {
    router.push('/')
  } else {
    errorMessage.value = getErrorMessage(result.error)
    showError.value = true
  }
}

async function handleResetPassword() {
  if (!resetEmail.value) return

  const result = await authStore.resetPassword(resetEmail.value)
  
  if (result.success) {
    showForgotPassword.value = false
    errorMessage.value = 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني'
    showError.value = true
  } else {
    errorMessage.value = getErrorMessage(result.error)
    showError.value = true
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
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0a1929 0%, #1a2744 50%, #0d2137 100%);
  padding: 24px;
}

.login-container {
  width: 100%;
  max-width: 420px;
}

.logo-wrapper {
  width: 100px;
  height: 100px;
  border-radius: 24px;
  background: white;
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 32px rgba(25, 118, 210, 0.3);
}

.login-card {
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(20px);
}

:deep(.v-theme--dark) .login-card {
  background: rgba(30, 41, 59, 0.95) !important;
}
</style>
