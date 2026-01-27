<template>
  <div class="settings-view">
    <!-- Header -->
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">الإعدادات</h1>
        <p class="text-body-2 text-medium-emphasis">إدارة بيانات السيارة وإعدادات التطبيق</p>
      </div>
    </div>

    <v-row>
      <!-- Car Settings -->
      <v-col cols="12" lg="6">
        <v-card class="glass-card mb-6">
          <v-card-title class="d-flex align-center pa-5">
            <div class="title-icon me-3 bg-primary">
              <v-icon color="white">mdi-car</v-icon>
            </div>
            <div>
              <div class="text-subtitle-1 font-weight-bold">بيانات السيارة</div>
              <div class="text-caption text-medium-emphasis">معلومات سيارتك الأساسية</div>
            </div>
          </v-card-title>
          <v-divider></v-divider>
          
          <v-card-text v-if="carStore.hasCar" class="pa-5">
            <!-- Car Image -->
            <div class="car-image-section mb-5">
              <div class="car-image-wrapper" @click="triggerImageUpload">
                <v-img
                  v-if="carData.image"
                  :src="carData.image"
                  height="160"
                  cover
                  class="rounded-lg"
                >
                  <div class="image-overlay d-flex align-center justify-center">
                    <div class="text-center text-white">
                      <v-icon size="32">mdi-camera</v-icon>
                      <div class="text-caption mt-1">تغيير الصورة</div>
                    </div>
                  </div>
                </v-img>
                <div v-else class="upload-placeholder d-flex flex-column align-center justify-center pa-6 rounded-lg">
                  <v-icon size="48" color="primary">mdi-camera-plus</v-icon>
                  <span class="text-body-2 text-medium-emphasis mt-2">إضافة صورة السيارة</span>
                </div>
                <input
                  ref="imageInput"
                  type="file"
                  accept="image/*"
                  style="display: none"
                  @change="handleImageUpload"
                />
              </div>
            </div>

            <v-form ref="carForm" v-model="carFormValid">
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field 
                    v-model="carData.make" 
                    label="ماركة السيارة" 
                    prepend-inner-icon="mdi-car" 
                    :rules="[v => !!v || 'مطلوب']"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field 
                    v-model="carData.model" 
                    label="الموديل" 
                    prepend-inner-icon="mdi-car-info" 
                    :rules="[v => !!v || 'مطلوب']"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field 
                    v-model.number="carData.year" 
                    label="سنة الصنع" 
                    type="number" 
                    prepend-inner-icon="mdi-calendar"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field 
                    v-model="carData.plateNumber" 
                    label="رقم اللوحة" 
                    prepend-inner-icon="mdi-card-text" 
                    disabled 
                    hint="لا يمكن تعديل رقم اللوحة"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field 
                    v-model="carData.color" 
                    label="اللون" 
                    prepend-inner-icon="mdi-palette"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field 
                    v-model="carData.vin" 
                    label="رقم الشاسيه (VIN)" 
                    prepend-inner-icon="mdi-barcode"
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-textarea 
                    v-model="carData.notes" 
                    label="ملاحظات" 
                    rows="2" 
                    prepend-inner-icon="mdi-note-text"
                  ></v-textarea>
                </v-col>
              </v-row>
            </v-form>
          </v-card-text>
          
          <v-card-text v-else class="pa-8 text-center">
            <div class="empty-car-icon mx-auto mb-4">
              <v-icon size="48" color="white">mdi-car-off</v-icon>
            </div>
            <p class="text-body-1 text-medium-emphasis mb-4">لم يتم إضافة سيارة بعد</p>
            <v-btn color="primary" to="/">إضافة سيارة</v-btn>
          </v-card-text>
          
          <template v-if="carStore.hasCar">
            <v-divider></v-divider>
            <v-card-actions class="pa-4">
              <v-btn color="error" variant="tonal" @click="showDeleteCarDialog = true">
                <v-icon start>mdi-delete</v-icon>
                حذف السيارة
              </v-btn>
              <v-spacer></v-spacer>
              <v-btn 
                color="primary" 
                :disabled="!carFormValid || savingCar" 
                :loading="savingCar"
                @click="saveCar"
              >
                <v-icon start>mdi-content-save</v-icon>
                حفظ التغييرات
              </v-btn>
            </v-card-actions>
          </template>
        </v-card>
      </v-col>

      <!-- App Settings & Data -->
      <v-col cols="12" lg="6">
        <!-- App Settings -->
        <v-card class="glass-card mb-6">
          <v-card-title class="d-flex align-center pa-5">
            <div class="title-icon me-3 bg-amber">
              <v-icon color="white">mdi-cog</v-icon>
            </div>
            <div>
              <div class="text-subtitle-1 font-weight-bold">إعدادات التطبيق</div>
              <div class="text-caption text-medium-emphasis">تخصيص المظهر</div>
            </div>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pa-0">
            <v-list lines="two" class="bg-transparent">
              <!-- Dark Mode Toggle -->
              <v-list-item class="px-5 py-3">
                <template #prepend>
                  <div class="setting-icon me-4" :class="isDarkMode ? 'bg-indigo' : 'bg-amber-darken-1'">
                    <v-icon color="white" size="20">{{ isDarkMode ? 'mdi-weather-night' : 'mdi-white-balance-sunny' }}</v-icon>
                  </div>
                </template>
                <v-list-item-title class="font-weight-medium">
                  {{ isDarkMode ? 'الوضع الليلي' : 'الوضع النهاري' }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ isDarkMode ? 'مفعّل - اضغط للتبديل' : 'غير مفعّل - اضغط للتبديل' }}
                </v-list-item-subtitle>
                <template #append>
                  <div class="d-flex align-center">
                    <v-switch 
                      v-model="isDarkMode" 
                      color="primary" 
                      hide-details
                      density="compact"
                      class="rtl-switch"
                      @update:modelValue="toggleTheme"
                    ></v-switch>
                  </div>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <!-- Data Management -->
        <v-card class="glass-card mb-6">
          <v-card-title class="d-flex align-center pa-5">
            <div class="title-icon me-3 bg-success">
              <v-icon color="white">mdi-file-export</v-icon>
            </div>
            <div>
              <div class="text-subtitle-1 font-weight-bold">تصدير البيانات</div>
              <div class="text-caption text-medium-emphasis">حمّل تقريراً لسيارتك</div>
            </div>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pa-4">
            <v-row>
              <!-- PDF Export Button -->
              <v-col cols="6">
                <v-btn
                  block
                  size="large"
                  color="error"
                  variant="tonal"
                  class="export-btn"
                  :loading="exportingPDF"
                  :disabled="!carStore.hasCar"
                  @click="exportPDF"
                >
                  <v-icon start>mdi-file-pdf-box</v-icon>
                  تقرير PDF
                </v-btn>
              </v-col>
              <!-- Excel Export Button -->
              <v-col cols="6">
                <v-btn
                  block
                  size="large"
                  color="success"
                  variant="tonal"
                  class="export-btn"
                  :loading="exportingExcel"
                  :disabled="!carStore.hasCar"
                  @click="exportExcel"
                >
                  <v-icon start>mdi-microsoft-excel</v-icon>
                  ملف Excel
                </v-btn>
              </v-col>
            </v-row>
            <p v-if="!carStore.hasCar" class="text-caption text-center text-medium-emphasis mt-3 mb-0">
              <v-icon size="14" class="me-1">mdi-information</v-icon>
              أضف بيانات سيارتك أولاً لتتمكن من التصدير
            </p>
          </v-card-text>
        </v-card>

        <!-- Danger Zone -->
        <v-card class="glass-card danger-zone-card">
          <v-card-title class="d-flex align-center pa-5">
            <div class="title-icon me-3 bg-error">
              <v-icon color="white">mdi-alert</v-icon>
            </div>
            <div>
              <div class="text-subtitle-1 font-weight-bold text-error">منطقة الخطر</div>
              <div class="text-caption text-medium-emphasis">إجراءات لا يمكن التراجع عنها</div>
            </div>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pa-4">
            <v-btn
              block
              variant="outlined"
              color="error"
              @click="showClearDataDialog = true"
            >
              <v-icon start>mdi-delete-sweep</v-icon>
              مسح جميع البيانات
            </v-btn>
          </v-card-text>
        </v-card>

        <!-- About -->
        <v-card class="about-card">
          <v-card-text class="pa-6 text-center text-white">
            <div class="about-logo mx-auto mb-4">
              <v-icon size="40" color="white">mdi-car-wrench</v-icon>
            </div>
            <h3 class="text-h5 font-weight-bold mb-2">مدير صيانة السيارات</h3>
            <p class="text-body-2 opacity-80 mb-4">نظام ذكي لإدارة صيانة سيارتك</p>
            <v-chip color="white" variant="outlined" size="small">
              الإصدار 1.0.0
            </v-chip>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Delete Car Dialog -->
    <v-dialog v-model="showDeleteCarDialog" max-width="400">
      <v-card class="rounded-xl">
        <v-card-title class="pa-5">
          <v-icon color="error" class="me-2">mdi-delete-alert</v-icon>
          تأكيد حذف السيارة
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-5">
          <v-alert type="warning" variant="tonal" class="mb-4">
            سيتم حذف جميع البيانات المرتبطة بالسيارة!
          </v-alert>
          <p>هل أنت متأكد من حذف السيارة <strong>{{ carStore.car?.make }} {{ carStore.car?.model }}</strong>؟</p>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showDeleteCarDialog = false">إلغاء</v-btn>
          <v-btn color="error" @click="deleteCar">حذف نهائياً</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Clear Data Dialog -->
    <v-dialog v-model="showClearDataDialog" max-width="450">
      <v-card class="rounded-xl">
        <v-card-title class="pa-5 bg-error text-white">
          <v-icon color="white" class="me-2">mdi-delete-sweep</v-icon>
          مسح البيانات
        </v-card-title>
        
        <v-card-text class="pa-5">
          <p class="text-body-2 mb-4">حدد البيانات التي تريد حذفها نهائياً:</p>
          
          <div class="delete-options mb-4">
            <v-checkbox 
              v-model="deleteOptions.car" 
              label="بيانات السيارة والعداد" 
              color="error" 
              density="compact"
              hide-details
            ></v-checkbox>
            <v-checkbox 
              v-model="deleteOptions.tasks" 
              label="إعدادات المهام المخصصة" 
              color="error" 
              density="compact"
              hide-details
            ></v-checkbox>
            <v-checkbox 
              v-model="deleteOptions.records" 
              label="سجلات الصيانة والمصاريف" 
              color="error" 
              density="compact"
              hide-details
            ></v-checkbox>
            <v-checkbox 
              v-model="deleteOptions.documents" 
              label="الوثائق والمستندات" 
              color="error" 
              density="compact"
              hide-details
            ></v-checkbox>
          </div>

          <v-divider class="mb-4"></v-divider>

          <p class="text-caption text-medium-emphasis mb-2">للتأكيد، يرجى إدخال كلمة المرور:</p>
          <v-text-field
            v-model="deletePassword"
            label="كلمة المرور"
            type="password"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-lock"
            :error-messages="deleteError"
            @keyup.enter="handleClearData"
          ></v-text-field>
          
          <v-alert type="warning" variant="tonal" density="compact" class="mt-2 text-caption">
            تنبيه: لا يمكن التراجع عن هذه العملية بعد التأكيد.
          </v-alert>
        </v-card-text>

        <v-card-actions class="pa-4 pt-0">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showClearDataDialog = false">إلغاء</v-btn>
          <v-btn 
            color="error" 
            variant="flat" 
            :loading="deletingData"
            :disabled="!deletePassword"
            @click="handleClearData"
          >
            تأكيد والحذف
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Hidden PDF Report Template -->
    <div ref="reportRef" class="pdf-report-container">
      <!-- Header -->
      <div class="report-header">
        <div class="d-flex justify-space-between align-center mb-6">
          <div class="report-brand">
            <h1 class="text-h4 font-weight-bold primary--text mb-1">عيار</h1>
            <p class="text-subtitle-1 text-grey">تقرير صيانة السيارة</p>
          </div>
          <div class="report-meta text-left">
            <p><strong>تاريخ التقرير:</strong> {{ new Date().toLocaleDateString('ar-SA') }}</p>
            <p v-if="carStore.car"><strong>السيارة:</strong> {{ carStore.car.year }} {{ carStore.car.make }} {{ carStore.car.model }}</p>
            <p v-if="carStore.car"><strong>اللوحة:</strong> {{ carStore.car.plateNumber }}</p>
          </div>
        </div>
        <div class="header-divider"></div>
      </div>

      <!-- Stats Grid -->
      <div class="report-section">
        <h2 class="section-title">ملخص الحالة</h2>
        <div class="stats-grid">
          <div class="stat-box">
            <span class="stat-label">عداد المسافات</span>
            <span class="stat-value">{{ carStore.car?.currentOdometer?.toLocaleString() || 0 }} كم</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">إجمالي المصروفات</span>
            <span class="stat-value">{{ recordsStore.totalCost.toLocaleString() }} ر.س</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">سجلات الصيانة</span>
            <span class="stat-value">{{ recordsStore.records.length }}</span>
          </div>
        </div>
      </div>

      <!-- Upcoming Tasks -->
      <div v-if="tasksStore.dueTasks.length > 0" class="report-section">
        <h2 class="section-title text-warning">المهام المستحقة</h2>
        <table class="report-table">
          <thead>
            <tr>
              <th>المهمة</th>
              <th>النوع</th>
              <th>الحالة</th>
              <th>المتبقي</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="task in tasksStore.dueTasks" :key="task.id">
              <td>{{ task.name }}</td>
              <td>{{ task.isRecurring ? 'دوري' : 'مرة واحدة' }}</td>
              <td class="text-warning">مستحق</td>
              <td>{{ task.statusInfo.kmRemaining ? task.statusInfo.kmRemaining.toLocaleString() + ' كم' : '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Records History -->
      <div class="report-section">
        <h2 class="section-title">سجل الصيانة</h2>
        <table class="report-table" v-if="recordsStore.records.length > 0">
          <thead>
            <tr>
              <th>المهمة</th>
              <th>التاريخ</th>
              <th>العداد</th>
              <th>التكلفة</th>
              <th>مركز الصيانة</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in recordsStore.records.slice(0, 15)" :key="record.id">
              <td>{{ record.taskName }}</td>
              <td>{{ new Date(record.date).toLocaleDateString('ar-SA') }}</td>
              <td>{{ record.odometerReading?.toLocaleString() }} كم</td>
              <td>{{ record.cost?.toLocaleString() }} ر.س</td>
              <td>{{ record.serviceCenter || '-' }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="text-center text-grey py-4">لا توجد سجلات صيانة للعرض</p>
      </div>

      <!-- Footer -->
      <div class="report-footer">
        <p>تم إصدار هذا التقرير تلقائياً بواسطة تطبيق عيار</p>
        <p class="footer-link">3yar.app</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, inject, onMounted } from 'vue'
import { useCarStore } from '@/stores/car'
import { useOdometerStore } from '@/stores/odometer'
import { useTasksStore } from '@/stores/tasks'
import { useRecordsStore } from '@/stores/records'
import { useDocumentsStore } from '@/stores/documents'
import { useAuthStore } from '@/stores/auth'
import { useTheme } from 'vuetify'
import { exportToExcel } from '@/utils/exportUtils'
import { exportToPDF } from '@/utils/pdfExport'

const showSnackbar = inject('showSnackbar')
const theme = useTheme()

const carStore = useCarStore()
const odometerStore = useOdometerStore()
const tasksStore = useTasksStore()
const recordsStore = useRecordsStore()
const documentsStore = useDocumentsStore()
const authStore = useAuthStore()

// Theme State
const isDarkMode = ref(theme.global.current.value.dark)

function toggleTheme() {
  theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark'
  isDarkMode.value = theme.global.current.value.dark
}

// Car Form
const carForm = ref(null)
const carFormValid = ref(false)
const savingCar = ref(false)
const carData = reactive({ 
  make: '', model: '', year: 2024, plateNumber: '', 
  color: '', vin: '', notes: '', image: null 
})

// Export States
const exportingPDF = ref(false)
const exportingExcel = ref(false)

// Delete Data State
const showClearDataDialog = ref(false)
const deletePassword = ref('')
const deletingData = ref(false)
const deleteError = ref('')
const deleteOptions = reactive({
  car: true,
  tasks: true,
  records: true,
  documents: true
})

// Image Upload
const imageInput = ref(null)

function triggerImageUpload() {
  imageInput.value?.click()
}

function handleImageUpload(event) {
  const file = event.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      carData.image = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

onMounted(() => {
  if (carStore.car) {
    Object.assign(carData, carStore.car)
  }
})

async function saveCar() {
  savingCar.value = true
  
  // Optimistic UI - save old values for rollback
  const oldCarData = { ...carStore.car }
  
  try {
    console.log('Saving car data:', carData)
    await carStore.updateCar(carData)
    
    // Re-fetch to ensure UI is synced
    await carStore.fetchCar()
    
    // Update local form with fresh data
    if (carStore.car) {
      Object.assign(carData, carStore.car)
    }
    
    showSnackbar('تم حفظ التغييرات بنجاح', 'success')
  } catch (error) {
    // Rollback on error
    Object.assign(carData, oldCarData)
    showSnackbar('حدث خطأ أثناء الحفظ: ' + error.message, 'error')
    console.error('Save error:', error)
  } finally {
    savingCar.value = false
  }
}

// Delete Car
const showDeleteCarDialog = ref(false)

function deleteCar() {
  carStore.deleteCar()
  odometerStore.clearAllReadings()
  tasksStore.resetTasks()
  recordsStore.clearAllRecords()
  showDeleteCarDialog.value = false
  Object.assign(carData, { make: '', model: '', year: 2024, plateNumber: '', color: '', vin: '', notes: '', image: null })
  showSnackbar('تم حذف السيارة')
}

// Reset Tasks
function resetTasks() {
  tasksStore.resetTasks()
  showSnackbar('تم إعادة تعيين المهام')
}

// Verify and Clear Data
async function handleClearData() {
  if (!deletePassword.value) {
    deleteError.value = 'يرجى إدخال كلمة المرور'
    return
  }

  deletingData.value = true
  deleteError.value = ''

  try {
    // 1. Verify Password
    const { error } = await authStore.signIn(authStore.userEmail, deletePassword.value)
    
    if (error) {
      throw new Error('كلمة المرور غير صحيحة')
    }

    // 2. Perform Deletion
    const promises = []

    if (deleteOptions.car) {
      promises.push(carStore.deleteCar())
      promises.push(odometerStore.clearAllReadings())
      // Reset local form
      Object.assign(carData, { make: '', model: '', year: 2024, plateNumber: '', color: '', vin: '', notes: '', image: null })
    }

    if (deleteOptions.tasks) {
      promises.push(tasksStore.resetTasks())
    }

    if (deleteOptions.records) {
      promises.push(recordsStore.clearAllRecords())
    }
    
    if (deleteOptions.documents) {
      promises.push(documentsStore.clearAllDocuments())
    }

    await Promise.all(promises)
    
    showSnackbar('تم حذف البيانات المحددة بنجاح', 'success')
    showClearDataDialog.value = false
    deletePassword.value = ''
    
  } catch (err) {
    console.error('Delete error:', err)
    deleteError.value = err.message || 'حدث خطأ أثناء الحذف'
  } finally {
    deletingData.value = false
  }
}

// PDF Export
const reportRef = ref(null)

async function exportPDF() {
  if (!carStore.hasCar) {
    showSnackbar('أضف سيارة أولاً', 'warning')
    return
  }
  
  exportingPDF.value = true
  try {
    // Fetch fresh data
    await Promise.all([
      tasksStore.fetchTasks(),
      recordsStore.fetchRecords(),
      odometerStore.fetchReadings()
    ])
    
    // Allow DOM to update
    await new Promise(resolve => setTimeout(resolve, 100))

    if (!reportRef.value) {
      throw new Error('فشل في الوصول إلى قالب التقرير')
    }
    
    const fileName = await exportToPDF(
      reportRef.value,
      carStore.car,
      {
        tasks: tasksStore.tasksWithStatus,
        records: recordsStore.records,
        readings: odometerStore.readings
      }
    )
    showSnackbar(`تم تحميل التقرير: ${fileName}`, 'success')
  } catch (error) {
    console.error('PDF export error:', error)
    showSnackbar('حدث خطأ أثناء إنشاء التقرير: ' + error.message, 'error')
  } finally {
    exportingPDF.value = false
  }
}

// Excel Export
async function exportExcel() {
  if (!carStore.hasCar) {
    showSnackbar('أضف سيارة أولاً', 'warning')
    return
  }
  
  exportingExcel.value = true
  try {
    // Fetch fresh data
    await Promise.all([
      tasksStore.fetchTasks(),
      recordsStore.fetchRecords(),
      documentsStore.fetchDocuments()
    ])
    
    const fileName = await exportToExcel(
      carStore.car,
      tasksStore.tasks,
      recordsStore.records,
      documentsStore.documents
    )
    showSnackbar(`تم تحميل الملف: ${fileName}`, 'success')
  } catch (error) {
    console.error('Excel export error:', error)
    showSnackbar('حدث خطأ أثناء إنشاء الملف', 'error')
  } finally {
    exportingExcel.value = false
  }
}
</script>

<style scoped>
.title-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.setting-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Car Image */
.car-image-wrapper {
  cursor: pointer;
  border-radius: 12px;
  overflow: hidden;
}

.image-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.car-image-wrapper:hover .image-overlay {
  opacity: 1;
}

.upload-placeholder {
  height: 160px;
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.1), rgba(25, 118, 210, 0.05));
  border: 2px dashed rgba(25, 118, 210, 0.3);
  transition: all 0.3s ease;
}

.upload-placeholder:hover {
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.2), rgba(25, 118, 210, 0.1));
  border-color: rgba(25, 118, 210, 0.5);
}

/* Empty Car Icon */
.empty-car-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #9E9E9E, #757575);
}

/* About Card */
.about-card {
  background: linear-gradient(135deg, #1976D2, #1565C0) !important;
}

.about-logo {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
}

/* Delete List */
.delete-list {
  list-style: none;
  padding: 0;
}

.delete-list li {
  display: flex;
  align-items: center;
  padding: 8px 0;
}

/* RTL Switch Fix */
.rtl-switch {
  direction: ltr;
}

.rtl-switch :deep(.v-switch__track) {
  transform: scaleX(-1);
}

/* Export Buttons */
.export-btn {
  height: 56px !important;
  font-weight: 600;
  border-radius: 12px !important;
}

/* Danger Zone */
.danger-zone-card {
  border: 1px solid rgba(239, 83, 80, 0.3);
}
</style>
