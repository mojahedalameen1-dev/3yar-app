<template>
  <div class="tasks-view">
    <!-- Header -->
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">مهام الصيانة</h1>
        <p class="text-body-2 text-medium-emphasis">
          إدارة وتتبع جميع مهام الصيانة الدورية
        </p>
      </div>
      <v-btn
        color="primary"
        size="large"
        prepend-icon="mdi-plus"
        class="px-6"
        @click="showTaskDialog = true"
      >
        إضافة مهمة
      </v-btn>
    </div>

    <!-- Stats Overview -->
    <v-row class="mb-6">
      <v-col v-for="stat in statsCards" :key="stat.status" cols="6" sm="4" md="2">
        <v-card 
          class="stat-card glass-card h-100 cursor-pointer"
          :class="{ 'stat-card-active': activeFilter === stat.status }"
          @click="activeFilter = stat.status"
        >
          <v-card-text class="text-center pa-4">
            <div 
              class="stat-icon-wrapper mx-auto mb-2"
              :class="`bg-${stat.color}`"
            >
              <v-icon color="white" size="24">{{ stat.icon }}</v-icon>
            </div>
            <div class="text-h4 font-weight-bold mb-1" :class="`text-${stat.color}`">
              {{ stat.count }}
            </div>
            <div class="text-caption text-medium-emphasis">{{ stat.label }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Tasks Grid -->
    <v-row v-if="filteredTasks.length > 0">
      <v-col 
        v-for="task in filteredTasks" 
        :key="task.id" 
        cols="12" 
        sm="6" 
        lg="4"
      >
        <v-card 
          class="task-card glass-card h-100"
          :class="`task-${task.statusInfo.status}`"
        >
          <!-- Card Header -->
          <div class="task-card-header pa-4">
            <div class="d-flex align-center justify-space-between">
              <div class="d-flex align-center gap-3">
                <div 
                  class="status-indicator"
                  :class="`bg-${getStatusColor(task.statusInfo.status)}`"
                >
                  <v-icon color="white" size="20">{{ getStatusIcon(task.statusInfo.status) }}</v-icon>
                </div>
                <div>
                  <h3 class="text-subtitle-1 font-weight-bold">{{ task.name }}</h3>
                  <div class="d-flex align-center gap-1 mt-1">
                    <v-chip
                      :color="getStatusColor(task.statusInfo.status)"
                      size="x-small"
                      variant="flat"
                      class="font-weight-medium"
                    >
                      {{ tasksStore.STATUS_LABELS[task.statusInfo.status] }}
                    </v-chip>
                    <v-chip
                      v-if="task.statusInfo.isSnoozed"
                      color="grey"
                      size="x-small"
                      variant="tonal"
                    >
                      <v-icon start size="10">mdi-alarm-snooze</v-icon>
                      مؤجل
                    </v-chip>
                  </div>
                </div>
              </div>
              <v-menu>
                <template #activator="{ props }">
                  <v-btn icon variant="text" size="small" v-bind="props">
                    <v-icon>mdi-dots-vertical</v-icon>
                  </v-btn>
                </template>
                <v-list density="compact" class="rounded-lg">
                  <v-list-item @click="editTask(task)">
                    <template #prepend><v-icon size="small">mdi-pencil</v-icon></template>
                    <v-list-item-title>تعديل</v-list-item-title>
                  </v-list-item>
                  <v-list-item @click="confirmDelete(task)" class="text-error">
                    <template #prepend><v-icon size="small" color="error">mdi-delete</v-icon></template>
                    <v-list-item-title>حذف</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </div>
          </div>

          <v-divider></v-divider>

          <!-- Progress Section -->
          <div class="pa-4">
            <div class="progress-section mb-4">
              <div class="d-flex justify-space-between align-center mb-2">
                <span class="text-caption text-medium-emphasis">نسبة الاكتمال</span>
                <div class="d-flex align-center gap-2">
                  <span 
                    v-if="task.statusInfo.kmRemaining !== null && task.statusInfo.kmRemaining > 0"
                    class="text-caption text-medium-emphasis"
                  >
                    باقي {{ task.statusInfo.kmRemaining.toLocaleString() }} كم
                  </span>
                  <span 
                    v-else-if="task.statusInfo.kmRemaining === 0 && task.intervalKm"
                    class="text-caption text-error font-weight-medium"
                  >
                    يجب التغيير الآن
                  </span>
                  <span 
                    class="text-subtitle-2 font-weight-bold"
                    :class="`text-${getStatusColor(task.statusInfo.status)}`"
                  >
                    {{ Math.round(task.statusInfo.progress) }}%
                  </span>
                </div>
              </div>
              <div class="progress-bar-wrapper">
                <div 
                  class="progress-bar-fill"
                  :class="`bg-${getStatusColor(task.statusInfo.status)}`"
                  :style="{ width: `${Math.min(task.statusInfo.progress, 100)}%` }"
                ></div>
              </div>
            </div>

            <!-- Task Details -->
            <div class="task-details">
              <div v-if="task.intervalKm" class="detail-item">
                <v-icon size="16" color="primary" class="me-2">mdi-road</v-icon>
                <span>كل {{ task.intervalKm.toLocaleString() }} كم</span>
              </div>
              <div v-if="task.statusInfo.estimatedDate" class="detail-item">
                <v-icon size="16" color="info" class="me-2">mdi-calendar-arrow-right</v-icon>
                <span>المتوقع: {{ formatDate(task.statusInfo.estimatedDate) }}</span>
              </div>
              <div v-if="task.intervalMonths" class="detail-item">
                <v-icon size="16" color="primary" class="me-2">mdi-calendar-clock</v-icon>
                <span>كل {{ task.intervalMonths }} شهر</span>
              </div>
              <div v-if="task.lastMaintenanceDate" class="detail-item">
                <v-icon size="16" color="grey" class="me-2">mdi-history</v-icon>
                <span>آخر صيانة: {{ formatDate(task.lastMaintenanceDate) }}</span>
              </div>
              <div class="detail-item">
                <v-icon size="16" :color="getPriorityColor(task.priority)" class="me-2">mdi-flag</v-icon>
                <span>أولوية {{ task.priorityLabel }}</span>
              </div>
            </div>
          </div>

          <v-divider></v-divider>

          <!-- Actions -->
          <div class="pa-3">
            <div class="d-flex gap-2">
              <v-btn
                color="success"
                variant="flat"
                size="small"
                class="flex-grow-1"
                prepend-icon="mdi-check-circle"
                @click="openRecordDialog(task)"
              >
                تم
              </v-btn>
              <v-btn
                v-if="!task.statusInfo.isSnoozed && task.statusInfo.status !== 'good'"
                color="warning"
                variant="tonal"
                size="small"
                class="flex-grow-1"
                prepend-icon="mdi-alarm-snooze"
                @click="openSnoozeDialog(task)"
              >
                تأجيل
              </v-btn>
              <v-btn
                v-if="task.statusInfo.isSnoozed"
                color="grey"
                variant="tonal"
                size="small"
                class="flex-grow-1"
                prepend-icon="mdi-alarm-off"
                @click="cancelSnooze(task)"
              >
                إلغاء
              </v-btn>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Empty State -->
    <v-card v-else class="glass-card pa-12 text-center">
      <div class="empty-state-icon mx-auto mb-6">
        <v-icon size="80" color="grey-lighten-1">mdi-clipboard-check-outline</v-icon>
      </div>
      <h2 class="text-h5 font-weight-bold mb-2">لا توجد مهام</h2>
      <p class="text-body-1 text-medium-emphasis mb-6 mx-auto" style="max-width: 400px;">
        {{ activeFilter === 'all' ? 'أضف مهمة صيانة جديدة للبدء في تتبع صيانة سيارتك' : 'لا توجد مهام بهذا التصنيف' }}
      </p>
      <v-btn
        v-if="activeFilter === 'all'"
        color="primary"
        size="large"
        prepend-icon="mdi-plus"
        @click="showTaskDialog = true"
      >
        إضافة أول مهمة
      </v-btn>
      <v-btn
        v-else
        variant="tonal"
        @click="activeFilter = 'all'"
      >
        عرض جميع المهام
      </v-btn>
    </v-card>

    <!-- Add/Edit Task Dialog -->
    <v-dialog v-model="showTaskDialog" max-width="600" persistent>
      <v-card class="rounded-xl">
        <v-card-title class="pa-5 d-flex align-center">
          <div class="dialog-icon-wrapper me-3">
            <v-icon color="primary">{{ editMode ? 'mdi-pencil' : 'mdi-plus' }}</v-icon>
          </div>
          <div>
            <div class="text-h6">{{ editMode ? 'تعديل مهمة' : 'إضافة مهمة جديدة' }}</div>
            <div class="text-caption text-medium-emphasis">قم بتحديد تفاصيل مهمة الصيانة</div>
          </div>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-5">
          <v-form ref="taskForm" v-model="taskFormValid">
            <v-text-field
              v-model="taskFormData.name"
              label="اسم المهمة"
              placeholder="مثال: تغيير الزيت"
              prepend-inner-icon="mdi-wrench"
              :rules="[v => !!v || 'هذا الحقل مطلوب']"
              class="mb-4"
            ></v-text-field>

            <v-select
              v-model="taskFormData.type"
              label="نوع الاستحقاق"
              :items="typeOptions"
              prepend-inner-icon="mdi-clock-outline"
              class="mb-4"
            ></v-select>

            <v-row>
              <v-col v-if="taskFormData.type === 'distance' || taskFormData.type === 'both'" cols="12" md="6">
                <v-text-field
                  v-model.number="taskFormData.intervalKm"
                  label="المسافة (كم)"
                  type="number"
                  suffix="كم"
                  prepend-inner-icon="mdi-road"
                  :rules="[v => v > 0 || 'أدخل قيمة صحيحة']"
                ></v-text-field>
              </v-col>
              <v-col v-if="taskFormData.type === 'time' || taskFormData.type === 'both'" cols="12" md="6">
                <v-text-field
                  v-model.number="taskFormData.intervalMonths"
                  label="الفترة (شهور)"
                  type="number"
                  suffix="شهر"
                  prepend-inner-icon="mdi-calendar"
                  :rules="[v => v > 0 || 'أدخل قيمة صحيحة']"
                ></v-text-field>
              </v-col>
            </v-row>

            <v-select
              v-model="taskFormData.priority"
              label="الأولوية"
              :items="priorityOptions"
              prepend-inner-icon="mdi-flag"
              class="mb-4"
            ></v-select>

            <v-switch
              v-model="taskFormData.isRecurring"
              label="مهمة متكررة"
              color="primary"
              hide-details
              class="mb-4"
            ></v-switch>

            <v-expansion-panels variant="accordion">
              <v-expansion-panel title="تاريخ آخر صيانة (اختياري)">
                <v-expansion-panel-text>
                  <v-row>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="taskFormData.lastMaintenanceDate"
                        label="تاريخ آخر صيانة"
                        type="date"
                        prepend-inner-icon="mdi-calendar"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model.number="taskFormData.lastMaintenanceOdometer"
                        label="العداد عند آخر صيانة"
                        type="number"
                        suffix="كم"
                        prepend-inner-icon="mdi-speedometer"
                      ></v-text-field>
                    </v-col>
                  </v-row>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-form>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="closeTaskDialog">إلغاء</v-btn>
          <v-btn color="primary" :disabled="!taskFormValid" @click="saveTask">
            {{ editMode ? 'تحديث' : 'إضافة' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snooze Dialog -->
    <v-dialog v-model="showSnoozeDialog" max-width="400">
      <v-card class="rounded-xl">
        <v-card-title class="pa-5">
          <v-icon color="warning" class="me-2">mdi-alarm-snooze</v-icon>
          تأجيل التنبيه
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-5">
          <p class="mb-4">اختر مدة التأجيل لمهمة: <strong>{{ selectedTask?.name }}</strong></p>
          <div class="snooze-options">
            <v-btn
              v-for="option in snoozeOptions"
              :key="option.value"
              :variant="snoozeDuration === option.value ? 'flat' : 'tonal'"
              :color="snoozeDuration === option.value ? 'primary' : undefined"
              class="ma-1"
              @click="snoozeDuration = option.value"
            >
              {{ option.label }}
            </v-btn>
          </div>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showSnoozeDialog = false">إلغاء</v-btn>
          <v-btn color="warning" @click="confirmSnooze">تأجيل</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Record Dialog -->
    <v-dialog v-model="showRecordDialog" max-width="500" persistent>
      <v-card class="rounded-xl">
        <v-card-title class="pa-5">
          <v-icon color="success" class="me-2">mdi-wrench-check</v-icon>
          تسجيل صيانة
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-5">
          <div class="selected-task-card pa-4 rounded-lg mb-4">
            <div class="text-subtitle-2 text-medium-emphasis mb-1">المهمة المُنجزة</div>
            <div class="text-h6 font-weight-bold">{{ selectedTask?.name }}</div>
          </div>
          <v-text-field
            v-model.number="recordData.odometerReading"
            label="قراءة العداد"
            type="number"
            suffix="كم"
            prepend-inner-icon="mdi-speedometer"
            class="mb-3"
          ></v-text-field>
          <v-text-field
            v-model.number="recordData.cost"
            label="التكلفة"
            type="number"
            suffix="ر.س"
            prepend-inner-icon="mdi-cash"
            class="mb-3"
          ></v-text-field>
          <v-text-field
            v-model="recordData.serviceCenter"
            label="مركز الصيانة"
            prepend-inner-icon="mdi-map-marker"
            class="mb-3"
          ></v-text-field>
          <v-textarea
            v-model="recordData.notes"
            label="ملاحظات"
            rows="2"
            prepend-inner-icon="mdi-note-text"
          ></v-textarea>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showRecordDialog = false">إلغاء</v-btn>
          <v-btn color="success" @click="saveRecord">تسجيل الصيانة</v-btn>
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
          <p>هل أنت متأكد من حذف مهمة <strong>{{ selectedTask?.name }}</strong>؟</p>
          <p class="text-body-2 text-medium-emphasis mt-2">لا يمكن التراجع عن هذا الإجراء.</p>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showDeleteDialog = false">إلغاء</v-btn>
          <v-btn color="error" @click="deleteTask">حذف</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue'
import { useCarStore } from '@/stores/car'
import { useTasksStore } from '@/stores/tasks'
import { useRecordsStore } from '@/stores/records'
import confetti from 'canvas-confetti'
import dayjs from 'dayjs'

const showSnackbar = inject('showSnackbar')

const carStore = useCarStore()
const tasksStore = useTasksStore()
const recordsStore = useRecordsStore()

// Filter
const activeFilter = ref('all')

const statsCards = computed(() => [
  { status: 'all', label: 'الكل', icon: 'mdi-view-grid', color: 'primary', count: tasksStore.taskStats.total },
  { status: 'late', label: 'متأخر', icon: 'mdi-alert-circle', color: 'error', count: tasksStore.taskStats.late },
  { status: 'due', label: 'مستحق', icon: 'mdi-clock-alert', color: 'warning', count: tasksStore.taskStats.due },
  { status: 'soon', label: 'قريب', icon: 'mdi-clock-outline', color: 'amber-darken-2', count: tasksStore.taskStats.soon },
  { status: 'good', label: 'على ما يرام', icon: 'mdi-check-circle', color: 'success', count: tasksStore.taskStats.good },
  { status: 'snoozed', label: 'مؤجل', icon: 'mdi-alarm-snooze', color: 'grey', count: tasksStore.taskStats.snoozed }
])

const filteredTasks = computed(() => {
  if (activeFilter.value === 'all') return tasksStore.sortedTasks
  if (activeFilter.value === 'snoozed') return tasksStore.snoozedTasks
  return tasksStore.sortedTasks.filter(t => t.statusInfo.status === activeFilter.value)
})

// Task Dialog
const showTaskDialog = ref(false)
const taskFormValid = ref(false)
const editMode = ref(false)
const editingTaskId = ref(null)

const typeOptions = [
  { title: 'بالمسافة', value: 'distance' },
  { title: 'بالزمن', value: 'time' },
  { title: 'بالمسافة والزمن', value: 'both' }
]

const priorityOptions = [
  { title: 'عالية', value: 'high' },
  { title: 'متوسطة', value: 'medium' },
  { title: 'منخفضة', value: 'low' }
]

const snoozeOptions = [
  { label: 'يوم', value: 'day' },
  { label: 'أسبوع', value: 'week' },
  { label: 'أسبوعين', value: 'twoWeeks' },
  { label: 'شهر', value: 'month' }
]

const taskFormData = ref(getEmptyTaskForm())

function getEmptyTaskForm() {
  return {
    name: '',
    type: 'distance',
    intervalKm: 5000,
    intervalMonths: 3,
    priority: 'medium',
    isRecurring: true,
    lastMaintenanceDate: null,
    lastMaintenanceOdometer: null
  }
}

function editTask(task) {
  editMode.value = true
  editingTaskId.value = task.id
  taskFormData.value = {
    name: task.name,
    type: task.type,
    intervalKm: task.intervalKm,
    intervalMonths: task.intervalMonths,
    priority: task.priority,
    isRecurring: task.isRecurring,
    lastMaintenanceDate: task.lastMaintenanceDate ? dayjs(task.lastMaintenanceDate).format('YYYY-MM-DD') : null,
    lastMaintenanceOdometer: task.lastMaintenanceOdometer
  }
  showTaskDialog.value = true
}

function closeTaskDialog() {
  showTaskDialog.value = false
  editMode.value = false
  editingTaskId.value = null
  taskFormData.value = getEmptyTaskForm()
}

function saveTask() {
  if (editMode.value) {
    tasksStore.updateTask(editingTaskId.value, taskFormData.value)
    showSnackbar('تم تحديث المهمة بنجاح')
  } else {
    tasksStore.addTask(taskFormData.value)
    showSnackbar('تم إضافة المهمة بنجاح')
  }
  closeTaskDialog()
}

// Snooze Dialog
const showSnoozeDialog = ref(false)
const selectedTask = ref(null)
const snoozeDuration = ref('week')

function openSnoozeDialog(task) {
  selectedTask.value = task
  showSnoozeDialog.value = true
}

function confirmSnooze() {
  tasksStore.snoozeTask(selectedTask.value.id, snoozeDuration.value)
  showSnoozeDialog.value = false
  showSnackbar('تم تأجيل التنبيه')
}

function cancelSnooze(task) {
  tasksStore.cancelSnooze(task.id)
  showSnackbar('تم إلغاء التأجيل')
}

// Record Dialog
const showRecordDialog = ref(false)
const recordData = ref({
  odometerReading: 0,
  cost: 0,
  serviceCenter: '',
  notes: ''
})

function openRecordDialog(task) {
  selectedTask.value = task
  recordData.value = {
    odometerReading: carStore.car?.currentOdometer || 0,
    cost: 0,
    serviceCenter: '',
    notes: ''
  }
  showRecordDialog.value = true
}

function saveRecord() {
  tasksStore.recordMaintenance(selectedTask.value.id, {
    odometer: recordData.value.odometerReading,
    date: new Date().toISOString()
  })
  
  recordsStore.addRecord({
    taskId: selectedTask.value.id,
    taskName: selectedTask.value.name,
    odometerReading: recordData.value.odometerReading,
    cost: recordData.value.cost,
    serviceCenter: recordData.value.serviceCenter,
    notes: recordData.value.notes
  })
  
  showRecordDialog.value = false
  showSnackbar('تم تسجيل الصيانة بنجاح', 'success')
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  })
}

// Delete Dialog
const showDeleteDialog = ref(false)

function confirmDelete(task) {
  selectedTask.value = task
  showDeleteDialog.value = true
}

function deleteTask() {
  tasksStore.deleteTask(selectedTask.value.id)
  showDeleteDialog.value = false
  showSnackbar('تم حذف المهمة')
}

// Helpers
function getStatusColor(status) {
  const colors = { late: 'error', due: 'warning', soon: 'amber-darken-2', good: 'success' }
  return colors[status] || 'grey'
}

function getStatusIcon(status) {
  const icons = { late: 'mdi-alert-circle', due: 'mdi-clock-alert', soon: 'mdi-clock-outline', good: 'mdi-check-circle' }
  return icons[status] || 'mdi-help-circle'
}

function getPriorityColor(priority) {
  const colors = { high: 'error', medium: 'warning', low: 'success' }
  return colors[priority] || 'grey'
}

function formatDate(date) {
  return dayjs(date).format('DD/MM/YYYY')
}
</script>

<style scoped>
/* Stats Cards */
.stat-card {
  transition: all 0.3s ease;
  cursor: pointer;
  border: 2px solid transparent;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.stat-card-active {
  border-color: rgb(var(--v-theme-primary));
}

.stat-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Task Cards */
.task-card {
  transition: all 0.3s ease;
  overflow: hidden;
  border-top: 4px solid transparent;
}

.task-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
}

.task-late { border-top-color: rgb(var(--v-theme-error)); }
.task-due { border-top-color: rgb(var(--v-theme-warning)); }
.task-soon { border-top-color: #F9A825; }
.task-good { border-top-color: rgb(var(--v-theme-success)); }

.task-card-header {
  background: rgba(var(--v-theme-surface-variant), 0.3);
}

.status-indicator {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Progress Bar */
.progress-bar-wrapper {
  height: 8px;
  background: rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

/* Task Details */
.task-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.detail-item {
  display: flex;
  align-items: center;
  font-size: 0.8125rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
  padding: 6px 0;
}

/* Empty State */
.empty-state-icon {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-on-surface), 0.05);
}

/* Dialog */
.dialog-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-primary), 0.1);
}

/* Snooze Options */
.snooze-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

/* Selected Task Card */
.selected-task-card {
  background: rgba(var(--v-theme-success), 0.1);
  border: 1px solid rgba(var(--v-theme-success), 0.3);
}

/* Responsive */
@media (max-width: 600px) {
  .task-details {
    grid-template-columns: 1fr;
  }
}
</style>
