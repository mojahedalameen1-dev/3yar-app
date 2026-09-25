<template>
  <v-container class="fill-height" style="max-width: 560px">
    <v-card class="pa-6 pa-sm-8 w-100" rounded="xl">
      <v-icon size="48" color="primary" class="mb-4">mdi-email-check-outline</v-icon>
      <h1 class="text-h5 font-weight-bold mb-2">أكد بريدك الإلكتروني</h1>
      <p class="text-body-2 text-medium-emphasis mb-5">
        أرسلنا رابط تأكيد إلى <strong>{{ authStore.userEmail }}</strong>. افتح الرابط ثم ارجع إلى هنا للتحقق.
      </p>
      <v-alert v-if="message" :type="messageType" variant="tonal" class="mb-4" role="status">{{ message }}</v-alert>
      <div class="d-flex flex-column flex-sm-row ga-2">
        <v-btn color="primary" :loading="checking" :disabled="checking" @click="checkVerification">تحققت من بريدي</v-btn>
        <v-btn variant="outlined" :loading="resending" :disabled="resending" @click="resend">إعادة إرسال الرابط</v-btn>
        <v-btn variant="text" :disabled="checking || resending" @click="signOut">تسجيل الخروج</v-btn>
      </div>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const checking = ref(false)
const resending = ref(false)
const message = ref('')
const messageType = ref('info')

async function checkVerification() {
  checking.value = true
  const result = await authStore.refreshCurrentUser()
  checking.value = false
  if (result.success && result.user.emailVerified) {
    await router.replace('/setup-car')
  } else {
    message.value = result.success ? 'لم نتلقَّ تأكيد البريد بعد. افتح الرابط ثم أعد المحاولة.' : 'تعذر التحقق الآن. حاول مرة أخرى.'
    messageType.value = result.success ? 'info' : 'error'
  }
}

async function resend() {
  resending.value = true
  const result = await authStore.resendVerificationEmail()
  resending.value = false
  message.value = result.success
    ? (result.alreadyVerified ? 'هذا البريد مؤكد بالفعل.' : 'أرسلنا رابط تأكيد جديدًا.')
    : 'تعذر إرسال الرابط الآن. تحقق من الاتصال ثم حاول مرة أخرى.'
  messageType.value = result.success ? 'success' : 'error'
  if (result.success && result.alreadyVerified) await router.replace('/setup-car')
}

async function signOut() {
  await authStore.signOut()
  await router.replace('/login')
}
</script>
