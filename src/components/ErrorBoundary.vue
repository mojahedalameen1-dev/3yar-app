<template>
  <div class="error-boundary-container">
    <div v-if="error" class="error-state">
      <v-icon size="64" color="red-accent-2" class="mb-4 animate-pulse">mdi-alert-circle</v-icon>
      <h2 class="text-h4 text-white font-weight-bold mb-2">عذراً، حدث خطأ غير متوقع</h2>
      <p class="text-body-1 text-grey-lighten-1 mb-6 max-w-md text-center">
        حدثت مشكلة تقنية منعت عرض هذه الصفحة بشكل صحيح. تم تسجيل الخطأ وسنعمل على إصلاحه.
      </p>
      
      <div class="d-flex gap-3">
        <v-btn
            color="primary"
            prepend-icon="mdi-refresh"
            size="large"
            @click="resetError"
            class="px-8"
        >
          إعادة تحميل
        </v-btn>
        
        <v-btn
            variant="outlined"
            size="large"
            @click="goHome"
        >
          الرئيسية
        </v-btn>
      </div>

      <!-- Dev Details -->
       <!-- <div class="mt-8 pa-4 bg-grey-darken-4 rounded text-left text-caption text-red-lighten-3 font-mono" dir="ltr">
        {{ error }}
      </div> -->
    </div>

    <!-- Default Content -->
    <slot v-else></slot>
  </div>
</template>

<script setup>
import { ref, onErrorCaptured } from 'vue'
import { useRouter } from 'vue-router'

const error = ref(null)
const router = useRouter()

onErrorCaptured((err, instance, info) => {
  console.error('Captured Error:', err, info)
  error.value = err
  return false // Stop propagation
})

function resetError() {
  error.value = null
  window.location.reload()
}

function goHome() {
  error.value = null
  router.push('/')
}
</script>

<style scoped>
.error-boundary-container {
  height: 100%;
  width: 100%;
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #0f172a;
  padding: 24px;
  text-align: center;
}

.max-w-md {
  max-width: 480px;
}

.font-mono {
  font-family: monospace;
}
</style>
