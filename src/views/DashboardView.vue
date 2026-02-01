<template>
  <div class="dashboard">
    <!-- Greeting Header -->
    <div class="d-flex flex-wrap justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">{{ greeting }}</h1>
        <p class="text-body-2 text-medium-emphasis">
          {{ carStore.hasCar ? `إدارة صيانة ${carStore.car.make} ${carStore.car.model}` : 'ابدأ بإضافة سيارتك' }}
        </p>
      </div>
      <div class="d-flex align-center gap-2">
        <v-chip color="primary" variant="tonal" size="large" class="px-4">
          <v-icon start>mdi-calendar</v-icon>
          {{ formattedDate }}
        </v-chip>
      </div>
    </div>

    <!-- No Car State -->
    <template v-if="!carStore.hasCar">
      <v-card class="welcome-card pa-8 pa-md-12 text-center">
        <div class="welcome-icon mx-auto mb-6">
          <v-icon size="64" color="white">mdi-car-wrench</v-icon>
        </div>
        <h2 class="text-h4 font-weight-bold mb-3">مرحباً بك في عيار</h2>
        <p class="text-body-1 text-medium-emphasis mb-6 mx-auto" style="max-width: 500px;">
          نظام ذكي لإدارة وتتبع صيانة سيارتك. أضف سيارتك الآن لتبدأ في الاستفادة من التنبيهات الذكية وسجل الصيانة المتكامل مع عيار.
        </p>
        <v-btn
          color="primary"
          size="x-large"
          class="px-8"
          prepend-icon="mdi-plus"
          @click="showWizard = true"
        >
          إضافة سيارتك الأولى
        </v-btn>
        
        <v-row class="mt-8 pt-6">
          <v-col v-for="feature in features" :key="feature.title" cols="12" sm="4">
            <div class="feature-card pa-4 rounded-xl">
              <v-icon :color="feature.color" size="40" class="mb-3">{{ feature.icon }}</v-icon>
              <h4 class="text-subtitle-1 font-weight-bold mb-1">{{ feature.title }}</h4>
              <p class="text-caption text-medium-emphasis">{{ feature.desc }}</p>
            </div>
          </v-col>
        </v-row>
      </v-card>
    </template>

    <!-- Main Dashboard -->
    <template v-else>
      <v-row>
        <!-- Car Card with Image -->
        <v-col cols="12" lg="4">
          <v-card class="car-card glass-card h-100">
            <div class="car-image-wrapper" @click="triggerImageUpload">
              <v-img
                v-if="carStore.car.image"
                :src="carStore.car.image"
                height="200"
                cover
                class="car-image"
                loading="eager"
              >
                <div class="image-overlay d-flex align-center justify-center">
                  <div class="overlay-content text-center">
                    <v-icon size="36" color="white" class="mb-2">mdi-camera-flip</v-icon>
                    <div class="text-caption text-white">تغيير الصورة</div>
                  </div>
                </div>
              </v-img>
              <div v-else class="car-placeholder d-flex flex-column align-center justify-center">
                <div class="upload-icon-wrapper mb-3">
                  <v-icon size="36" color="white">mdi-car-side</v-icon>
                </div>
                <span class="text-subtitle-2 font-weight-medium mb-1">أضف صورة سيارتك</span>
                <span class="text-caption text-medium-emphasis">اسحب أو انقر للرفع</span>
              </div>
              <input
                ref="imageInput"
                type="file"
                accept="image/*"
                style="display: none"
                @change="handleImageUpload"
              />
            </div>
            <v-card-text class="pa-5">
              <div class="d-flex align-center justify-space-between mb-2">
                <h3 class="text-h5 font-weight-bold">
                  {{ carStore.car.make }} {{ carStore.car.model }}
                </h3>
                <v-chip size="small" color="primary" variant="tonal">
                  {{ carStore.car.year }}
                </v-chip>
              </div>
              <p class="text-body-2 text-medium-emphasis mb-4">
                <v-icon size="small" class="me-1">mdi-card-text</v-icon>
                {{ carStore.car.plateNumber }}
                <span v-if="carStore.car.color"> • {{ carStore.car.color }}</span>
              </p>
              
              <!-- Odometer Display -->
              <div class="odometer-card pa-4 rounded-xl text-center">
                <v-icon size="28" color="primary" class="mb-2">mdi-speedometer</v-icon>
                <div class="text-h3 font-weight-bold text-primary mb-1">
                  {{ formattedOdometer }}
                </div>
                <div class="text-body-2 text-medium-emphasis">كيلومتر</div>
                <div v-if="odometerStore.averageDailyKm > 0" class="mt-2">
                  <v-chip size="x-small" color="info" variant="tonal">
                    <v-icon start size="12">mdi-trending-up</v-icon>
                    {{ odometerStore.averageDailyKm }} كم/يوم
                  </v-chip>
                </div>
              </div>
              
              <!-- Share & Update Buttons -->
              <div class="d-flex gap-2 mt-4">
                <v-btn
                  color="info"
                  variant="tonal"
                  class="flex-grow-1"
                  prepend-icon="mdi-qrcode"
                  @click="openShareDialog"
                >
                  مشاركة
                </v-btn>
                <v-btn
                  color="primary"
                  class="flex-grow-1"
                  prepend-icon="mdi-plus-circle"
                  @click="showOdometerDialog = true"
                >
                  تحديث العداد
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Stats & Alerts -->
        <v-col cols="12" lg="8">
          <v-row>
            <!-- Regulatory Alert (Saudi Fahas/Istimara Logic) -->
            <v-col cols="12" v-if="regulatoryStatus.hasAlert">
              <v-card :color="regulatoryStatus.color" class="text-white">
                <v-card-text class="d-flex align-start pa-4">
                  <v-icon size="40" color="white" class="me-4 mt-1">{{ regulatoryStatus.icon }}</v-icon>
                  <div>
                    <div class="text-h6 font-weight-bold mb-1">{{ regulatoryStatus.message }}</div>
                    <div class="text-body-2 opacity-90">{{ regulatoryStatus.description }}</div>
                    <div class="mt-3">
                      <v-btn 
                        variant="outlined" 
                        color="white" 
                        size="small" 
                        to="/documents"
                        prepend-icon="mdi-file-document-multiple"
                      >
                        إدارة الوثائق
                      </v-btn>
                      <v-tooltip location="bottom" text="حسب الأنظمة المرورية السعودية">
                        <template #activator="{ props }">
                          <v-icon v-bind="props" size="small" class="ms-3 opacity-70">mdi-information-outline</v-icon>
                        </template>
                      </v-tooltip>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>

            <!-- Next Maintenance Card -->
            <v-col cols="12">
              <v-card 
                v-if="nextMaintenance"
                class="next-maintenance-card"
                :class="`status-${nextMaintenance.statusInfo.status}`"
              >
                <v-card-text class="pa-5">
                  <div class="d-flex align-center justify-space-between flex-wrap gap-4">
                    <div class="d-flex align-center gap-4">
                      <div 
                        class="next-icon"
                        :class="`bg-${getStatusColor(nextMaintenance.statusInfo.status)}`"
                      >
                        <v-icon size="28" color="white">{{ getStatusIcon(nextMaintenance.statusInfo.status) }}</v-icon>
                      </div>
                      <div>
                        <div class="text-overline text-medium-emphasis">الصيانة القادمة</div>
                        <div class="text-h5 font-weight-bold">{{ nextMaintenance.name }}</div>
                        <div class="d-flex align-center gap-2 mt-1 flex-wrap">
                          <v-chip 
                            :color="getStatusColor(nextMaintenance.statusInfo.status)" 
                            size="small"
                            variant="flat"
                          >
                            {{ tasksStore.STATUS_LABELS[nextMaintenance.statusInfo.status] }}
                          </v-chip>
                          <span 
                            v-if="nextMaintenance.statusInfo.kmRemaining !== null && nextMaintenance.statusInfo.kmRemaining > 0"
                            class="text-body-2 text-medium-emphasis"
                          >
                            باقي {{ nextMaintenance.statusInfo.kmRemaining.toLocaleString() }} كم
                          </span>
                          <span 
                            v-else-if="nextMaintenance.statusInfo.kmRemaining === 0 && nextMaintenance.intervalKm"
                            class="text-body-2 text-error font-weight-medium"
                          >
                            يجب التغيير الآن
                          </span>
                          <span v-else class="text-body-2 text-medium-emphasis">
                            {{ Math.round(nextMaintenance.statusInfo.progress) }}% من الموعد
                          </span>
                        </div>
                        <div v-if="nextMaintenance.statusInfo.estimatedDate" class="text-caption text-medium-emphasis mt-1">
                          الموعد المتوقع: {{ formatDate(nextMaintenance.statusInfo.estimatedDate) }}
                        </div>
                      </div>
                    </div>
                    <div class="d-flex gap-2">
                      <v-btn
                        color="success"
                        variant="flat"
                        prepend-icon="mdi-check"
                        @click="recordMaintenance(nextMaintenance)"
                      >
                        تم
                      </v-btn>
                      <v-btn
                        variant="tonal"
                        prepend-icon="mdi-alarm-snooze"
                        @click="snoozeTask(nextMaintenance)"
                      >
                        تأجيل
                      </v-btn>
                    </div>
                  </div>
                  <!-- Progress Bar -->
                  <div class="mt-4">
                    <v-progress-linear
                      :model-value="Math.min(nextMaintenance.statusInfo.progress, 100)"
                      :color="getStatusColor(nextMaintenance.statusInfo.status)"
                      height="8"
                      rounded
                    ></v-progress-linear>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>

            <!-- Stats Cards -->
            <v-col v-for="stat in statsCards" :key="stat.title" cols="6" md="3">
              <v-card class="stat-card glass-card h-100" :class="stat.class">
                <v-card-text class="pa-4 text-center">
                  <div class="stat-icon mx-auto mb-2" :class="`bg-${stat.color}`">
                    <v-icon color="white" size="22">{{ stat.icon }}</v-icon>
                  </div>
                  <div class="text-h4 font-weight-bold mb-1" :class="`text-${stat.color}`">
                    {{ stat.value }}
                  </div>
                  <div class="text-caption text-medium-emphasis">{{ stat.title }}</div>
                </v-card-text>
              </v-card>
            </v-col>

            <!-- Cost Chart (New Feature) -->
            <v-col cols="12">
              <CostChart :records="recordsStore.records" />
            </v-col>

            <!-- Alerts Section -->
            <v-col cols="12">
              <v-card class="glass-card">
                <v-card-title class="d-flex align-center pa-4">
                  <div class="title-icon me-3">
                    <v-icon color="warning">mdi-bell-ring</v-icon>
                  </div>
                  <div>
                    <div class="text-subtitle-1 font-weight-bold">التنبيهات النشطة</div>
                    <div class="text-caption text-medium-emphasis">المهام التي تحتاج اهتمامك</div>
                  </div>
                  <v-spacer></v-spacer>
                  <v-btn variant="text" color="primary" size="small" to="/tasks">
                    عرض الكل
                    <v-icon end>mdi-chevron-left</v-icon>
                  </v-btn>
                </v-card-title>
                <v-divider></v-divider>
                <v-card-text class="pa-0">
                  <template v-if="alertTasks.length > 0">
                    <v-list class="bg-transparent py-0">
                      <v-list-item
                        v-for="(task, index) in alertTasks.slice(0, 4)"
                        :key="task.id"
                        class="alert-item px-4 py-3"
                        :class="{ 'border-b': index < alertTasks.slice(0, 4).length - 1 }"
                      >
                        <template #prepend>
                          <div 
                            class="alert-indicator"
                            :class="`bg-${getStatusColor(task.statusInfo.status)}`"
                          >
                            <v-icon size="18" color="white">{{ getStatusIcon(task.statusInfo.status) }}</v-icon>
                          </div>
                        </template>
                        <v-list-item-title class="font-weight-bold">
                          {{ task.name }}
                        </v-list-item-title>
                        <v-list-item-subtitle class="d-flex align-center gap-2 mt-1">
                          <v-chip 
                            :color="getStatusColor(task.statusInfo.status)" 
                            size="x-small"
                            variant="tonal"
                          >
                            {{ tasksStore.STATUS_LABELS[task.statusInfo.status] }}
                          </v-chip>
                          <span>{{ Math.round(task.statusInfo.progress) }}%</span>
                        </v-list-item-subtitle>
                        <template #append>
                          <div class="d-flex gap-1">
                            <v-btn
                              icon
                              size="small"
                              variant="text"
                              color="success"
                              @click="recordMaintenance(task)"
                            >
                              <v-icon>mdi-check</v-icon>
                            </v-btn>
                          </div>
                        </template>
                      </v-list-item>
                    </v-list>
                  </template>
                  <template v-else>
                    <div class="text-center py-8">
                      <div class="success-icon mx-auto mb-4">
                        <v-icon size="48" color="white">mdi-check</v-icon>
                      </div>
                      <p class="text-subtitle-1 font-weight-bold mb-1">لا توجد تنبيهات!</p>
                      <p class="text-body-2 text-medium-emphasis">جميع المهام على ما يرام</p>
                    </div>
                  </template>
                </v-card-text>
              </v-card>
            </v-col>

            <!-- Recent Records & Cost Summary -->
            <v-col cols="12" md="6">
              <v-card class="glass-card h-100">
                <v-card-title class="d-flex align-center pa-4">
                  <div class="title-icon me-3">
                    <v-icon color="info">mdi-history</v-icon>
                  </div>
                  <div class="text-subtitle-1 font-weight-bold">آخر الصيانات</div>
                  <v-spacer></v-spacer>
                  <v-btn variant="text" color="primary" size="small" to="/records">
                    السجل
                  </v-btn>
                </v-card-title>
                <v-divider></v-divider>
                <v-card-text>
                  <template v-if="recentRecords.length > 0">
                    <div 
                      v-for="(record, i) in recentRecords.slice(0, 3)" 
                      :key="record.id"
                      class="record-item d-flex align-center gap-3 py-3"
                      :class="{ 'border-b': i < 2 }"
                    >
                      <v-avatar color="primary" size="36" variant="tonal">
                        <v-icon size="18">mdi-wrench</v-icon>
                      </v-avatar>
                      <div class="flex-grow-1">
                        <div class="text-body-2 font-weight-medium">{{ record.taskName }}</div>
                        <div class="text-caption text-medium-emphasis">{{ formatDate(record.date) }}</div>
                      </div>
                      <v-chip size="small" color="success" variant="tonal">
                        {{ record.cost?.toLocaleString() || 0 }} ر.س
                      </v-chip>
                    </div>
                  </template>
                  <template v-else>
                    <div class="text-center py-4">
                      <v-icon size="40" color="grey-lighten-1" class="mb-2">mdi-clipboard-plus-outline</v-icon>
                      <p class="text-body-2 text-medium-emphasis mb-3">لا توجد سجلات بعد</p>
                      <v-btn
                        color="primary"
                        variant="tonal"
                        size="small"
                        prepend-icon="mdi-plus"
                        @click="goToAddMaintenance"
                        class="px-4"
                      >
                        أضف أول صيانة
                      </v-btn>
                    </div>
                  </template>
                </v-card-text>
              </v-card>
            </v-col>

            <!-- Cost Summary -->
            <v-col cols="12" md="6">
              <v-card class="cost-card h-100">
                <v-card-text class="pa-5 text-white">
                  <div class="d-flex align-center justify-space-between mb-4">
                    <div>
                      <div class="text-overline opacity-80">تكاليف هذا الشهر</div>
                      <div class="text-h3 font-weight-bold">
                        {{ recordsStore.thisMonthCost.toLocaleString() }}
                      </div>
                      <div class="text-body-2 opacity-80">ريال سعودي</div>
                    </div>
                    <div class="cost-icon">
                      <v-icon size="32" color="white">mdi-cash-multiple</v-icon>
                    </div>
                  </div>
                  <v-divider class="my-3 opacity-20"></v-divider>
                  <div class="d-flex justify-space-between">
                    <div class="text-center">
                      <div class="text-h6 font-weight-bold">{{ recordsStore.stats.totalRecords }}</div>
                      <div class="text-caption opacity-80">إجمالي الصيانات</div>
                    </div>
                    <div class="text-center">
                      <div class="text-h6 font-weight-bold">{{ recordsStore.stats.averageCost.toLocaleString() }}</div>
                      <div class="text-caption opacity-80">متوسط التكلفة</div>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
    </template>

    <!-- QR Share Dialog -->
    <Teleport to="body">
      <div v-if="showQRDialog" :key="Date.now()" style="position: relative; z-index: 99999;">
        <QRShareDialog 
          v-model="showQRDialog"
          :car="carStore.car"
        />
      </div>
    </Teleport>

    <!-- Add Car Dialog -->
    <v-dialog v-model="showCarDialog" max-width="600" persistent>
      <v-card class="rounded-xl">
        <v-card-title class="d-flex align-center pa-5">
          <div class="dialog-icon me-3">
            <v-icon color="primary">mdi-car-plus</v-icon>
          </div>
          <div>
            <div class="text-h6">إضافة سيارة جديدة</div>
            <div class="text-caption text-medium-emphasis">أدخل بيانات سيارتك</div>
          </div>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-5">
          <v-form ref="carForm" v-model="carFormValid">
            <!-- Image Upload -->
            <div class="image-upload-area mb-4" @click="triggerDialogImageUpload">
              <v-img
                v-if="carFormData.image"
                :src="carFormData.image"
                height="150"
                cover
                class="rounded-lg"
              >
                <div class="image-overlay d-flex align-center justify-center">
                  <v-icon size="32" color="white">mdi-camera</v-icon>
                </div>
              </v-img>
              <div v-else class="upload-placeholder d-flex flex-column align-center justify-center pa-6 rounded-lg">
                <v-icon size="48" color="primary" class="mb-2">mdi-image-plus</v-icon>
                <span class="text-body-2 text-medium-emphasis">انقر لرفع صورة السيارة (اختياري)</span>
              </div>
              <input
                ref="dialogImageInput"
                type="file"
                accept="image/*"
                style="display: none"
                @change="handleDialogImageUpload"
              />
            </div>

            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="carFormData.make"
                  label="ماركة السيارة"
                  placeholder="مثال: تويوتا"
                  prepend-inner-icon="mdi-car"
                  :rules="[v => !!v || 'هذا الحقل مطلوب']"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="carFormData.model"
                  label="الموديل"
                  placeholder="مثال: كامري"
                  prepend-inner-icon="mdi-car-info"
                  :rules="[v => !!v || 'هذا الحقل مطلوب']"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="carFormData.year"
                  label="سنة الصنع"
                  placeholder="مثال: 2023"
                  type="number"
                  prepend-inner-icon="mdi-calendar"
                  :rules="[v => !!v || 'هذا الحقل مطلوب']"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="carFormData.plateNumber"
                  label="رقم اللوحة"
                  placeholder="مثال: ABC 1234"
                  prepend-inner-icon="mdi-card-text"
                  :rules="[v => !!v || 'هذا الحقل مطلوب']"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="carFormData.color"
                  label="اللون (اختياري)"
                  placeholder="مثال: أبيض"
                  prepend-inner-icon="mdi-palette"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="carFormData.initialOdometer"
                  label="قراءة العداد الحالية"
                  placeholder="مثال: 50000"
                  type="number"
                  suffix="كم"
                  prepend-inner-icon="mdi-speedometer"
                ></v-text-field>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showCarDialog = false">إلغاء</v-btn>
          <v-btn color="primary" :disabled="!carFormValid" @click="saveCar">
            إضافة السيارة
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Odometer Dialog -->
    <v-dialog v-model="showOdometerDialog" max-width="400" persistent>
      <v-card class="rounded-xl">
        <v-card-title class="d-flex align-center pa-5">
          <div class="dialog-icon me-3">
            <v-icon color="primary">mdi-speedometer</v-icon>
          </div>
          <div class="text-h6">تحديث قراءة العداد</div>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-5">
          <div class="current-reading pa-4 rounded-lg mb-4 text-center">
            <div class="text-caption text-medium-emphasis">القراءة الحالية</div>
            <div class="text-h4 font-weight-bold text-primary">
              {{ carStore.car?.currentOdometer?.toLocaleString() || 0 }} كم
            </div>
          </div>
          <v-text-field
            v-model.number="newOdometerReading"
            label="القراءة الجديدة"
            type="number"
            suffix="كم"
            prepend-inner-icon="mdi-speedometer"
            autofocus
          ></v-text-field>
          <v-textarea
            v-model="odometerNotes"
            label="ملاحظات (اختياري)"
            rows="2"
            class="mt-2"
          ></v-textarea>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showOdometerDialog = false">إلغاء</v-btn>
          <v-btn
            color="primary"
            :disabled="!newOdometerReading || newOdometerReading <= (carStore.car?.currentOdometer || 0)"
            @click="saveOdometerReading"
          >
            حفظ
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
          <div class="snooze-options d-flex flex-wrap gap-2">
            <v-btn
              v-for="opt in snoozeOptions"
              :key="opt.value"
              :variant="snoozeDuration === opt.value ? 'flat' : 'tonal'"
              :color="snoozeDuration === opt.value ? 'primary' : undefined"
              @click="snoozeDuration = opt.value"
            >
              {{ opt.label }}
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

    <!-- Record Maintenance Dialog -->
    <v-dialog v-model="showRecordDialog" max-width="500" persistent>
      <v-card class="rounded-xl">
        <v-card-title class="pa-5">
          <v-icon color="success" class="me-2">mdi-wrench-check</v-icon>
          تسجيل صيانة
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-5">
          <div class="task-badge pa-4 rounded-lg mb-4">
            <div class="text-caption text-medium-emphasis">المهمة</div>
            <div class="text-h6 font-weight-bold">{{ selectedTask?.name }}</div>
          </div>
          <v-text-field
            v-model.number="recordFormData.odometerReading"
            label="قراءة العداد"
            type="number"
            suffix="كم"
            prepend-inner-icon="mdi-speedometer"
            class="mb-3"
          ></v-text-field>
          <v-text-field
            v-model.number="recordFormData.cost"
            label="التكلفة"
            type="number"
            suffix="ر.س"
            prepend-inner-icon="mdi-cash"
            class="mb-3"
          ></v-text-field>
          <v-text-field
            v-model="recordFormData.serviceCenter"
            label="مركز الصيانة"
            prepend-inner-icon="mdi-map-marker"
            class="mb-3"
          ></v-text-field>
          <v-textarea
            v-model="recordFormData.notes"
            label="ملاحظات"
            rows="2"
            prepend-inner-icon="mdi-note-text"
          ></v-textarea>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showRecordDialog = false">إلغاء</v-btn>
          <v-btn color="success" @click="confirmRecord">تسجيل</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Onboarding Wizard -->
    <OnboardingWizard v-model="showWizard" @finished="onWizardFinished" />


  </div>
</template>

<script setup>
import { ref, computed, inject, defineAsyncComponent, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useCarStore } from '@/stores/car'
import { useOdometerStore } from '@/stores/odometer'
import { useTasksStore } from '@/stores/tasks'
import { useRecordsStore } from '@/stores/records'
import { useDocumentsStore } from '@/stores/documents'
import { useProfileStore } from '@/stores/profile'
import OnboardingWizard from '@/components/OnboardingWizard.vue'
import QRShareDialog from '@/components/QRShareDialog.vue'
const CostChart = defineAsyncComponent(() => import('@/components/CostChart.vue'))
import confetti from 'canvas-confetti'
import dayjs from 'dayjs'
import 'dayjs/locale/ar'

dayjs.locale('ar')

const showSnackbar = inject('showSnackbar')

// Stores
const carStore = useCarStore()
const odometerStore = useOdometerStore()
const tasksStore = useTasksStore()
const recordsStore = useRecordsStore()
const profileStore = useProfileStore()
const documentsStore = useDocumentsStore()

// Fetch profile on mount
onMounted(async () => {
  if (!profileStore.hasProfile) {
    await profileStore.fetchProfile()
  }
  // Ensure documents are fetched for regulatory check
  if (documentsStore.documents.length === 0) await documentsStore.fetchDocuments()
})

// Greeting with first name
const greeting = computed(() => {
  const hour = new Date().getHours()
  const name = profileStore.firstName || ''
  const nameText = name ? `، ${name}` : ''
  
  if (hour < 12) return `صباح الخير${nameText} ☀️`
  if (hour < 18) return `مساء الخير${nameText} 🌤️`
  return `مساء الخير${nameText} 🌙`
})

// Features for empty state
const features = [
  { icon: 'mdi-bell-ring', color: 'warning', title: 'تنبيهات ذكية', desc: 'إشعارات تلقائية للصيانة' },
  { icon: 'mdi-chart-line', color: 'info', title: 'تتبع التكاليف', desc: 'إحصائيات مفصلة' },
  { icon: 'mdi-history', color: 'success', title: 'سجل كامل', desc: 'أرشفة جميع الصيانات' }
]

// Snooze options
const snoozeOptions = [
  { label: 'يوم', value: 'day' },
  { label: 'أسبوع', value: 'week' },
  { label: 'أسبوعين', value: 'twoWeeks' },
  { label: 'شهر', value: 'month' }
]

// Computed
const formattedDate = computed(() => dayjs().format('DD MMMM YYYY'))
const formattedOdometer = computed(() => (carStore.car?.currentOdometer || 0).toLocaleString())
const alertTasks = computed(() => tasksStore.alertTasks)
const recentRecords = computed(() => recordsStore.recentRecords)
const regulatoryStatus = computed(() => documentsStore.regulatoryStatus)

const nextMaintenance = computed(() => {
  const alerts = tasksStore.alertTasks
  if (alerts.length > 0) return alerts[0]
  const sorted = tasksStore.sortedTasks
  return sorted.length > 0 ? sorted[0] : null
})

const statsCards = computed(() => [
  { title: 'متأخر', value: tasksStore.taskStats.late, icon: 'mdi-alert-circle', color: 'error' },
  { title: 'مستحق', value: tasksStore.taskStats.due, icon: 'mdi-clock-alert', color: 'warning' },
  { title: 'قريب', value: tasksStore.taskStats.soon, icon: 'mdi-clock-outline', color: 'amber-darken-2' },
  { title: 'على ما يرام', value: tasksStore.taskStats.good, icon: 'mdi-check-circle', color: 'success' }
])

// Wizard
const showWizard = ref(false)
const showQRDialog = ref(false)

function onWizardFinished() {
  showSnackbar('تم إعداد حسابك بنجاح! 🎉')
}

// Car Dialog
const showCarDialog = ref(false)
const carFormValid = ref(false)
const carFormData = ref({
  make: '', model: '', year: new Date().getFullYear(), plateNumber: '', 
  color: '', initialOdometer: 0, notes: '', image: null
})

// Image Upload
const imageInput = ref(null)
const dialogImageInput = ref(null)

function triggerImageUpload() { imageInput.value?.click() }
function triggerDialogImageUpload() { dialogImageInput.value?.click() }

function handleImageUpload(event) {
  const file = event.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      carStore.updateCar({ image: e.target.result })
      showSnackbar('تم تحديث صورة السيارة')
    }
    reader.readAsDataURL(file)
  }
}

function handleDialogImageUpload(event) {
  const file = event.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => { carFormData.value.image = e.target.result }
    reader.readAsDataURL(file)
  }
}

function saveCar() {
  carStore.addCar(carFormData.value)
  showCarDialog.value = false
  showSnackbar('تم إضافة السيارة بنجاح')
}

// Odometer Dialog
const showOdometerDialog = ref(false)
const newOdometerReading = ref(null)
const odometerNotes = ref('')

function saveOdometerReading() {
  try {
    odometerStore.addReading({ reading: newOdometerReading.value, notes: odometerNotes.value })
    showOdometerDialog.value = false
    newOdometerReading.value = null
    odometerNotes.value = ''
    showSnackbar('تم تحديث قراءة العداد')
  } catch (error) {
    showSnackbar(error.message, 'error')
  }
}

// Snooze Dialog
const showSnoozeDialog = ref(false)
const selectedTask = ref(null)
const snoozeDuration = ref('week')

function snoozeTask(task) {
  selectedTask.value = task
  showSnoozeDialog.value = true
}

function confirmSnooze() {
  tasksStore.snoozeTask(selectedTask.value.id, snoozeDuration.value)
  showSnoozeDialog.value = false
  showSnackbar('تم تأجيل التنبيه')
}

// Record Dialog
const showRecordDialog = ref(false)
const recordFormValid = ref(false)
const recordFormData = ref({ odometerReading: 0, cost: 0, serviceCenter: '', notes: '' })

function recordMaintenance(task) {
  selectedTask.value = task
  recordFormData.value = {
    odometerReading: carStore.car?.currentOdometer || 0,
    cost: 0, serviceCenter: '', notes: ''
  }
  showRecordDialog.value = true
}

function confirmRecord() {
  tasksStore.recordMaintenance(selectedTask.value.id, {
    odometer: recordFormData.value.odometerReading,
    date: new Date().toISOString()
  })
  recordsStore.addRecord({
    taskId: selectedTask.value.id,
    taskName: selectedTask.value.name,
    odometerReading: recordFormData.value.odometerReading,
    cost: recordFormData.value.cost,
    serviceCenter: recordFormData.value.serviceCenter,
    notes: recordFormData.value.notes
  })
  showRecordDialog.value = false
  showSnackbar('تم تسجيل الصيانة بنجاح', 'success')
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  })
}

// Navigation
const router = useRouter()
function openShareDialog() {
  showQRDialog.value = true
  console.log("Modal state updated to:", showQRDialog.value);
}

function goToAddMaintenance() {
  router.push('/tasks')
}

function handleShareUpdate(updates) {
  if (carStore.car) {
    carStore.car = { ...carStore.car, ...updates }
    showSnackbar(updates.publicShareEnabled ? 'تم تفعيل المشاركة' : 'تم إيقاف المشاركة')
  }
}

// Helpers
function getStatusColor(status) {
  return { late: 'error', due: 'warning', soon: 'amber-darken-2', good: 'success' }[status] || 'grey'
}

function getStatusIcon(status) {
  return { late: 'mdi-alert-circle', due: 'mdi-clock-alert', soon: 'mdi-clock-outline', good: 'mdi-check-circle' }[status] || 'mdi-help-circle'
}

function formatDate(date) { return dayjs(date).format('DD/MM/YYYY') }
</script>

<style scoped>
/* Welcome Card */
.welcome-card {
  background: linear-gradient(135deg, rgba(var(--v-theme-surface), 0.95), rgba(var(--v-theme-surface), 0.9));
  border: 1px solid rgba(var(--v-theme-primary), 0.1);
}

.welcome-icon {
  width: 100px;
  height: 100px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1976D2, #1565C0);
}

.feature-card {
  background: rgba(var(--v-theme-primary), 0.05);
  transition: all 0.3s ease;
}

.feature-card:hover {
  background: rgba(var(--v-theme-primary), 0.1);
  transform: translateY(-4px);
}

/* Car Card */
.car-card { overflow: hidden; }

.car-image-wrapper {
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.car-image { transition: transform 0.3s ease; }
.car-card:hover .car-image { transform: scale(1.05); }

.image-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.car-image-wrapper:hover .image-overlay { opacity: 1; }

.car-placeholder {
  height: 200px;
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.15), rgba(25, 118, 210, 0.05));
  border: 2px dashed rgba(25, 118, 210, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
}

.car-placeholder:hover {
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.25), rgba(25, 118, 210, 0.1));
}

.odometer-card {
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.1), rgba(var(--v-theme-primary), 0.05));
}

/* Next Maintenance */
.next-maintenance-card {
  background: rgba(var(--v-theme-surface), 0.95);
  border-top: 4px solid;
}

.status-late { border-color: rgb(var(--v-theme-error)); }
.status-due { border-color: rgb(var(--v-theme-warning)); }
.status-soon { border-color: #F9A825; }
.status-good { border-color: rgb(var(--v-theme-success)); }

.next-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Stats Cards */
.stat-card { transition: all 0.3s ease; }
.stat-card:hover { transform: translateY(-4px); }

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Title Icon */
.title-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-warning), 0.1);
}

/* Alert Items */
.alert-item { transition: background 0.2s ease; }
.alert-item:hover { background: rgba(var(--v-theme-surface-variant), 0.5); }
.border-b { border-bottom: 1px solid rgba(var(--v-border-color), 0.1); }

.alert-indicator {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.success-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #4CAF50, #43A047);
}

/* Cost Card */
.cost-card {
  background: linear-gradient(135deg, #1976D2, #1565C0) !important;
}

.cost-icon {
  width: 60px;
  height: 60px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
}

/* Dialog */
.dialog-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-primary), 0.1);
}

.current-reading {
  background: rgba(var(--v-theme-primary), 0.05);
}

.task-badge {
  background: rgba(var(--v-theme-success), 0.1);
  border: 1px solid rgba(var(--v-theme-success), 0.2);
}

/* Image Upload */
.image-upload-area { cursor: pointer; border-radius: 12px; overflow: hidden; }

.upload-placeholder {
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.1), rgba(25, 118, 210, 0.05));
  border: 2px dashed rgba(25, 118, 210, 0.3);
  transition: all 0.3s ease;
}

.upload-placeholder:hover {
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.2), rgba(25, 118, 210, 0.1));
}

.upload-icon-wrapper {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)), #1565C0);
  box-shadow: 0 8px 24px rgba(var(--v-theme-primary), 0.3);
  transition: transform 0.3s ease;
}

.car-placeholder:hover .upload-icon-wrapper {
  transform: scale(1.1);
}

.overlay-content {
  transform: translateY(10px);
  opacity: 0.9;
  transition: all 0.3s ease;
}

.image-overlay:hover .overlay-content {
  transform: translateY(0);
  opacity: 1;
}

/* Entry Animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.car-card {
  animation: fadeInUp 0.5s ease-out forwards;
}

.stat-card {
  animation: fadeInUp 0.5s ease-out forwards;
}

.stat-card:nth-child(1) { animation-delay: 0.1s; }
.stat-card:nth-child(2) { animation-delay: 0.2s; }
.stat-card:nth-child(3) { animation-delay: 0.3s; }
.stat-card:nth-child(4) { animation-delay: 0.4s; }

.next-maintenance-card {
  animation: fadeInUp 0.6s ease-out forwards;
  animation-delay: 0.15s;
}

.glass-card {
  animation: fadeInUp 0.6s ease-out forwards;
  animation-delay: 0.2s;
}
</style>
