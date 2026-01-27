<template>
  <div class="setup-car-page fill-height">
    <v-container class="fill-height" fluid>
      <v-row justify="center" align="center">
        <v-col cols="12" sm="10" md="8" lg="6" xl="5">
          <v-card class="pa-6 rounded-xl elevation-8">
            <!-- Header -->
            <div class="text-center mb-6">
              <v-avatar color="primary" size="80" class="mb-4">
                <v-icon size="48" color="white">mdi-car-settings</v-icon>
              </v-avatar>
              <h1 class="text-h4 font-weight-bold mb-2">أهلاً بك في عيار</h1>
              <p class="text-body-1 text-medium-emphasis">
                لنبدأ بإضافة سيارتك الأولى
              </p>
            </div>

            <v-divider class="mb-6"></v-divider>

            <!-- Car Form -->
            <v-form ref="carForm" v-model="isFormValid" @submit.prevent="handleSubmit">
              <v-row dense>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="formData.make"
                    label="ماركة السيارة *"
                    prepend-inner-icon="mdi-car"
                    variant="outlined"
                    density="comfortable"
                    :rules="[rules.required]"
                    placeholder="مثال: تويوتا"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="formData.model"
                    label="الموديل *"
                    prepend-inner-icon="mdi-car-side"
                    variant="outlined"
                    density="comfortable"
                    :rules="[rules.required]"
                    placeholder="مثال: كامري"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model.number="formData.year"
                    label="سنة الصنع *"
                    prepend-inner-icon="mdi-calendar"
                    variant="outlined"
                    density="comfortable"
                    type="number"
                    :rules="[rules.required, rules.year]"
                    placeholder="2024"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="formData.plateNumber"
                    label="رقم اللوحة"
                    prepend-inner-icon="mdi-card-text"
                    variant="outlined"
                    density="comfortable"
                    placeholder="أ ب ج 1234"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model.number="formData.currentOdometer"
                    label="قراءة العداد الحالية (كم)"
                    prepend-inner-icon="mdi-speedometer"
                    variant="outlined"
                    density="comfortable"
                    type="number"
                    :rules="[rules.odometer]"
                    placeholder="50000"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="formData.color"
                    label="اللون"
                    prepend-inner-icon="mdi-palette"
                    variant="outlined"
                    density="comfortable"
                    placeholder="أبيض"
                  ></v-text-field>
                </v-col>
              </v-row>

              <!-- Submit Button -->
              <v-btn
                type="submit"
                color="primary"
                size="large"
                block
                class="mt-4"
                :loading="loading"
                :disabled="!isFormValid"
              >
                <v-icon start>mdi-check</v-icon>
                إضافة السيارة والبدء
              </v-btn>
            </v-form>

            <!-- Error Alert -->
            <v-alert
              v-if="error"
              type="error"
              variant="tonal"
              class="mt-4"
              closable
              @click:close="error = null"
            >
              {{ error }}
            </v-alert>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useCarStore } from '@/stores/car'

const router = useRouter()
const carStore = useCarStore()

const carForm = ref(null)
const isFormValid = ref(false)
const loading = ref(false)
const error = ref(null)

const formData = reactive({
  make: '',
  model: '',
  year: new Date().getFullYear(),
  plateNumber: '',
  currentOdometer: 0,
  color: ''
})

const rules = {
  required: v => !!v || 'هذا الحقل مطلوب',
  year: v => (v >= 1900 && v <= new Date().getFullYear() + 1) || 'سنة الصنع غير صحيحة',
  odometer: v => v >= 0 || 'قراءة العداد يجب أن تكون صفر أو أكثر'
}

async function handleSubmit() {
  if (!isFormValid.value) return
  
  loading.value = true
  error.value = null
  
  try {
    await carStore.addCar({
      make: formData.make,
      model: formData.model,
      year: formData.year,
      plateNumber: formData.plateNumber,
      currentOdometer: formData.currentOdometer || 0,
      initialOdometer: formData.currentOdometer || 0,
      color: formData.color
    })
    
    // Redirect to dashboard
    router.push({ name: 'dashboard' })
  } catch (err) {
    error.value = err.message || 'حدث خطأ أثناء إضافة السيارة'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.setup-car-page {
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.05) 0%, rgba(var(--v-theme-surface), 1) 100%);
  min-height: 100vh;
}
</style>
