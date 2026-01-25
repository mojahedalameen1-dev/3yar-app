<template>
  <div class="documents-view">
    <!-- Header -->
    <div class="d-flex flex-wrap justify-space-between align-center gap-4 mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">وثائق السيارة</h1>
        <p class="text-body-2 text-medium-emphasis">إدارة جميع الوثائق الرسمية المتعلقة بسيارتك</p>
      </div>
    </div>

    <!-- Stats Overview -->
    <v-row class="mb-6">
      <v-col cols="6" sm="3">
        <v-card class="stat-card glass-card h-100">
          <v-card-text class="pa-4 text-center">
            <div class="stat-icon mx-auto mb-2 bg-primary">
              <v-icon color="white" size="22">mdi-file-document-multiple</v-icon>
            </div>
            <div class="text-h4 font-weight-bold text-primary">{{ stats.total }}</div>
            <div class="text-caption text-medium-emphasis">إجمالي الوثائق</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card class="stat-card glass-card h-100">
          <v-card-text class="pa-4 text-center">
            <div class="stat-icon mx-auto mb-2 bg-success">
              <v-icon color="white" size="22">mdi-check-circle</v-icon>
            </div>
            <div class="text-h4 font-weight-bold text-success">{{ stats.valid }}</div>
            <div class="text-caption text-medium-emphasis">سارية</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card class="stat-card glass-card h-100">
          <v-card-text class="pa-4 text-center">
            <div class="stat-icon mx-auto mb-2 bg-warning">
              <v-icon color="white" size="22">mdi-clock-alert</v-icon>
            </div>
            <div class="text-h4 font-weight-bold text-warning">{{ stats.expiringSoon }}</div>
            <div class="text-caption text-medium-emphasis">قاربت على الانتهاء</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card class="stat-card glass-card h-100">
          <v-card-text class="pa-4 text-center">
            <div class="stat-icon mx-auto mb-2 bg-error">
              <v-icon color="white" size="22">mdi-alert-circle</v-icon>
            </div>
            <div class="text-h4 font-weight-bold text-error">{{ stats.expired }}</div>
            <div class="text-caption text-medium-emphasis">منتهية</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Documents Grid -->
    <v-row>
      <!-- License Card -->
      <v-col cols="12" md="4">
        <v-card 
          v-if="licenseDoc"
          class="document-card glass-card h-100"
          :class="`status-${licenseDoc.statusInfo.status}`"
        >
          <div v-if="licenseDoc.image" class="document-image-wrapper" @click="openViewDialog(licenseDoc)">
            <template v-if="isPdf(licenseDoc.image)">
              <div class="document-icon-placeholder bg-grey-lighten-4">
                <v-icon size="64" color="error">mdi-file-pdf-box</v-icon>
              </div>
            </template>
            <v-img v-else :src="licenseDoc.image" height="140" cover class="document-image"></v-img>
            <div class="image-view-overlay"><v-icon size="32" color="white">mdi-eye</v-icon></div>
          </div>
          <div v-else class="document-icon-placeholder bg-primary">
            <v-icon size="48" color="white">mdi-card-account-details</v-icon>
          </div>
          <v-card-text class="pa-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <h3 class="text-subtitle-1 font-weight-bold">رخصة القيادة</h3>
              <v-chip :color="getStatusColor(licenseDoc.statusInfo.status)" size="small" variant="flat">
                {{ documentsStore.STATUS_LABELS[licenseDoc.statusInfo.status] }}
              </v-chip>
            </div>
            <div v-if="licenseDoc.documentNumber" class="text-body-2 text-medium-emphasis mb-2">
              <v-icon size="14" class="me-1">mdi-pound</v-icon>{{ licenseDoc.documentNumber }}
            </div>
            <div class="text-body-2 mb-2">
              <v-icon size="14" class="me-1">mdi-calendar</v-icon>ينتهي: {{ formatDate(licenseDoc.expiryDate) }}
            </div>
            <div v-if="licenseDoc.statusInfo.daysLeft !== null" :class="`text-caption text-${getStatusColor(licenseDoc.statusInfo.status)} font-weight-medium`">
              {{ getDaysText(licenseDoc.statusInfo.daysLeft) }}
            </div>
            <div class="d-flex gap-2 mt-3">
              <v-btn variant="tonal" size="small" class="flex-grow-1" @click="openEditDialog(licenseDoc)">
                <v-icon start>mdi-pencil</v-icon>تعديل
              </v-btn>
              <v-btn icon variant="text" size="small" color="error" @click="confirmDelete(licenseDoc)">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
        <v-card v-else class="document-card glass-card h-100 document-empty" @click="openAddDialog('license')">
          <v-card-text class="pa-8 text-center">
            <div class="empty-icon mx-auto mb-4 bg-primary"><v-icon size="36" color="white">mdi-card-account-details</v-icon></div>
            <h3 class="text-subtitle-1 font-weight-bold mb-1">رخصة القيادة</h3>
            <p class="text-body-2 text-medium-emphasis mb-4">لم تتم إضافة الوثيقة بعد</p>
            <v-btn color="primary" size="small"><v-icon start>mdi-plus</v-icon>إضافة</v-btn>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Registration Card -->
      <v-col cols="12" md="4">
        <v-card 
          v-if="registrationDoc"
          class="document-card glass-card h-100"
          :class="`status-${registrationDoc.statusInfo.status}`"
        >
          <div v-if="registrationDoc.image" class="document-image-wrapper" @click="openViewDialog(registrationDoc)">
             <template v-if="isPdf(registrationDoc.image)">
              <div class="document-icon-placeholder bg-grey-lighten-4">
                <v-icon size="64" color="error">mdi-file-pdf-box</v-icon>
              </div>
            </template>
            <v-img v-else :src="registrationDoc.image" height="140" cover class="document-image"></v-img>
            <div class="image-view-overlay"><v-icon size="32" color="white">mdi-eye</v-icon></div>
          </div>
          <div v-else class="document-icon-placeholder bg-info">
            <v-icon size="48" color="white">mdi-file-document</v-icon>
          </div>
          <v-card-text class="pa-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <h3 class="text-subtitle-1 font-weight-bold">استمارة السيارة</h3>
              <v-chip :color="getStatusColor(registrationDoc.statusInfo.status)" size="small" variant="flat">
                {{ documentsStore.STATUS_LABELS[registrationDoc.statusInfo.status] }}
              </v-chip>
            </div>
            <div v-if="registrationDoc.documentNumber" class="text-body-2 text-medium-emphasis mb-2">
              <v-icon size="14" class="me-1">mdi-pound</v-icon>{{ registrationDoc.documentNumber }}
            </div>
            <div class="text-body-2 mb-2">
              <v-icon size="14" class="me-1">mdi-calendar</v-icon>ينتهي: {{ formatDate(registrationDoc.expiryDate) }}
            </div>
            <div v-if="registrationDoc.statusInfo.daysLeft !== null" :class="`text-caption text-${getStatusColor(registrationDoc.statusInfo.status)} font-weight-medium`">
              {{ getDaysText(registrationDoc.statusInfo.daysLeft) }}
            </div>
            <div class="d-flex gap-2 mt-3">
              <v-btn variant="tonal" size="small" class="flex-grow-1" @click="openEditDialog(registrationDoc)">
                <v-icon start>mdi-pencil</v-icon>تعديل
              </v-btn>
              <v-btn icon variant="text" size="small" color="error" @click="confirmDelete(registrationDoc)">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
        <v-card v-else class="document-card glass-card h-100 document-empty" @click="openAddDialog('registration')">
          <v-card-text class="pa-8 text-center">
            <div class="empty-icon mx-auto mb-4 bg-info"><v-icon size="36" color="white">mdi-file-document</v-icon></div>
            <h3 class="text-subtitle-1 font-weight-bold mb-1">استمارة السيارة</h3>
            <p class="text-body-2 text-medium-emphasis mb-4">لم تتم إضافة الوثيقة بعد</p>
            <v-btn color="info" size="small"><v-icon start>mdi-plus</v-icon>إضافة</v-btn>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Insurance Card -->
      <v-col cols="12" md="4">
        <v-card 
          v-if="insuranceDoc"
          class="document-card glass-card h-100"
          :class="`status-${insuranceDoc.statusInfo.status}`"
        >
          <div v-if="insuranceDoc.image" class="document-image-wrapper" @click="openViewDialog(insuranceDoc)">
             <template v-if="isPdf(insuranceDoc.image)">
              <div class="document-icon-placeholder bg-grey-lighten-4">
                <v-icon size="64" color="error">mdi-file-pdf-box</v-icon>
              </div>
            </template>
            <v-img v-else :src="insuranceDoc.image" height="140" cover class="document-image"></v-img>
            <div class="image-view-overlay"><v-icon size="32" color="white">mdi-eye</v-icon></div>
          </div>
          <div v-else class="document-icon-placeholder bg-success">
            <v-icon size="48" color="white">mdi-shield-car</v-icon>
          </div>
          <v-card-text class="pa-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <h3 class="text-subtitle-1 font-weight-bold">التأمين</h3>
              <v-chip :color="getStatusColor(insuranceDoc.statusInfo.status)" size="small" variant="flat">
                {{ documentsStore.STATUS_LABELS[insuranceDoc.statusInfo.status] }}
              </v-chip>
            </div>
            <div v-if="insuranceDoc.documentNumber" class="text-body-2 text-medium-emphasis mb-2">
              <v-icon size="14" class="me-1">mdi-pound</v-icon>{{ insuranceDoc.documentNumber }}
            </div>
            <div class="text-body-2 mb-2">
              <v-icon size="14" class="me-1">mdi-calendar</v-icon>ينتهي: {{ formatDate(insuranceDoc.expiryDate) }}
            </div>
            <div v-if="insuranceDoc.statusInfo.daysLeft !== null" :class="`text-caption text-${getStatusColor(insuranceDoc.statusInfo.status)} font-weight-medium`">
              {{ getDaysText(insuranceDoc.statusInfo.daysLeft) }}
            </div>
            <div class="d-flex gap-2 mt-3">
              <v-btn variant="tonal" size="small" class="flex-grow-1" @click="openEditDialog(insuranceDoc)">
                <v-icon start>mdi-pencil</v-icon>تعديل
              </v-btn>
              <v-btn icon variant="text" size="small" color="error" @click="confirmDelete(insuranceDoc)">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
        <v-card v-else class="document-card glass-card h-100 document-empty" @click="openAddDialog('insurance')">
          <v-card-text class="pa-8 text-center">
            <div class="empty-icon mx-auto mb-4 bg-success"><v-icon size="36" color="white">mdi-shield-car</v-icon></div>
            <h3 class="text-subtitle-1 font-weight-bold mb-1">التأمين</h3>
            <p class="text-body-2 text-medium-emphasis mb-4">لم تتم إضافة الوثيقة بعد</p>
            <v-btn color="success" size="small"><v-icon start>mdi-plus</v-icon>إضافة</v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Add/Edit Dialog -->
    <v-dialog v-model="showDialog" max-width="550" persistent>
      <v-card class="rounded-xl">
        <v-card-title class="pa-5 d-flex align-center">
          <div class="dialog-icon me-3" :class="`bg-${dialogColor}`">
            <v-icon color="white">{{ dialogIcon }}</v-icon>
          </div>
          <div>
            <div class="text-h6">{{ editMode ? 'تعديل' : 'إضافة' }} {{ dialogTitle }}</div>
            <div class="text-caption text-medium-emphasis">أدخل بيانات الوثيقة</div>
          </div>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-5">
          <!-- Image Upload -->
          <div class="image-upload-section mb-5">
            <div class="image-upload-area" @click="triggerImageUpload">
              <template v-if="formData.image">
                <div v-if="isPdf(formData.image)" class="d-flex flex-column align-center justify-center bg-grey-lighten-4 rounded-lg" style="height: 180px">
                  <v-icon size="64" color="error">mdi-file-pdf-box</v-icon>
                  <span class="text-caption text-medium-emphasis mt-2">ملف PDF</span>
                </div>
                <v-img v-else :src="formData.image" height="180" cover class="rounded-lg"></v-img>
                <div class="image-overlay d-flex flex-column align-center justify-center">
                  <v-icon size="36" color="white">mdi-camera</v-icon>
                  <span class="text-caption text-white mt-1">تغيير الصورة</span>
                </div>
              </template>
              <div v-else class="upload-placeholder d-flex flex-column align-center justify-center">
                <v-icon size="48" :color="dialogColor">mdi-file-image-plus</v-icon>
                <span class="text-body-2 text-medium-emphasis mt-2">انقر لرفع صورة أو ملف PDF</span>
                <span class="text-caption text-medium-emphasis">(اختياري)</span>
              </div>
              <input ref="imageInput" type="file" accept="image/*,application/pdf" style="display: none" @change="handleImageUpload" />
            </div>
          </div>

          <v-text-field v-model="formData.documentNumber" label="رقم الوثيقة" placeholder="أدخل رقم الوثيقة" prepend-inner-icon="mdi-pound" class="mb-3"></v-text-field>

          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field v-model="formData.issueDate" label="تاريخ الإصدار" type="date" prepend-inner-icon="mdi-calendar"></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="formData.expiryDate" label="تاريخ الانتهاء" type="date" prepend-inner-icon="mdi-calendar-alert" :rules="[v => !!v || 'تاريخ الانتهاء مطلوب']"></v-text-field>
            </v-col>
          </v-row>

          <v-select v-model="formData.reminderDays" label="التذكير قبل الانتهاء بـ" :items="reminderOptions" prepend-inner-icon="mdi-bell" class="mb-3"></v-select>

          <v-textarea v-model="formData.notes" label="ملاحظات" rows="2" prepend-inner-icon="mdi-note-text"></v-textarea>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="closeDialog">إلغاء</v-btn>
          <v-btn :color="dialogColor" @click="saveDocument">{{ editMode ? 'تحديث' : 'حفظ' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- View Image Dialog -->
    <v-dialog v-model="showViewDialog" max-width="700">
      <v-card v-if="viewDocument" class="rounded-xl">
        <v-card-title class="pa-4 d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon :color="viewDocument.typeColor" class="me-2">{{ viewDocument.typeIcon }}</v-icon>
            <span>{{ viewDocument.typeLabel }}</span>
          </div>
          <v-btn icon variant="text" @click="showViewDialog = false"><v-icon>mdi-close</v-icon></v-btn>
        </v-card-title>
        <v-divider></v-divider>
        <div v-if="viewDocument.image" class="bg-grey-darken-4 d-flex align-center justify-center" style="min-height: 400px; max-height: 80vh">
          <iframe 
            v-if="isPdf(viewDocument.image)" 
            :src="viewDocument.image"
            width="100%"
            height="500px"
            frameborder="0"
          ></iframe>
          <v-img v-else :src="viewDocument.image" max-height="500" contain></v-img>
        </div>
        <div v-else class="pa-12 text-center">
          <v-icon size="80" color="grey">mdi-image-off</v-icon>
          <p class="text-body-1 text-medium-emphasis mt-4">لا توجد صورة للوثيقة</p>
        </div>
        <v-card-text class="pa-4">
          <v-row>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">رقم الوثيقة</div>
              <div class="font-weight-medium">{{ viewDocument.documentNumber || '-' }}</div>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">الحالة</div>
              <v-chip :color="getStatusColor(viewDocument.statusInfo.status)" size="small" variant="flat">
                {{ documentsStore.STATUS_LABELS[viewDocument.statusInfo.status] }}
              </v-chip>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">تاريخ الإصدار</div>
              <div class="font-weight-medium">{{ formatDate(viewDocument.issueDate) }}</div>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">تاريخ الانتهاء</div>
              <div class="font-weight-medium">{{ formatDate(viewDocument.expiryDate) }}</div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation -->
    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card class="rounded-xl">
        <v-card-title class="pa-5">
          <v-icon color="error" class="me-2">mdi-delete-alert</v-icon>تأكيد الحذف
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-5">
          <p>هل أنت متأكد من حذف هذه الوثيقة؟</p>
          <div class="delete-preview pa-3 rounded-lg mt-3">
            <div class="font-weight-bold">{{ documentToDelete?.typeLabel }}</div>
          </div>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showDeleteDialog = false">إلغاء</v-btn>
          <v-btn color="error" @click="deleteDocument">حذف</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue'
import { useDocumentsStore } from '@/stores/documents'
import dayjs from 'dayjs'

const showSnackbar = inject('showSnackbar')
const documentsStore = useDocumentsStore()

const stats = computed(() => documentsStore.stats)

// Document getters
const licenseDoc = computed(() => documentsStore.getDocumentByType('license'))
const registrationDoc = computed(() => documentsStore.getDocumentByType('registration'))
const insuranceDoc = computed(() => documentsStore.getDocumentByType('insurance'))

// Dialog state
const showDialog = ref(false)
const editMode = ref(false)
const dialogType = ref('license')
const formData = ref(getEmptyForm())
const imageInput = ref(null)

const dialogTitle = computed(() => documentsStore.DOCUMENT_LABELS[dialogType.value])
const dialogIcon = computed(() => documentsStore.DOCUMENT_ICONS[dialogType.value])
const dialogColor = computed(() => documentsStore.DOCUMENT_COLORS[dialogType.value])

const reminderOptions = [
  { title: '7 أيام', value: 7 },
  { title: '15 يوم', value: 15 },
  { title: '30 يوم', value: 30 },
  { title: '60 يوم', value: 60 }
]

function getEmptyForm() {
  return { documentNumber: '', issueDate: '', expiryDate: '', image: null, notes: '', reminderDays: 30 }
}

function openAddDialog(type = 'license') {
  editMode.value = false
  dialogType.value = type
  formData.value = getEmptyForm()
  showDialog.value = true
}

function openEditDialog(doc) {
  editMode.value = true
  dialogType.value = doc.type
  formData.value = {
    id: doc.id,
    documentNumber: doc.documentNumber || '',
    issueDate: doc.issueDate ? dayjs(doc.issueDate).format('YYYY-MM-DD') : '',
    expiryDate: doc.expiryDate ? dayjs(doc.expiryDate).format('YYYY-MM-DD') : '',
    image: doc.image || null,
    notes: doc.notes || '',
    reminderDays: doc.reminderDays || 30
  }
  showDialog.value = true
}

function closeDialog() {
  showDialog.value = false
  formData.value = getEmptyForm()
}

function triggerImageUpload() { imageInput.value?.click() }

function handleImageUpload(event) {
  const file = event.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => { formData.value.image = e.target.result }
    reader.readAsDataURL(file)
  }
}

function saveDocument() {
  const data = { type: dialogType.value, ...formData.value }
  if (editMode.value) {
    documentsStore.updateDocument(formData.value.id, data)
    showSnackbar('تم تحديث الوثيقة بنجاح')
  } else {
    documentsStore.addDocument(data)
    showSnackbar('تم إضافة الوثيقة بنجاح')
  }
  closeDialog()
}

// View Dialog
const showViewDialog = ref(false)
const viewDocument = ref(null)

function openViewDialog(doc) {
  viewDocument.value = doc
  showViewDialog.value = true
}

// Delete Dialog
const showDeleteDialog = ref(false)
const documentToDelete = ref(null)

function confirmDelete(doc) {
  documentToDelete.value = doc
  showDeleteDialog.value = true
}

function deleteDocument() {
  documentsStore.deleteDocument(documentToDelete.value.id)
  showDeleteDialog.value = false
  showSnackbar('تم حذف الوثيقة')
}

function isPdf(url) {
  return url?.startsWith('data:application/pdf') || url?.endsWith('.pdf')
}

// Helpers
function getStatusColor(status) {
  return { expired: 'error', expiring_soon: 'warning', valid: 'success' }[status] || 'grey'
}

function formatDate(date) {
  return date ? dayjs(date).format('DD/MM/YYYY') : '-'
}

function getDaysText(days) {
  if (days < 0) return `منتهية منذ ${Math.abs(days)} يوم`
  return `متبقي ${days} يوم`
}
</script>

<style scoped>
.stat-card { transition: all 0.3s ease; }
.stat-card:hover { transform: translateY(-4px); }

.stat-icon {
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
}

.document-card {
  border-radius: 16px; overflow: hidden; transition: all 0.3s ease;
  border-top: 4px solid transparent;
}

.document-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15); }

.document-card.status-expired { border-top-color: rgb(var(--v-theme-error)); }
.document-card.status-expiring_soon { border-top-color: rgb(var(--v-theme-warning)); }
.document-card.status-valid { border-top-color: rgb(var(--v-theme-success)); }

.document-card.document-empty {
  cursor: pointer; border: 2px dashed rgba(var(--v-border-color), 0.3);
  border-top: 2px dashed rgba(var(--v-border-color), 0.3);
}

.document-card.document-empty:hover {
  border-color: rgba(var(--v-theme-primary), 0.5);
  background: rgba(var(--v-theme-primary), 0.02);
}

.document-image-wrapper { position: relative; height: 140px; overflow: hidden; cursor: pointer; }
.document-image { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease; }
.document-image-wrapper:hover .document-image { transform: scale(1.05); }

.image-view-overlay {
  position: absolute; inset: 0; background: rgba(0, 0, 0, 0.5);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.3s ease;
}

.document-image-wrapper:hover .image-view-overlay { opacity: 1; }

.document-icon-placeholder {
  height: 140px; display: flex; align-items: center; justify-content: center;
}

.empty-icon {
  width: 72px; height: 72px; border-radius: 18px;
  display: flex; align-items: center; justify-content: center;
}

.dialog-icon {
  width: 48px; height: 48px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
}

.image-upload-area { cursor: pointer; border-radius: 12px; overflow: hidden; }

.upload-placeholder {
  height: 180px;
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.1), rgba(var(--v-theme-primary), 0.05));
  border: 2px dashed rgba(var(--v-theme-primary), 0.3);
  border-radius: 12px; transition: all 0.3s ease;
}

.upload-placeholder:hover {
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.15), rgba(var(--v-theme-primary), 0.08));
  border-color: rgba(var(--v-theme-primary), 0.5);
}

.image-overlay {
  position: absolute; inset: 0; background: rgba(0, 0, 0, 0.5);
  opacity: 0; transition: opacity 0.3s ease;
}

.image-upload-area:hover .image-overlay { opacity: 1; }

.delete-preview {
  background: rgba(var(--v-theme-error), 0.1);
  border: 1px solid rgba(var(--v-theme-error), 0.2);
}
</style>
