<template>
  <div class="login-page">
    <header class="auth-header">
      <router-link to="/" class="brand-mark" aria-label="العودة إلى الصفحة الرئيسية">
        <span class="brand-logo"><v-img :src="ayarLogo" width="34" height="34" contain></v-img></span>
        <span class="brand-name">عيار</span>
      </router-link>
      <router-link to="/register" class="header-action">حساب جديد <v-icon size="16">mdi-arrow-left</v-icon></router-link>
    </header>

    <main class="auth-shell">
      <section class="auth-story" aria-label="عن عيار">
        <div class="story-kicker"><span class="kicker-dot"></span> رفيق سيارتك الذكي</div>
        <h1>خلك مطمّن،<br><span>سيارتك تحت السيطرة.</span></h1>
        <p>تابع صيانة سيارتك، مصاريفها ووثائقها من مكان واحد. كل التفاصيل التي تحتاجها، في متناول يدك.</p>
        <div class="story-points">
          <div class="story-point"><span class="point-icon"><v-icon size="19">mdi-shield-check-outline</v-icon></span><span><strong>بياناتك بأمان</strong><small>خصوصية وحماية في كل خطوة</small></span></div>
          <div class="story-point"><span class="point-icon"><v-icon size="19">mdi-chart-timeline-variant</v-icon></span><span><strong>متابعة أسهل</strong><small>سجل واضح لكل ما يخص سيارتك</small></span></div>
        </div>
        <div class="story-orbit orbit-one"></div><div class="story-orbit orbit-two"></div>
      </section>

      <section class="auth-panel" aria-labelledby="login-title">
        <div class="panel-logo"><v-img :src="ayarLogo" width="52" height="52" contain></v-img></div>
        <div class="panel-heading">
          <div class="panel-eyebrow">مرحباً بعودتك</div>
          <h2 id="login-title">سجّل دخولك</h2>
          <p>أدخل بياناتك للوصول إلى لوحة التحكم</p>
        </div>

        <v-alert v-if="successMessage" type="success" variant="tonal" density="comfortable" class="status-alert" closable @click:close="successMessage = ''">{{ successMessage }}</v-alert>
        <v-alert v-if="errorMessage" type="error" variant="tonal" density="comfortable" class="status-alert" closable @click:close="errorMessage = ''"><template #prepend><v-icon>mdi-alert-circle-outline</v-icon></template>{{ errorMessage }}</v-alert>

        <v-form ref="loginForm" v-model="formValid" @submit.prevent="handleLogin">
          <div class="form-group">
            <label class="form-label" for="login-email">البريد الإلكتروني</label>
            <v-text-field id="login-email" v-model="email" type="email" placeholder="name@example.com" prepend-inner-icon="mdi-email-outline" :rules="emailRules" variant="outlined" density="comfortable" dir="ltr" class="auth-input" hide-details="auto" autocomplete="email"></v-text-field>
          </div>
          <div class="form-group password-group">
            <label class="form-label" for="login-password">كلمة المرور</label>
          <v-text-field id="login-password" v-model="password" :type="showPassword ? 'text' : 'password'" placeholder="أدخل كلمة المرور" prepend-inner-icon="mdi-lock-outline" :rules="passwordRules" variant="outlined" density="comfortable" dir="ltr" class="auth-input" hide-details="auto" autocomplete="current-password" @keydown.enter="handleLogin">
            <template #append-inner>
              <v-btn
                icon
                variant="text"
                size="x-small"
                type="button"
                :aria-label="showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'"
                :aria-pressed="showPassword"
                @click="showPassword = !showPassword"
              >
                <v-icon size="20">{{ showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline' }}</v-icon>
              </v-btn>
            </template>
          </v-text-field>
            <button type="button" class="forgot-link" @click="openForgotPassword">نسيت كلمة المرور؟</button>
            <p class="migration-note">للحسابات المنقولة من النظام السابق، استخدم «نسيت كلمة المرور؟» لتعيين كلمة مرور جديدة.</p>
          </div>
          <v-btn color="primary" size="x-large" block :loading="loading" :disabled="!formValid || loading" type="submit" class="auth-btn primary-btn"><span>تسجيل الدخول</span><v-icon end size="20">mdi-arrow-left</v-icon></v-btn>
        </v-form>

        <template v-if="googleAuthEnabled">
          <div class="social-divider"><span>أو</span></div>
          <v-btn block size="large" variant="outlined" class="auth-btn google-btn" :loading="loading" :disabled="loading" @click="handleGoogleLogin">
            <template #prepend><span class="google-glyph">G</span></template><span>المتابعة باستخدام Google</span>
          </v-btn>
        </template>
        <p class="register-prompt">ليس لديك حساب؟ <router-link to="/register" class="auth-link">أنشئ حسابك مجاناً</router-link></p>
        <p class="panel-footnote"><v-icon size="14">mdi-lock-outline</v-icon> اتصال مشفّر وآمن</p>
      </section>
    </main>
    <footer class="auth-footer">© {{ new Date().getFullYear() }} عيار · جميع الحقوق محفوظة</footer>

    <v-dialog v-model="showForgotPassword" max-width="430">
      <v-card class="auth-dialog">
        <v-card-title class="dialog-title"><span class="dialog-icon"><v-icon size="20">mdi-lock-reset</v-icon></span>استعادة كلمة المرور</v-card-title>
        <v-divider></v-divider>
        <v-card-text class="dialog-content">
          <p>أدخل بريدك الإلكتروني وسنرسل لك رابطًا آمنًا لإعادة تعيين كلمة المرور.</p>
          <v-alert v-if="resetErrorMessage" type="error" variant="tonal" density="comfortable" class="mb-4" role="alert">
            {{ resetErrorMessage }}
          </v-alert>
          <v-text-field v-model="resetEmail" label="البريد الإلكتروني" type="email" prepend-inner-icon="mdi-email-outline" variant="outlined" dir="ltr" class="auth-input" hide-details="auto" autocomplete="email" @update:model-value="resetErrorMessage = ''"></v-text-field>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="dialog-actions"><v-btn variant="text" @click="showForgotPassword = false">إلغاء</v-btn><v-btn color="primary" :loading="loading" :disabled="!resetEmail" @click="handleResetPassword">إرسال الرابط</v-btn></v-card-actions>
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
const loginForm = ref(null)
const formValid = ref(false)
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const showForgotPassword = ref(false)
const resetEmail = ref('')
const resetErrorMessage = ref('')
// Google provider is intentionally opt-in; Firebase currently has it disabled.
const googleAuthEnabled = import.meta.env.VITE_FIREBASE_GOOGLE_ENABLED === 'true'

const emailRules = [v => !!v || 'البريد الإلكتروني مطلوب', v => /.+@.+\..+/.test(v) || 'البريد الإلكتروني غير صحيح']
const passwordRules = [v => !!v || 'كلمة المرور مطلوبة', v => v.length >= 6 || 'كلمة المرور يجب أن تكون 6 أحرف على الأقل']

async function handleLogin() {
  if (!formValid.value || loading.value) return
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  const result = await authStore.signIn(email.value.trim(), password.value)
  loading.value = false
  if (result.success) router.replace(getSafeRedirect())
  else errorMessage.value = getErrorMessage(result.error)
}

async function handleGoogleLogin() {
  if (loading.value) return
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await authStore.signInWithGoogle()
    if (result.success) {
      await router.replace(getSafeRedirect())
    } else {
      errorMessage.value = getErrorMessage(result.error)
    }
  } finally {
    loading.value = false
  }
}

function getSafeRedirect() {
  const redirect = route.query.redirect
  return typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
    ? redirect
    : '/dashboard'
}

async function handleResetPassword() {
  if (!resetEmail.value || loading.value) return
  loading.value = true
  resetErrorMessage.value = ''
  errorMessage.value = ''
  const result = await authStore.resetPassword(resetEmail.value.trim())
  loading.value = false
  if (result.success) {
    showForgotPassword.value = false
    successMessage.value = 'تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني.'
    resetEmail.value = ''
  } else resetErrorMessage.value = getErrorMessage(result.error)
}

function openForgotPassword() {
  resetEmail.value = email.value.trim()
  resetErrorMessage.value = ''
  showForgotPassword.value = true
}

function getErrorMessage(error) {
  const raw = typeof error === 'string' ? error : error?.code || error?.message || ''
  const code = raw.match(/auth\/[a-z-]+/)?.[0] || raw
  const errorMap = {
    'auth/operation-not-allowed': 'طريقة تسجيل الدخول هذه غير مفعّلة حاليًا. حدّث الصفحة وحاول مرة أخرى.',
    'auth/invalid-credential': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    'auth/invalid-login-credentials': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    'auth/user-not-found': 'لا يوجد حساب بهذا البريد الإلكتروني.',
    'auth/wrong-password': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    'auth/too-many-requests': 'محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.',
    'auth/invalid-email': 'صيغة البريد الإلكتروني غير صحيحة.',
    'auth/network-request-failed': 'تعذر الاتصال. تحقق من الإنترنت ثم أعد المحاولة.',
    'auth/popup-closed-by-user': 'أغلقت نافذة Google قبل إكمال الدخول.',
    'auth/popup-blocked': 'المتصفح منع نافذة Google. اسمح بالنوافذ المنبثقة ثم حاول مجددًا.',
    'auth/account-exists-with-different-credential': 'هذا البريد مرتبط بطريقة دخول أخرى. استخدم البريد وكلمة المرور.',
    'auth/user-disabled': 'هذا الحساب موقوف حاليًا. تواصل مع الدعم للمساعدة.'
  }
  return errorMap[code] || 'تعذر تسجيل الدخول. تحقق من بياناتك وحاول مرة أخرى.'
}
</script>

<style scoped>
.login-page { min-height: 100vh; display: flex; flex-direction: column; align-items: center; background: #f4f7fb; color: #13243d; padding: 0 28px 20px; font-family: 'Tajawal', sans-serif; }
.auth-header { width: min(1180px, 100%); height: 86px; display: flex; align-items: center; justify-content: space-between; }
.brand-mark { display: inline-flex; align-items: center; gap: 10px; color: #142842; text-decoration: none; }
.brand-logo { width: 42px; height: 42px; border-radius: 13px; background: #fff; display: grid; place-items: center; box-shadow: 0 8px 20px rgba(20, 40, 66, .1); }
.brand-name { font-size: 1.4rem; font-weight: 800; letter-spacing: -.04em; }
.header-action { color: #42698d; text-decoration: none; font-size: .9rem; font-weight: 700; display: inline-flex; align-items: center; gap: 7px; transition: color .2s ease; }
.header-action:hover { color: #1976d2; }
.auth-shell { width: min(1180px, 100%); min-height: 660px; display: grid; grid-template-columns: 1.05fr .95fr; direction: ltr; overflow: hidden; background: #fff; border-radius: 30px; box-shadow: 0 24px 70px rgba(31, 54, 82, .13); }
.auth-story, .auth-panel { direction: rtl; }
.auth-story { position: relative; overflow: hidden; padding: clamp(44px, 7vw, 88px); display: flex; flex-direction: column; justify-content: center; color: #fff; background: radial-gradient(circle at 14% 85%, rgba(45, 168, 218, .23), transparent 32%), linear-gradient(145deg, #11263f 0%, #163e60 62%, #14779a 140%); }
.auth-story::after { content: ''; position: absolute; inset: 0; pointer-events: none; opacity: .18; background-image: linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px); background-size: 42px 42px; mask-image: linear-gradient(to bottom, transparent, #000 36%, transparent); }
.story-kicker { position: relative; z-index: 1; display: flex; align-items: center; gap: 9px; color: #9edcf3; font-size: .92rem; font-weight: 700; margin-bottom: 24px; }
.kicker-dot { width: 8px; height: 8px; border-radius: 50%; background: #45c5e8; box-shadow: 0 0 0 6px rgba(69, 197, 232, .12); }
.auth-story h1 { position: relative; z-index: 1; margin: 0; font-size: clamp(2.3rem, 4vw, 4.2rem); line-height: 1.15; letter-spacing: -.055em; font-weight: 800; }
.auth-story h1 span { color: #7ed4ea; }
.auth-story > p { position: relative; z-index: 1; max-width: 430px; margin: 24px 0 42px; color: rgba(255,255,255,.72); line-height: 1.9; font-size: 1.03rem; }
.story-points { position: relative; z-index: 1; display: grid; gap: 17px; }
.story-point { display: flex; align-items: center; gap: 13px; }
.point-icon { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; color: #9edcf3; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.1); }
.story-point strong, .story-point small { display: block; }
.story-point strong { font-size: .95rem; }
.story-point small { color: rgba(255,255,255,.56); font-size: .78rem; margin-top: 2px; }
.story-orbit { position: absolute; border: 1px solid rgba(126, 212, 234, .2); border-radius: 50%; pointer-events: none; }
.orbit-one { width: 440px; height: 440px; left: -180px; bottom: -210px; }
.orbit-two { width: 290px; height: 290px; left: -110px; bottom: -130px; }
.auth-panel { padding: clamp(38px, 6vw, 76px) clamp(32px, 6vw, 76px); display: flex; flex-direction: column; justify-content: center; background: #fff; }
.panel-logo { width: 66px; height: 66px; border-radius: 20px; display: grid; place-items: center; background: #f0f7fb; margin-bottom: 28px; box-shadow: inset 0 0 0 1px #e4eef5; }
.panel-heading { margin-bottom: 30px; }
.panel-eyebrow { color: #1682a8; font-weight: 700; font-size: .9rem; margin-bottom: 7px; }
.panel-heading h2 { margin: 0; color: #13243d; font-size: 2rem; line-height: 1.2; letter-spacing: -.04em; }
.panel-heading p { margin: 9px 0 0; color: #708197; font-size: .93rem; }
.status-alert { margin-bottom: 18px; border-radius: 14px !important; font-size: .88rem; line-height: 1.65; }
.form-group { margin-bottom: 20px; }
.password-group { margin-bottom: 8px; }
.form-label { display: block; margin: 0 0 8px; color: #32465e; font-size: .87rem; font-weight: 700; }
.auth-input :deep(.v-field) { min-height: 54px; border-radius: 14px !important; background: #f8fafc !important; box-shadow: inset 0 0 0 1px #e1e8f0; }
.auth-input :deep(.v-field__outline) { --v-field-border-opacity: 0 !important; }
.auth-input :deep(.v-field--focused) { background: #fff !important; box-shadow: inset 0 0 0 2px #1682a8; }
.auth-input :deep(.v-field__input) { color: #152942 !important; font-size: .94rem; }
.auth-input :deep(input) { background: #f8fafc !important; color: #152942 !important; color-scheme: light; }
.auth-input :deep(.v-field__input::placeholder) { color: #a3afbc !important; opacity: 1; }
.auth-input :deep(.v-icon) { color: #8ca1b4 !important; }
.auth-input :deep(.v-field--focused .v-icon) { color: #1682a8 !important; }
.forgot-link { display: block; border: 0; padding: 0; margin: 6px 0 0 auto; color: #1682a8; background: transparent; cursor: pointer; font: inherit; font-size: .82rem; font-weight: 700; }
.migration-note { margin: 7px 0 16px; color: #8a99a9; font-size: .74rem; line-height: 1.7; }
.forgot-link:hover, .auth-link:hover { text-decoration: underline; }
.auth-btn { min-height: 54px !important; border-radius: 14px !important; text-transform: none !important; font-family: inherit !important; font-size: .98rem !important; font-weight: 800 !important; letter-spacing: 0 !important; }
.primary-btn { margin-top: 18px; color: #fff !important; background: linear-gradient(110deg, #087da2, #1a9bc0) !important; box-shadow: 0 10px 22px rgba(16, 139, 176, .2); }
.primary-btn:hover { box-shadow: 0 13px 28px rgba(16, 139, 176, .3); transform: translateY(-1px); }
.social-divider { display: flex; align-items: center; gap: 14px; color: #9aa8b7; font-size: .8rem; margin: 27px 0 18px; }
.social-divider::before, .social-divider::after { content: ''; height: 1px; flex: 1; background: #e7edf2; }
.social-divider span { min-width: 24px; text-align: center; }
.google-btn { color: #34485d !important; border: 1px solid #dfe6ed !important; background: #fff !important; }
.google-btn:hover { background: #f7fafc !important; border-color: #b8cbd8 !important; }
.google-glyph { color: #4285f4; font-family: Arial, sans-serif !important; font-size: 1.2rem; font-weight: 800; }
.register-prompt { color: #8391a0; font-size: .88rem; text-align: center; margin: 25px 0 0; }
.auth-link { color: #1682a8; text-decoration: none; font-weight: 800; }
.panel-footnote { display: flex; justify-content: center; align-items: center; gap: 5px; color: #a4afba; font-size: .75rem; margin: 28px 0 0; }
.auth-footer { color: #91a0af; font-size: .75rem; margin-top: 18px; }
.auth-dialog { border-radius: 22px !important; background: #fff !important; color: #13243d; }
.dialog-title { display: flex; align-items: center; gap: 10px; color: #13243d; font-size: 1.15rem; font-weight: 800; padding: 24px 24px 18px; }
.dialog-icon { width: 36px; height: 36px; display: grid; place-items: center; color: #1682a8; border-radius: 11px; background: #eaf7fb; }
.dialog-content { padding: 20px 24px 8px; }
.dialog-content p { color: #718096; line-height: 1.8; font-size: .88rem; margin: 0 0 17px; }
.dialog-actions { justify-content: flex-start; gap: 8px; padding: 16px 24px 20px; }
@media (max-width: 850px) { .login-page { padding: 0 16px 16px; } .auth-header { height: 72px; } .auth-shell { min-height: auto; grid-template-columns: 1fr; border-radius: 24px; } .auth-story { min-height: 285px; padding: 35px 30px; } .auth-story h1 { font-size: 2.4rem; } .auth-story > p { margin: 15px 0 22px; font-size: .9rem; line-height: 1.7; } .story-points { grid-template-columns: 1fr 1fr; gap: 10px; } .story-point { align-items: flex-start; gap: 8px; } .point-icon { width: 34px; height: 34px; flex: 0 0 34px; } .story-point strong { font-size: .78rem; } .story-point small { font-size: .68rem; line-height: 1.4; } .auth-panel { padding: 36px 25px 34px; } .panel-logo { margin-bottom: 21px; } }
@media (max-width: 430px) {
  .header-action { font-size: .8rem; }
  .auth-story { min-height: 0; padding: 20px 20px 22px; }
  .auth-story h1 { font-size: 1.55rem; line-height: 1.3; }
  .auth-story > p, .story-points, .story-orbit { display: none; }
  .auth-panel { padding: 22px 19px 26px; }
  .panel-logo { display: none; }
  .panel-heading { margin-bottom: 20px; }
}
</style>
