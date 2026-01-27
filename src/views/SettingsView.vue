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
              <div class="text-caption text-medium-emphasis">تخصيص التطبيق</div>
            </div>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pa-0">
            <v-list lines="two" class="bg-transparent">
              <v-list-item class="px-5">
                <template #prepend>
                  <div class="setting-icon bg-amber-darken-1 me-4">
                    <v-icon color="white" size="20">mdi-weather-night</v-icon>
                  </div>
                </template>
                <v-list-item-title class="font-weight-medium">الوضع الليلي</v-list-item-title>
                <v-list-item-subtitle>تفعيل المظهر الداكن</v-list-item-subtitle>
                <template #append>
                  <v-switch 
                    v-model="isDarkMode" 
                    color="primary" 
                    hide-details 
                    @update:modelValue="toggleTheme"
                  ></v-switch>
                </template>
              </v-list-item>
              
              <v-divider class="mx-5"></v-divider>
              
              <v-list-item class="px-5">
                <template #prepend>
                  <div class="setting-icon bg-info me-4">
                    <v-icon color="white" size="20">mdi-bell-ring</v-icon>
                  </div>
                </template>
                <v-list-item-title class="font-weight-medium">إشعارات المتصفح</v-list-item-title>
                <v-list-item-subtitle>تلقي تنبيهات الصيانة</v-list-item-subtitle>
                <template #append>
                  <v-switch 
                    v-model="notificationsEnabled" 
                    color="primary" 
                    hide-details 
                    @update:modelValue="toggleNotifications"
                  ></v-switch>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <!-- Data Management -->
        <v-card class="glass-card mb-6">
          <v-card-title class="d-flex align-center pa-5">
            <div class="title-icon me-3 bg-success">
              <v-icon color="white">mdi-database</v-icon>
            </div>
            <div>
              <div class="text-subtitle-1 font-weight-bold">إدارة البيانات</div>
              <div class="text-caption text-medium-emphasis">نسخ احتياطي واستعادة</div>
            </div>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pa-0">
            <v-list lines="two" class="bg-transparent">
              <!-- PDF Export -->
              <v-list-item class="px-5" @click="exportPDF" :disabled="exportingPDF || !carStore.hasCar">
                <template #prepend>
                  <div class="setting-icon bg-error me-4">
                    <v-icon color="white" size="20">mdi-file-pdf-box</v-icon>
                  </div>
                </template>
                <v-list-item-title class="font-weight-medium">تحميل تقرير PDF</v-list-item-title>
                <v-list-item-subtitle>تقرير احترافي لحالة السيارة</v-list-item-subtitle>
                <template #append>
                  <v-progress-circular v-if="exportingPDF" indeterminate size="20" width="2" color="error"></v-progress-circular>
                  <v-icon v-else>mdi-chevron-left</v-icon>
                </template>
              </v-list-item>
              
              <v-divider class="mx-5"></v-divider>
              
              <!-- Excel Export -->
              <v-list-item class="px-5" @click="exportExcel" :disabled="exportingExcel || !carStore.hasCar">
                <template #prepend>
                  <div class="setting-icon bg-green-darken-1 me-4">
                    <v-icon color="white" size="20">mdi-microsoft-excel</v-icon>
                  </div>
                </template>
                <v-list-item-title class="font-weight-medium">تصدير ملف إكسل</v-list-item-title>
                <v-list-item-subtitle>بيانات الصيانة بتنسيق Excel</v-list-item-subtitle>
                <template #append>
                  <v-progress-circular v-if="exportingExcel" indeterminate size="20" width="2" color="green"></v-progress-circular>
                  <v-icon v-else>mdi-chevron-left</v-icon>
                </template>
              </v-list-item>
              
              <v-divider class="mx-5"></v-divider>
              
              <!-- JSON Export (existing) -->
              <v-list-item class="px-5" @click="exportAllData">
                <template #prepend>
                  <div class="setting-icon bg-success me-4">
                    <v-icon color="white" size="20">mdi-download</v-icon>
                  </div>
                </template>
                <v-list-item-title class="font-weight-medium">تصدير البيانات (JSON)</v-list-item-title>
                <v-list-item-subtitle>نسخة احتياطية بتنسيق JSON</v-list-item-subtitle>
                <template #append>
                  <v-icon>mdi-chevron-left</v-icon>
                </template>
              </v-list-item>
              
              <v-divider class="mx-5"></v-divider>
              
              <v-list-item class="px-5" @click="triggerImport">
                <template #prepend>
                  <div class="setting-icon bg-info me-4">
                    <v-icon color="white" size="20">mdi-upload</v-icon>
                  </div>
                </template>
                <v-list-item-title class="font-weight-medium">استيراد البيانات</v-list-item-title>
                <v-list-item-subtitle>استعادة من نسخة احتياطية</v-list-item-subtitle>
                <template #append>
                  <v-icon>mdi-chevron-left</v-icon>
                </template>
                <input 
                  ref="importInput" 
                  type="file" 
                  accept=".json" 
                  style="display: none" 
                  @change="importData"
                />
              </v-list-item>
              
              <v-divider class="mx-5"></v-divider>
              
              <v-list-item class="px-5" @click="resetTasks">
                <template #prepend>
                  <div class="setting-icon bg-warning me-4">
                    <v-icon color="white" size="20">mdi-refresh</v-icon>
                  </div>
                </template>
                <v-list-item-title class="font-weight-medium">إعادة تعيين المهام</v-list-item-title>
                <v-list-item-subtitle>استعادة المهام الافتراضية</v-list-item-subtitle>
              </v-list-item>
              
              <v-divider class="mx-5"></v-divider>
              
              <v-list-item class="px-5" @click="showClearDataDialog = true">
                <template #prepend>
                  <div class="setting-icon bg-error me-4">
                    <v-icon color="white" size="20">mdi-delete-sweep</v-icon>
                  </div>
                </template>
                <v-list-item-title class="font-weight-medium text-error">مسح جميع البيانات</v-list-item-title>
                <v-list-item-subtitle>حذف جميع البيانات المحفوظة</v-list-item-subtitle>
              </v-list-item>
            </v-list>
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
    <v-dialog v-model="showClearDataDialog" max-width="400">
      <v-card class="rounded-xl">
        <v-card-title class="pa-5">
          <v-icon color="error" class="me-2">mdi-delete-sweep</v-icon>
          مسح جميع البيانات
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-5">
          <v-alert type="error" variant="tonal" class="mb-4">
            هذا الإجراء لا يمكن التراجع عنه!
          </v-alert>
          <p class="mb-3">سيتم حذف:</p>
          <ul class="delete-list">
            <li><v-icon size="16" color="error" class="me-2">mdi-car</v-icon>بيانات السيارة</li>
            <li><v-icon size="16" color="error" class="me-2">mdi-speedometer</v-icon>قراءات العداد</li>
            <li><v-icon size="16" color="error" class="me-2">mdi-wrench</v-icon>مهام الصيانة</li>
            <li><v-icon size="16" color="error" class="me-2">mdi-history</v-icon>سجل الصيانة</li>
          </ul>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showClearDataDialog = false">إلغاء</v-btn>
          <v-btn color="error" @click="clearAllData">مسح الكل</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, inject, onMounted } from 'vue'
import { useCarStore } from '@/stores/car'
import { useOdometerStore } from '@/stores/odometer'
import { useTasksStore } from '@/stores/tasks'
import { useRecordsStore } from '@/stores/records'
import { useDocumentsStore } from '@/stores/documents'
import { useTheme } from 'vuetify'
import { exportToExcel, exportToPDF } from '@/utils/exportUtils'

const showSnackbar = inject('showSnackbar')
const theme = useTheme()

const carStore = useCarStore()
const odometerStore = useOdometerStore()
const tasksStore = useTasksStore()
const recordsStore = useRecordsStore()
const documentsStore = useDocumentsStore()

// Car Form
const carFormValid = ref(false)
const savingCar = ref(false)
const carData = reactive({ 
  make: '', model: '', year: 2024, plateNumber: '', 
  color: '', vin: '', notes: '', image: null 
})

// Export States
const exportingPDF = ref(false)
const exportingExcel = ref(false)

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

// Clear All Data
const showClearDataDialog = ref(false)

function clearAllData() {
  localStorage.clear()
  location.reload()
}

// PDF Export
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
    
    const fileName = await exportToPDF(
      carStore.car,
      tasksStore.tasksWithStatus,
      recordsStore.records,
      odometerStore.readings
    )
    showSnackbar(`تم تحميل التقرير: ${fileName}`, 'success')
  } catch (error) {
    console.error('PDF export error:', error)
    showSnackbar('حدث خطأ أثناء إنشاء التقرير', 'error')
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
</style>
