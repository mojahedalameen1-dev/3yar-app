<template>
  <div class="register-page">
    <div class="register-container">
      <!-- Logo Section -->
      <div class="logo-section text-center mb-8">
        <div class="logo-wrapper mx-auto mb-4">
          <v-img :src="ayarLogo" width="80" height="80" contain></v-img>
        </div>
        <h1 class="text-h4 font-weight-bold text-primary mb-2">عيار</h1>
        <p class="text-body-2 text-medium-emphasis">رفيق سيارتك الذكي</p>
      </div>

      <!-- Register Card -->
      <v-card class="register-card pa-6 pa-sm-8">
        <v-card-title class="text-h5 font-weight-bold text-center pb-2">
          إنشاء حساب جديد
        </v-card-title>
        <v-card-subtitle class="text-center pb-6">
          سجّل الآن لإدارة صيانة سيارتك بذكاء
        </v-card-subtitle>

        <v-form ref="registerForm" v-model="formValid" @submit.prevent="handleRegister">
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
            class="mb-4"
            dir="ltr"
            @click:append-inner="showPassword = !showPassword"
          ></v-text-field>

          <v-text-field
            v-model="confirmPassword"
            label="تأكيد كلمة المرور"
            :type="showPassword ? 'text' : 'password'"
            prepend-inner-icon="mdi-lock-check"
            :rules="confirmPasswordRules"
            variant="outlined"
            class="mb-6"
            dir="ltr"
          ></v-text-field>

          <v-btn
            color="primary"
            size="x-large"
            block
            :loading="authStore.loading"
            :disabled="!formValid"
            type="submit"
          >
            <v-icon start>mdi-account-plus</v-icon>
            إنشاء الحساب
          </v-btn>
        </v-form>

        <v-divider class="my-6"></v-divider>

        <div class="text-center">
          <span class="text-body-2 text-medium-emphasis">لديك حساب بالفعل؟</span>
          <v-btn variant="text" color="primary" class="ms-1" to="/login">
            تسجيل الدخول
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

    <!-- Success Dialog -->
    <v-dialog v-model="showSuccess" max-width="400" persistent>
      <v-card class="rounded-xl text-center pa-6">
        <div class="success-icon mx-auto mb-4">
          <v-icon size="48" color="white">mdi-check</v-icon>
        </div>
        <v-card-title class="text-h5 font-weight-bold pb-2">
          تم إنشاء الحساب!
        </v-card-title>
        <v-card-text class="pb-6">
          <p class="text-body-1 mb-2">تم إرسال رابط التأكيد إلى بريدك الإلكتروني</p>
          <p class="text-body-2 text-medium-emphasis">{{ email }}</p>
        </v-card-text>
        <v-btn color="primary" size="large" block to="/login">
          العودة لتسجيل الدخول
        </v-btn>
      </v-card>
    </v-dialog>

    <!-- Error Snackbar -->
    <v-snackbar v-model="showError" color="error" :timeout="4000">
      {{ errorMessage }}
      <template #actions>
        <v-btn variant="text" @click="showError = false">إغلاق</v-btn>
      </template>
    </v-snackbar>
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

// Success/Error handling
const showSuccess = ref(false)
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

const confirmPasswordRules = [
  v => !!v || 'تأكيد كلمة المرور مطلوب',
  v => v === password.value || 'كلمات المرور غير متطابقة'
]

async function handleRegister() {
  if (!formValid.value) return

  const result = await authStore.signUp(email.value, password.value)
  
  if (result.success) {
    showSuccess.value = true
  } else {
    errorMessage.value = getErrorMessage(result.error)
    showError.value = true
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
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0a1929 0%, #1a2744 50%, #0d2137 100%);
  padding: 24px;
}

.register-container {
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

.register-card {
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(20px);
}

:deep(.v-theme--dark) .register-card {
  background: rgba(30, 41, 59, 0.95) !important;
}

.success-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4CAF50, #2E7D32);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
