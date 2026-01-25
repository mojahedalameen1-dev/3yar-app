<template>
  <div class="records-view">
    <!-- Header -->
    <div class="d-flex flex-wrap justify-space-between align-center gap-4 mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">سجل الصيانة</h1>
        <p class="text-body-2 text-medium-emphasis">تاريخ جميع عمليات الصيانة المُنجزة</p>
      </div>
      <div class="d-flex gap-2">
        <v-btn
          v-if="filteredRecords.length > 0"
          variant="tonal"
          prepend-icon="mdi-download"
          @click="exportData"
        >
          تصدير
        </v-btn>
      </div>
    </div>

    <!-- Stats Cards -->
    <v-row class="mb-6">
      <v-col v-for="stat in statsCards" :key="stat.title" cols="6" md="3">
        <v-card class="stat-card glass-card h-100">
          <v-card-text class="pa-4">
            <div class="d-flex align-center justify-space-between">
              <div>
                <div class="text-caption text-medium-emphasis mb-1">{{ stat.title }}</div>
                <div class="text-h4 font-weight-bold" :class="`text-${stat.color}`">
                  {{ stat.value }}
                </div>
                <div v-if="stat.suffix" class="text-caption text-medium-emphasis">{{ stat.suffix }}</div>
              </div>
              <div class="stat-icon" :class="`bg-${stat.color}`">
                <v-icon color="white" size="22">{{ stat.icon }}</v-icon>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Filters -->
    <v-card class="glass-card mb-6">
      <v-card-text class="pa-4">
        <v-row align="center">
          <v-col cols="12" md="4">
            <v-text-field
              v-model="searchQuery"
              label="بحث في السجلات"
              placeholder="اسم الصيانة أو المركز"
              prepend-inner-icon="mdi-magnify"
              hide-details
              density="compact"
              clearable
            ></v-text-field>
          </v-col>
          <v-col cols="6" md="2">
            <v-text-field
              v-model="filterDateFrom"
              label="من تاريخ"
              type="date"
              hide-details
              density="compact"
            ></v-text-field>
          </v-col>
          <v-col cols="6" md="2">
            <v-text-field
              v-model="filterDateTo"
              label="إلى تاريخ"
              type="date"
              hide-details
              density="compact"
            ></v-text-field>
          </v-col>
          <v-col cols="12" md="4" class="d-flex justify-end gap-2">
            <v-btn-toggle v-model="viewMode" mandatory density="compact" color="primary">
              <v-btn value="timeline" icon>
                <v-icon>mdi-timeline</v-icon>
                <v-tooltip activator="parent" location="top">عرض زمني</v-tooltip>
              </v-btn>
              <v-btn value="grid" icon>
                <v-icon>mdi-view-grid</v-icon>
                <v-tooltip activator="parent" location="top">عرض شبكي</v-tooltip>
              </v-btn>
            </v-btn-toggle>
            <v-btn v-if="hasFilters" variant="tonal" size="small" @click="clearFilters">
              <v-icon start>mdi-filter-off</v-icon>
              إزالة
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Timeline View -->
    <template v-if="filteredRecords.length > 0">
      <div v-if="viewMode === 'timeline'" class="timeline-view">
        <div v-for="(group, monthKey) in groupedRecords" :key="monthKey" class="mb-6">
          <div class="month-header d-flex align-center mb-4">
            <div class="month-badge">
              <v-icon size="18" color="white">mdi-calendar</v-icon>
            </div>
            <div class="ms-3">
              <div class="text-subtitle-1 font-weight-bold">{{ group.month }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ group.records.length }} صيانة • {{ group.totalCost.toLocaleString() }} ر.س
              </div>
            </div>
          </div>
          
          <div class="timeline-items">
            <v-card 
              v-for="record in group.records" 
              :key="record.id" 
              class="timeline-card glass-card mb-3"
              @click="viewRecord(record)"
            >
              <v-card-text class="pa-4">
                <div class="d-flex align-center gap-4">
                  <div class="timeline-dot">
                    <v-icon size="20" color="primary">mdi-wrench</v-icon>
                  </div>
                  <div class="flex-grow-1">
                    <div class="d-flex align-center justify-space-between flex-wrap gap-2">
                      <div>
                        <div class="text-subtitle-1 font-weight-bold">{{ record.taskName }}</div>
                        <div class="d-flex align-center gap-3 mt-1 text-caption text-medium-emphasis">
                          <span>
                            <v-icon size="14" class="me-1">mdi-calendar</v-icon>
                            {{ formatDate(record.date) }}
                          </span>
                          <span v-if="record.odometerReading">
                            <v-icon size="14" class="me-1">mdi-speedometer</v-icon>
                            {{ record.odometerReading.toLocaleString() }} كم
                          </span>
                          <span v-if="record.serviceCenter">
                            <v-icon size="14" class="me-1">mdi-map-marker</v-icon>
                            {{ record.serviceCenter }}
                          </span>
                        </div>
                      </div>
                      <div class="d-flex align-center gap-2">
                        <v-chip color="success" size="small" variant="flat">
                          {{ record.cost?.toLocaleString() || 0 }} ر.س
                        </v-chip>
                        <v-btn
                          icon
                          variant="text"
                          size="small"
                          color="error"
                          @click.stop="confirmDelete(record)"
                        >
                          <v-icon>mdi-delete</v-icon>
                        </v-btn>
                      </div>
                    </div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </div>
        </div>
      </div>

      <!-- Grid View -->
      <v-row v-else>
        <v-col v-for="record in filteredRecords" :key="record.id" cols="12" sm="6" lg="4">
          <v-card class="record-card glass-card h-100" @click="viewRecord(record)">
            <v-card-text class="pa-5">
              <div class="d-flex align-center justify-space-between mb-3">
                <v-avatar color="primary" size="44">
                  <v-icon>mdi-wrench</v-icon>
                </v-avatar>
                <v-chip color="success" variant="flat">
                  {{ record.cost?.toLocaleString() || 0 }} ر.س
                </v-chip>
              </div>
              <h3 class="text-h6 font-weight-bold mb-2">{{ record.taskName }}</h3>
              <div class="record-details">
                <div class="detail-item">
                  <v-icon size="16" color="grey">mdi-calendar</v-icon>
                  <span>{{ formatDate(record.date) }}</span>
                </div>
                <div v-if="record.odometerReading" class="detail-item">
                  <v-icon size="16" color="grey">mdi-speedometer</v-icon>
                  <span>{{ record.odometerReading.toLocaleString() }} كم</span>
                </div>
                <div v-if="record.serviceCenter" class="detail-item">
                  <v-icon size="16" color="grey">mdi-map-marker</v-icon>
                  <span>{{ record.serviceCenter }}</span>
                </div>
              </div>
            </v-card-text>
            <v-divider></v-divider>
            <v-card-actions class="pa-3">
              <v-btn variant="text" size="small" color="primary" @click.stop="viewRecord(record)">
                <v-icon start>mdi-eye</v-icon>
                التفاصيل
              </v-btn>
              <v-spacer></v-spacer>
              <v-btn icon variant="text" size="small" color="error" @click.stop="confirmDelete(record)">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- Empty State -->
    <v-card v-else class="glass-card pa-12 text-center">
      <div class="empty-icon mx-auto mb-6">
        <v-icon size="64" color="white">mdi-clipboard-text-outline</v-icon>
      </div>
      <h2 class="text-h5 font-weight-bold mb-2">
        {{ hasFilters ? 'لا توجد نتائج' : 'لا توجد سجلات' }}
      </h2>
      <p class="text-body-1 text-medium-emphasis mb-6 mx-auto" style="max-width: 400px;">
        {{ hasFilters ? 'جرّب تغيير معايير البحث' : 'لم يتم تسجيل أي صيانة بعد. سجّل صيانتك الأولى من صفحة المهام.' }}
      </p>
      <v-btn v-if="hasFilters" variant="tonal" @click="clearFilters">
        إزالة الفلاتر
      </v-btn>
      <v-btn v-else color="primary" to="/tasks">
        الذهاب للمهام
      </v-btn>
    </v-card>

    <!-- Record Details Dialog -->
    <v-dialog v-model="showDetailsDialog" max-width="500">
      <v-card v-if="selectedRecord" class="rounded-xl">
        <v-card-title class="pa-5 d-flex align-center">
          <v-avatar color="primary" size="44" class="me-3">
            <v-icon>mdi-file-document</v-icon>
          </v-avatar>
          <div>
            <div class="text-h6">تفاصيل الصيانة</div>
            <div class="text-caption text-medium-emphasis">{{ selectedRecord.taskName }}</div>
          </div>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-5">
          <v-list class="bg-transparent">
            <v-list-item>
              <template #prepend><v-icon color="info">mdi-calendar</v-icon></template>
              <v-list-item-title>التاريخ</v-list-item-title>
              <v-list-item-subtitle>{{ formatFullDate(selectedRecord.date) }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <template #prepend><v-icon color="warning">mdi-speedometer</v-icon></template>
              <v-list-item-title>قراءة العداد</v-list-item-title>
              <v-list-item-subtitle>{{ selectedRecord.odometerReading?.toLocaleString() || '-' }} كم</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <template #prepend><v-icon color="success">mdi-cash</v-icon></template>
              <v-list-item-title>التكلفة</v-list-item-title>
              <v-list-item-subtitle>{{ selectedRecord.cost?.toLocaleString() || 0 }} ريال سعودي</v-list-item-subtitle>
            </v-list-item>
            <v-list-item v-if="selectedRecord.serviceCenter">
              <template #prepend><v-icon color="purple">mdi-map-marker</v-icon></template>
              <v-list-item-title>مركز الصيانة</v-list-item-title>
              <v-list-item-subtitle>{{ selectedRecord.serviceCenter }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item v-if="selectedRecord.notes">
              <template #prepend><v-icon color="grey">mdi-note-text</v-icon></template>
              <v-list-item-title>ملاحظات</v-list-item-title>
              <v-list-item-subtitle>{{ selectedRecord.notes }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="pa-4">
          <v-btn color="error" variant="tonal" @click="confirmDelete(selectedRecord); showDetailsDialog = false">
            <v-icon start>mdi-delete</v-icon>
            حذف
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showDetailsDialog = false">إغلاق</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation -->
    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card class="rounded-xl">
        <v-card-title class="pa-5">
          <v-icon color="error" class="me-2">mdi-delete-alert</v-icon>
          تأكيد الحذف
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-5">
          <p>هل أنت متأكد من حذف هذا السجل؟</p>
          <div class="delete-preview pa-3 rounded-lg mt-3">
            <div class="font-weight-bold">{{ recordToDelete?.taskName }}</div>
            <div class="text-caption text-medium-emphasis">{{ formatDate(recordToDelete?.date) }}</div>
          </div>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showDeleteDialog = false">إلغاء</v-btn>
          <v-btn color="error" @click="deleteRecord">حذف</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue'
import { useRecordsStore } from '@/stores/records'
import dayjs from 'dayjs'
import 'dayjs/locale/ar'

dayjs.locale('ar')

const showSnackbar = inject('showSnackbar')
const recordsStore = useRecordsStore()

// View Mode
const viewMode = ref('timeline')

// Filters
const searchQuery = ref('')
const filterDateFrom = ref('')
const filterDateTo = ref('')

const hasFilters = computed(() => searchQuery.value || filterDateFrom.value || filterDateTo.value)

function clearFilters() {
  searchQuery.value = ''
  filterDateFrom.value = ''
  filterDateTo.value = ''
}

// Stats
const statsCards = computed(() => [
  { 
    title: 'إجمالي الصيانات', 
    value: recordsStore.stats.totalRecords, 
    icon: 'mdi-wrench', 
    color: 'primary' 
  },
  { 
    title: 'إجمالي التكاليف', 
    value: recordsStore.stats.totalCost.toLocaleString(), 
    suffix: 'ريال',
    icon: 'mdi-cash-multiple', 
    color: 'error' 
  },
  { 
    title: 'هذا الشهر', 
    value: recordsStore.stats.thisMonthCost.toLocaleString(), 
    suffix: 'ريال',
    icon: 'mdi-calendar-month', 
    color: 'warning' 
  },
  { 
    title: 'متوسط التكلفة', 
    value: recordsStore.stats.averageCost.toLocaleString(), 
    suffix: 'ريال',
    icon: 'mdi-chart-line', 
    color: 'success' 
  }
])

// Filtered Records
const filteredRecords = computed(() => {
  let records = recordsStore.sortedRecords
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    records = records.filter(r => 
      r.taskName?.toLowerCase().includes(query) || 
      r.serviceCenter?.toLowerCase().includes(query)
    )
  }
  
  if (filterDateFrom.value) {
    records = records.filter(r => dayjs(r.date).isAfter(dayjs(filterDateFrom.value).subtract(1, 'day')))
  }
  
  if (filterDateTo.value) {
    records = records.filter(r => dayjs(r.date).isBefore(dayjs(filterDateTo.value).add(1, 'day')))
  }
  
  return records
})

// Grouped by Month
const groupedRecords = computed(() => {
  const grouped = {}
  filteredRecords.value.forEach(record => {
    const monthKey = dayjs(record.date).format('YYYY-MM')
    if (!grouped[monthKey]) {
      grouped[monthKey] = {
        month: dayjs(record.date).format('MMMM YYYY'),
        records: [],
        totalCost: 0
      }
    }
    grouped[monthKey].records.push(record)
    grouped[monthKey].totalCost += record.cost || 0
  })
  return grouped
})

// Dialogs
const showDetailsDialog = ref(false)
const selectedRecord = ref(null)
const showDeleteDialog = ref(false)
const recordToDelete = ref(null)

function viewRecord(record) {
  selectedRecord.value = record
  showDetailsDialog.value = true
}

function confirmDelete(record) {
  recordToDelete.value = record
  showDeleteDialog.value = true
}

function deleteRecord() {
  recordsStore.deleteRecord(recordToDelete.value.id)
  showDeleteDialog.value = false
  showSnackbar('تم حذف السجل')
}

// Export
function exportData() {
  const data = filteredRecords.value.map(r => ({
    'نوع الصيانة': r.taskName,
    'التاريخ': formatDate(r.date),
    'العداد': r.odometerReading,
    'التكلفة': r.cost,
    'المركز': r.serviceCenter,
    'ملاحظات': r.notes
  }))
  
  const csv = [
    Object.keys(data[0] || {}).join(','),
    ...data.map(row => Object.values(row).join(','))
  ].join('\n')
  
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `سجل_الصيانة_${dayjs().format('YYYY-MM-DD')}.csv`
  link.click()
  
  showSnackbar('تم تصدير البيانات')
}

// Formatters
function formatDate(date) {
  return date ? dayjs(date).format('DD/MM/YYYY') : '-'
}

function formatFullDate(date) {
  return date ? dayjs(date).format('DD MMMM YYYY') : '-'
}
</script>

<style scoped>
/* Stats */
.stat-card {
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Timeline */
.month-badge {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1976D2, #1565C0);
}

.timeline-card {
  cursor: pointer;
  transition: all 0.3s ease;
  border-right: 3px solid rgb(var(--v-theme-primary));
}

.timeline-card:hover {
  transform: translateX(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.timeline-dot {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-primary), 0.1);
}

/* Grid Cards */
.record-card {
  cursor: pointer;
  transition: all 0.3s ease;
}

.record-card:hover {
  transform: translateY(-4px);
}

.record-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

/* Empty State */
.empty-icon {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #9E9E9E, #757575);
}

/* Delete Preview */
.delete-preview {
  background: rgba(var(--v-theme-error), 0.1);
  border: 1px solid rgba(var(--v-theme-error), 0.2);
}
</style>
