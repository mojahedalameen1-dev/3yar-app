<template>
  <div class="dashboard">
    <div v-if="dashboardPrimaryState === 'loading'" class="py-8" role="status" aria-live="polite">
      <v-skeleton-loader type="heading, paragraph, paragraph"></v-skeleton-loader>
      <span class="sr-only">جارٍ تحميل بيانات السيارة</span>
    </div>
    <v-alert v-else-if="dashboardPrimaryState === 'unavailable'" type="error" variant="tonal" class="mb-4" role="alert">
      تعذر تحميل بيانات السيارة؛ لم نعرض حالة الإعداد حتى لا نخلط بين الخطأ وعدم وجود سيارة.
      <v-btn size="small" variant="text" :loading="carStore.loading" :disabled="carStore.loading" @click="carStore.fetchCar()">إعادة المحاولة</v-btn>
    </v-alert>

    <!-- No Car State -->
    <template v-else-if="dashboardPrimaryState === 'onboarding'">
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
          @click="router.push({ name: 'setup-car' })"
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
      <!-- Greeting and vehicle identity -->
      <div class="d-flex flex-wrap justify-space-between align-center mb-4 px-1 animate-slide-up">
        <div>
          <h1 :class="[isMobile ? 'text-h6' : 'text-h4', 'font-weight-bold mb-1']">{{ greeting }}</h1>
          <p class="text-body-2 text-medium-emphasis mb-0">
            {{ carStore.car.make }} {{ carStore.car.model }} · {{ carStore.car.year }}
          </p>
        </div>
        <div v-if="!isMobile" class="d-flex align-center gap-2">
          <v-chip color="primary" variant="tonal" size="large" class="px-4">
            <v-icon start aria-hidden="true">mdi-calendar</v-icon>
            {{ formattedDate }}
          </v-chip>
        </div>
      </div>

      <v-alert v-if="carSourceState === 'degraded'" type="warning" variant="tonal" class="mb-4" role="alert">
        تعذر تحديث بيانات السيارة؛ نعرض آخر البيانات المحمّلة.
        <v-btn size="small" variant="text" :loading="carStore.loading" :disabled="carStore.loading" @click="carStore.fetchCar()">إعادة المحاولة</v-btn>
      </v-alert>

      <!-- Action Center -->
      <v-card class="action-center-card mb-4" variant="tonal" :loading="actionCenterState === 'loading'">
        <v-card-title class="d-flex align-center flex-wrap ga-2 pa-4">
          <v-icon color="primary" aria-hidden="true">mdi-clipboard-alert-outline</v-icon>
          <h2 class="text-subtitle-1 font-weight-bold mb-0">يحتاج انتباهك</h2>
          <v-chip v-if="dashboardActions.length" size="small" color="primary" variant="tonal">
            {{ dashboardActions.length.toLocaleString('ar-SA') }}
          </v-chip>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-4">
          <v-alert v-if="maintenanceSourceState === 'unavailable' || maintenanceSourceState === 'degraded'" type="warning" variant="tonal" density="compact" class="mb-3" role="alert">
            تعذر تحديث بيانات مهام الصيانة.
            <v-btn size="small" variant="text" :loading="tasksStore.loading" :disabled="tasksStore.loading" @click="tasksStore.fetchTasks()">إعادة المحاولة</v-btn>
          </v-alert>
          <v-alert v-if="documentsSourceState === 'unavailable' || documentsSourceState === 'degraded'" type="warning" variant="tonal" density="compact" class="mb-3" role="alert">
            تعذر تحديث بيانات الوثائق.
            <v-btn size="small" variant="text" :loading="documentsStore.loading" :disabled="documentsStore.loading" @click="documentsStore.fetchDocuments()">إعادة المحاولة</v-btn>
          </v-alert>

          <v-list v-if="dashboardActions.length" id="dashboard-action-list" class="bg-transparent pa-0">
            <v-list-item
              v-for="(action, index) in visibleDashboardActions"
              :key="action.id"
              class="dashboard-action-item rounded-lg px-2"
              :class="{ 'border-b': index < visibleDashboardActions.length - 1 }"
            >
              <template #prepend>
                <v-avatar :color="actionSeverityColor(action.severity)" variant="tonal" size="40" class="me-2">
                  <v-icon aria-hidden="true">{{ actionSourceIcon(action.source) }}</v-icon>
                </v-avatar>
              </template>
              <v-list-item-title class="font-weight-bold text-wrap">{{ action.title }}</v-list-item-title>
              <v-list-item-subtitle class="text-wrap mt-1">{{ action.message }}</v-list-item-subtitle>
              <template #append>
                <v-btn
                  v-if="action.actionKind === 'odometer'"
                  color="primary"
                  variant="text"
                  size="small"
                  class="dashboard-action-cta"
                  @click="openOdometerDialog"
                >
                  {{ action.actionLabel }}
                </v-btn>
                <v-btn
                  v-else
                  :to="action.actionRoute"
                  color="primary"
                  variant="text"
                  size="small"
                  class="dashboard-action-cta"
                >
                  {{ action.actionLabel }}
                </v-btn>
              </template>
            </v-list-item>
            <div v-if="dashboardActions.length > 3" class="text-center pt-3">
              <v-btn
                variant="text"
                color="primary"
                :aria-expanded="showAllDashboardActions"
                aria-controls="dashboard-action-list"
                @click="showAllDashboardActions = !showAllDashboardActions"
              >
                {{ showAllDashboardActions ? 'عرض أقل' : 'عرض الكل' }}
              </v-btn>
            </div>
          </v-list>

          <div v-else-if="actionCenterState === 'loading'" class="py-2" role="status" aria-live="polite">
            <v-skeleton-loader type="list-item-avatar-two-line, list-item-avatar-two-line"></v-skeleton-loader>
            <span class="sr-only">جارٍ التحقق من المهام والوثائق</span>
          </div>
          <div v-else-if="actionCenterState === 'partial-empty'" class="text-body-2 text-medium-emphasis py-2" role="status">
            لا توجد إجراءات ضمن البيانات المتاحة حاليًا. بعض المصادر لم تُحدّث.
          </div>
          <div v-else class="dashboard-no-action-state py-2" role="status" aria-live="polite">
            <div class="font-weight-bold">لا توجد إجراءات عاجلة حاليًا</div>
            <div v-if="nextMaintenance.state === 'ready'" class="text-body-2 text-medium-emphasis mt-1">
              <span>الصيانة القادمة: {{ nextMaintenance.task.name }}</span>
              <span v-if="nextMaintenance.expectedDate"> · موعد متوقع {{ formatDate(nextMaintenance.expectedDate) }}</span>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <!-- Small, direct actions; no placeholder buttons -->
      <section class="mb-5" aria-labelledby="dashboard-quick-actions-title">
        <h2 id="dashboard-quick-actions-title" class="text-subtitle-2 text-medium-emphasis mb-2">إجراءات سريعة</h2>
        <v-row dense>
          <v-col v-for="action in quickActions" :key="action.id" cols="12" sm="4">
            <v-btn
              v-if="action.kind === 'odometer'"
              block
              min-height="44"
              variant="tonal"
              color="primary"
              :prepend-icon="action.icon"
              @click="openOdometerDialog"
            >
              {{ action.title }}
            </v-btn>
            <v-btn
              v-else
              block
              min-height="44"
              variant="tonal"
              color="primary"
              :to="action.route"
              :prepend-icon="action.icon"
            >
              {{ action.title }}
            </v-btn>
          </v-col>
        </v-row>
      </section>

      <v-row :class="{ 'gap-6': isMobile }">
        <!-- Car Card with Image -->
        <v-col cols="12" lg="4">
          <v-card :class="['car-card animate-slide-up', isMobile ? 'surface-card' : 'glass-card h-100']">
            <div class="car-image-wrapper" role="button" tabindex="0" aria-label="تغيير صورة السيارة" @click="triggerImageUpload" @keydown.enter.space.prevent="triggerImageUpload">
              <v-img
                v-if="carStore.car.image"
                :src="carStore.car.image"
                :height="isMobile ? 240 : 200"
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
              <div v-else class="car-placeholder d-flex flex-column align-center justify-center" :style="{ height: isMobile ? '240px' : '200px' }">
                <div class="upload-icon-wrapper mb-3">
                  <v-icon size="36" color="white">mdi-car-side</v-icon>
                </div>
                <span class="text-subtitle-2 font-weight-medium mb-1">أضف صورة سيارتك</span>
                <span class="text-caption text-medium-emphasis">اسحب أو انقر للرفع</span>
              </div>
              <input
                ref="imageInput"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style="display: none"
                @change="handleImageUpload"
              />
            </div>
            <v-card-text class="pa-5">
              <div class="d-flex align-center justify-space-between mb-2">
                <h3 class="text-h5 font-weight-bold">
                  {{ carStore.car.make }} {{ carStore.car.model }}
                </h3>
                <v-chip size="small" color="primary" variant="tonal" class="rounded-lg">
                  {{ carStore.car.year }}
                </v-chip>
              </div>
              <p class="text-body-2 text-medium-emphasis mb-4">
                <v-icon size="small" class="me-1">mdi-card-text</v-icon>
                {{ carStore.car.plateNumber }}
                <span v-if="carStore.car.color"> • {{ carStore.car.color }}</span>
              </p>
              
              <!-- Odometer Display -->
              <div class="pa-4 rounded-xl text-center odometer-card">
                <v-icon size="28" color="primary" class="mb-2">mdi-speedometer</v-icon>
                <div :class="['font-weight-bold primary--text mb-1', isMobile ? 'stat-value-large' : 'text-h3']">
                  {{ formattedOdometer }}
                </div>
                <div class="text-body-2 text-medium-emphasis">كيلومتر</div>
                <div v-if="lastOdometerUpdate" class="text-caption text-medium-emphasis mt-1">
                  آخر تحديث {{ lastOdometerUpdate }}
                </div>
                <div v-if="odometerSummary.state === 'loading'" class="mt-3" role="status" aria-live="polite">
                  <v-skeleton-loader type="text" width="70%"></v-skeleton-loader>
                  <span class="sr-only">جارٍ تحميل ملخص استخدام السيارة</span>
                </div>
                <div v-else class="odometer-usage-summary mt-3 text-body-2" aria-live="polite">
                  {{ odometerSummary.message }}
                </div>
                <v-alert v-if="odometerSourceState === 'unavailable' || odometerSourceState === 'degraded'" type="warning" variant="tonal" density="compact" class="mt-3" role="alert">
                  تعذر تحديث سجل العداد.
                  <v-btn size="small" variant="text" :loading="odometerStore.loading" :disabled="odometerStore.loading" @click="odometerStore.fetchReadings()">إعادة المحاولة</v-btn>
                </v-alert>
              </div>
              
              <!-- Car actions -->
              <div class="d-flex gap-3 mt-4">
                <v-btn
                  color="primary"
                  class="flex-grow-1 action-btn-mobile"
                  prepend-icon="mdi-plus-circle"
                  @click="openOdometerDialog"
                  :height="isMobile ? 52 : 40"
                  rounded="xl"
                >
                  سجل العداد وتحديثه
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Stats & Alerts -->
        <v-col cols="12" lg="8">
          <v-row>
            <!-- Regulatory Alert (Saudi Fahas/Istimara Logic) -->
            <v-col cols="12" v-if="regulatoryStatus.isTechnicalViolation || regulatoryStatus.isRenewalBlocked">
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

            <!-- Next maintenance uses the task store's existing status/forecast only. -->
            <v-col v-if="nextMaintenance.state === 'ready' && dashboardActions.length" cols="12">
              <v-card class="next-maintenance-card surface-card">
                <v-card-text class="d-flex align-center justify-space-between flex-wrap ga-4 pa-5">
                  <div>
                    <div class="text-overline text-medium-emphasis">الصيانة القادمة</div>
                    <h2 class="text-h6 font-weight-bold">{{ nextMaintenance.task.name }}</h2>
                    <p v-if="nextMaintenance.expectedDate" class="text-body-2 text-medium-emphasis mb-0">
                      موعد متوقع {{ formatDate(nextMaintenance.expectedDate) }}
                    </p>
                    <p v-else-if="nextMaintenance.task.statusInfo.kmRemaining !== null" class="text-body-2 text-medium-emphasis mb-0">
                      المتبقي حسب الخطة {{ Number(nextMaintenance.task.statusInfo.kmRemaining).toLocaleString('ar-SA') }} كم
                    </p>
                    <p v-else class="text-body-2 text-medium-emphasis mb-0">تُحدّث مواعيدها حسب بيانات الصيانة والعداد.</p>
                  </div>
                  <v-btn color="primary" variant="tonal" :to="{ name: 'tasks' }">عرض المهمة</v-btn>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col v-else-if="nextMaintenance.state === 'needs_setup'" cols="12">
              <v-card class="needs-setup-card" variant="tonal">
                <v-card-text class="d-flex flex-column flex-sm-row align-start align-sm-center ga-4 pa-5">
                  <v-icon color="info" size="26" aria-hidden="true">mdi-wrench-clock</v-icon>
                  <div class="flex-grow-1">
                    <h2 class="text-subtitle-1 font-weight-bold mb-1">أكمل إعداد خطة الصيانة لبدء المتابعة</h2>
                    <p class="text-body-2 text-medium-emphasis mb-0">لن نعرض موعدًا قبل توفر بيانات الصيانة اللازمة.</p>
                  </div>
                  <v-btn color="primary" variant="tonal" prepend-icon="mdi-wrench-clock" :to="{ name: 'tasks', query: { filter: 'needs_setup' } }">
                    إعداد الصيانة
                  </v-btn>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" md="6">
              <v-card class="glass-card h-100">
                <v-card-title class="d-flex align-center pa-4">
                  <v-icon color="info" class="me-3" aria-hidden="true">mdi-file-document-multiple</v-icon>
                  <h2 class="text-subtitle-1 font-weight-bold mb-0">الوثائق</h2>
                  <v-spacer></v-spacer>
                  <v-btn variant="text" color="primary" size="small" :to="{ name: 'documents' }">عرض الوثائق</v-btn>
                </v-card-title>
                <v-divider></v-divider>
                <v-card-text>
                  <div v-if="documentsSummary.state === 'loading'" role="status">جارٍ تحميل الوثائق…</div>
                  <div v-else-if="documentsSummary.state === 'unavailable'" class="text-body-2 text-medium-emphasis">ملخص الوثائق غير متاح مؤقتًا.</div>
                  <div v-else-if="documentsSummary.state === 'empty'" class="text-body-2 text-medium-emphasis">لا توجد وثائق مضافة بعد.</div>
                  <div v-else-if="documentsSummary.attentionCount" class="d-flex align-center ga-2">
                    <v-icon color="warning" aria-hidden="true">mdi-file-alert-outline</v-icon>
                    <span class="font-weight-medium">{{ formatCount(documentsSummary.attentionCount) }} وثائق تحتاج انتباه</span>
                  </div>
                  <div v-else class="text-body-2 text-medium-emphasis">لا توجد وثائق تحتاج إجراء حاليًا.</div>
                  <div v-if="documentsSummary.isDegraded" class="text-caption text-warning mt-2">نعرض آخر بيانات محمّلة؛ تعذر تحديثها الآن.</div>
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
                  <v-alert v-if="recordsSourceState === 'unavailable' || recordsSourceState === 'degraded'" type="warning" variant="tonal" density="compact" class="mb-3" role="alert">
                    تعذر تحديث سجل الصيانة.
                    <v-btn size="small" variant="text" :loading="recordsStore.loading" :disabled="recordsStore.loading" @click="recordsStore.fetchRecords()">إعادة المحاولة</v-btn>
                  </v-alert>
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
                        <div class="text-caption text-medium-emphasis">
                          {{ formatDate(record.date) }} · {{ record.odometerReading == null ? 'العداد غير مسجل' : `${formatCount(record.odometerReading)} كم` }}
                        </div>
                      </div>
                      <v-chip v-if="normalizeKnownCostV1(record.cost) !== null" size="small" color="success" variant="tonal">
                        {{ formatMoney(normalizeKnownCostV1(record.cost)) }} ر.س
                      </v-chip>
                      <span v-else class="text-caption text-medium-emphasis">التكلفة غير مسجلة</span>
                    </div>
                  </template>
                  <div v-else-if="recordsSourceState === 'loading'" class="py-4" role="status" aria-live="polite">
                    <v-skeleton-loader type="list-item-avatar-two-line, list-item-avatar-two-line"></v-skeleton-loader>
                    <span class="sr-only">جارٍ تحميل سجل الصيانة</span>
                  </div>
                  <div v-else-if="recordsSourceState === 'unavailable'" class="text-body-2 text-medium-emphasis py-4">
                    سجل الصيانة غير متاح مؤقتًا.
                  </div>
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
              <v-card :class="['cost-card h-100 animate-slide-up', isMobile ? 'surface-card' : '']">
                <v-card-text class="pa-6 text-white text-center text-md-start">
                  <div class="text-overline opacity-80 mb-2">مصاريف الصيانة هذا العام</div>
                  <div v-if="costSummary.state === 'loading'" class="text-body-2" role="status">جارٍ تحميل التكاليف…</div>
                  <div v-else-if="costSummary.state === 'unavailable'" class="text-body-2" role="alert">
                    تعذر تحميل ملخص التكاليف.
                    <v-btn size="small" variant="text" color="white" :loading="recordsStore.loading" :disabled="recordsStore.loading" @click="recordsStore.fetchRecords()">إعادة المحاولة</v-btn>
                  </div>
                  <template v-else>
                    <div v-if="costSummary.yearTotal !== null" :class="['font-weight-bold mb-1', isMobile ? 'stat-value-large' : 'text-h3']">
                      {{ formatMoney(costSummary.yearTotal) }}
                    </div>
                    <div v-else class="text-body-1 font-weight-medium">{{ costSummary.message }}</div>
                    <div v-if="costSummary.yearTotal !== null" class="text-body-2 opacity-80">ريال سعودي</div>
                    <div v-if="costSummary.lastMaintenanceCost !== null" class="text-body-2 mt-3">
                      آخر صيانة: {{ formatMoney(costSummary.lastMaintenanceCost) }} ر.س
                    </div>
                    <div v-else-if="recentRecords.length" class="text-body-2 mt-3">تكلفة آخر صيانة غير مسجلة</div>
                    <div v-if="costSummary.isDegraded" class="text-caption text-warning mt-2">بيانات التكلفة المعروضة لم يتأكد تحديثها.</div>
                    <v-btn variant="text" color="white" class="mt-2 px-0" :to="{ name: 'records' }">عرض سجل الصيانة</v-btn>
                  </template>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
    </template>

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
          <v-alert v-if="carDialogError" type="error" variant="tonal" class="mb-4" role="alert">{{ carDialogError }}</v-alert>
          <v-form ref="carForm" v-model="carFormValid">
            <!-- Image Upload -->
            <div class="image-upload-area mb-4" role="button" tabindex="0" aria-label="اختيار صورة السيارة" @click="triggerDialogImageUpload" @keydown.enter.space.prevent="triggerDialogImageUpload">
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
                accept="image/jpeg,image/png,image/webp"
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
          <v-btn variant="text" :disabled="savingCar" @click="showCarDialog = false">إلغاء</v-btn>
          <v-btn color="primary" :disabled="!carFormValid || savingCar" :loading="savingCar" @click="saveCar">
            إضافة السيارة
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Odometer Dialog -->
    <v-dialog v-model="showOdometerDialog" max-width="440" scrollable :persistent="savingOdometer">
      <v-card class="rounded-xl">
        <v-card-title class="d-flex align-center pa-5">
          <div class="dialog-icon me-3">
            <v-icon color="primary">mdi-speedometer</v-icon>
          </div>
          <div class="text-h6">تحديث قراءة العداد</div>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-5">
          <v-alert v-if="odometerSaveError" type="error" variant="tonal" class="mb-4" role="alert">
            {{ odometerSaveError }}
          </v-alert>
          <div class="current-reading pa-4 rounded-lg mb-4 text-center">
            <div class="text-caption text-medium-emphasis">القراءة الحالية</div>
            <div class="text-h4 font-weight-bold text-primary">
              {{ formattedOdometer }} كم
            </div>
          </div>
          <v-text-field
            v-model.number="newOdometerReading"
            label="القراءة الجديدة"
            type="number"
            suffix="كم"
            prepend-inner-icon="mdi-speedometer"
            autofocus
            hint="أدخل قراءة أعلى من العداد الحالي؛ لن تُسجّل قراءة مكررة."
            persistent-hint
            :disabled="savingOdometer"
          ></v-text-field>
          <v-textarea
            v-model="odometerNotes"
            label="ملاحظات (اختياري)"
            rows="2"
            class="mt-2"
            :disabled="savingOdometer"
          ></v-textarea>

          <v-divider class="my-3"></v-divider>
          <div class="d-flex align-center justify-space-between mb-1">
            <div class="text-subtitle-2 font-weight-bold">آخر القراءات</div>
            <span v-if="odometerSourceState === 'loading'" class="text-caption text-medium-emphasis">جارٍ التحميل</span>
            <span v-else-if="odometerSourceState === 'unavailable'" class="text-caption text-medium-emphasis">غير متاح</span>
            <span v-else class="text-caption text-medium-emphasis">{{ odometerHistory.length }}</span>
          </div>
          <div v-if="odometerSourceState === 'loading'" class="py-2" role="status" aria-live="polite">
            <v-skeleton-loader type="list-item-two-line, list-item-two-line"></v-skeleton-loader>
            <span class="sr-only">جارٍ تحميل سجل العداد</span>
          </div>
          <v-alert v-else-if="odometerSourceState === 'unavailable'" type="warning" variant="tonal" density="compact" role="alert">
            تعذر تحميل سجل العداد.
            <v-btn size="small" variant="text" :loading="odometerStore.loading" :disabled="odometerStore.loading" @click="odometerStore.fetchReadings()">إعادة المحاولة</v-btn>
          </v-alert>
          <v-list v-else-if="odometerHistory.length" density="compact" class="odometer-history-list pa-0">
            <v-list-item v-for="reading in odometerHistory" :key="reading.id" class="px-0">
              <v-list-item-title class="text-body-2 font-weight-medium">
                {{ formatOdometerRate(reading.reading) }} كم
              </v-list-item-title>
              <v-list-item-subtitle>
                {{ formatOdometerDate(reading.date) }}
                <span v-if="reading.excludeReason === 'same_day'"> · قراءة أخرى في اليوم نفسه</span>
                <span v-else-if="reading.excludeReason === 'odometer_decreased'"> · مستبعدة من حساب الاستخدام لانخفاض العداد</span>
                <span v-else-if="reading.excludeReason === 'invalid_reading'"> · قيمة غير صالحة، مستبعدة من التحليل</span>
                <span v-else-if="reading.excludeReason === 'invalid_date'"> · التاريخ غير صالح، مستبعدة من التحليل</span>
                <span v-else-if="reading.excludeReason === 'future_date'"> · تاريخ مستقبلي، مستبعدة من التحليل</span>
                <span v-else-if="reading.distanceSincePrevious !== null"> · +{{ formatOdometerRate(reading.distanceSincePrevious) }} كم منذ القراءة السابقة</span>
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
          <div v-else class="text-body-2 text-medium-emphasis py-2">
            لا توجد قراءات سابقة. ستظهر هنا بعد تسجيل قراءة العداد.
          </div>
          <v-alert v-if="odometerStore.insights.excludedReadings > 0" type="info" variant="tonal" density="compact" class="mt-2">
            استُبعدت {{ odometerStore.insights.excludedReadings }} قراءة غير مناسبة من حساب الاستخدام، دون حذفها.
          </v-alert>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" :disabled="savingOdometer" @click="showOdometerDialog = false">إلغاء</v-btn>
          <v-btn
            color="primary"
            :loading="savingOdometer"
            :disabled="savingOdometer || !newOdometerReading || newOdometerReading <= (carStore.car?.currentOdometer || 0)"
            @click="saveOdometerReading"
          >
            حفظ
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCarStore } from '@/stores/car'
import { useOdometerStore } from '@/stores/odometer'
import { useTasksStore } from '@/stores/tasks'
import { useRecordsStore } from '@/stores/records'
import { useDocumentsStore } from '@/stores/documents'
import { useProfileStore } from '@/stores/profile'
import dayjs from 'dayjs'
import 'dayjs/locale/ar'
import { readFileAsDataUrl, validateDataUrlFile } from '@/lib/data-url-upload'
import { normalizeKnownCostV1 } from '@/lib/maintenance-cost-insights-v1'
import {
  DASHBOARD_QUICK_ACTIONS_V1,
  buildDashboardActionsV1,
  getDashboardActionCenterStateV1,
  getDashboardCostSummaryV1,
  getDashboardDocumentsSummaryV1,
  getDashboardNextMaintenanceV1,
  getDashboardOdometerSummaryV1,
  getDashboardPrimaryStateV1,
  getDashboardSourceStateV1,
  getVisibleDashboardActionsV1
} from '@/lib/dashboard-actions-v1'

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
  // Ensure the Dashboard has document status data for its action center.
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

// Computed
const formattedDate = computed(() => dayjs().format('DD MMMM YYYY'))
const formattedOdometer = computed(() => {
  const value = carStore.car?.currentOdometer
  if (value === null || value === undefined || value === '') return '—'
  const number = Number(value)
  return Number.isFinite(number) ? number.toLocaleString('ar-SA') : '—'
})
const dashboardPrimaryState = computed(() => getDashboardPrimaryStateV1({
  hasCar: carStore.hasCar,
  loading: carStore.loading,
  error: carStore.error
}))
const carSourceState = computed(() => getDashboardSourceStateV1({
  loading: carStore.loading,
  error: carStore.error,
  hasData: carStore.hasCar
}))
const odometerHistory = computed(() => odometerStore.readingsWithDistance.slice(0, 5))
const odometerSourceState = computed(() => getDashboardSourceStateV1({
  loading: odometerStore.loading,
  error: odometerStore.error,
  hasData: odometerStore.readings.length > 0
}))
const lastOdometerUpdate = computed(() => {
  const date = odometerStore.latestReading?.date
  if (!date || !dayjs(date).isValid()) return null
  const days = Math.max(0, dayjs().startOf('day').diff(dayjs(date).startOf('day'), 'day'))
  if (days === 0) return 'اليوم'
  if (days === 1) return 'أمس'
  return `منذ ${days.toLocaleString('ar-SA')} يومًا`
})
const maintenanceSourceState = computed(() => getDashboardSourceStateV1({
  loading: tasksStore.loading,
  error: tasksStore.error,
  hasData: tasksStore.tasks.length > 0
}))
const documentsSourceState = computed(() => getDashboardSourceStateV1({
  loading: documentsStore.loading,
  error: documentsStore.error,
  hasData: documentsStore.documents.length > 0
}))
const recordsSourceState = computed(() => getDashboardSourceStateV1({
  loading: recordsStore.loading,
  error: recordsStore.error,
  hasData: recordsStore.records.length > 0
}))
const dashboardActions = computed(() => buildDashboardActionsV1({
  tasks: tasksStore.tasksWithStatus,
  documents: documentsStore.documentsWithStatus,
  maintenanceState: maintenanceSourceState.value,
  documentsState: documentsSourceState.value,
  odometerInsights: odometerStore.insights,
  latestOdometerDate: odometerStore.latestReading?.date
}))
const visibleDashboardActions = computed(() => getVisibleDashboardActionsV1(
  dashboardActions.value,
  showAllDashboardActions.value
))
const actionCenterState = computed(() => getDashboardActionCenterStateV1({
  actions: dashboardActions.value,
  maintenanceState: maintenanceSourceState.value,
  documentsState: documentsSourceState.value
}))
const quickActions = DASHBOARD_QUICK_ACTIONS_V1
const showAllDashboardActions = ref(false)
const odometerSummary = computed(() => {
  if (odometerSourceState.value === 'loading') return { state: 'loading', message: '' }
  if (odometerSourceState.value === 'unavailable') {
    return { state: 'unavailable', message: 'تعذر تحميل تفاصيل استخدام السيارة.' }
  }
  return getDashboardOdometerSummaryV1(odometerStore.insights)
})
const recentRecords = computed(() => recordsStore.recentRecords)
const documentsSummary = computed(() => getDashboardDocumentsSummaryV1({
  documents: documentsStore.documentsWithStatus,
  state: documentsSourceState.value
}))
const regulatoryStatus = computed(() => documentsStore.regulatoryStatus)
const nextMaintenance = computed(() => getDashboardNextMaintenanceV1({
  tasks: tasksStore.sortedTasks,
  state: maintenanceSourceState.value
}))
const costSummary = computed(() => getDashboardCostSummaryV1({
  insights: recordsStore.costInsights,
  latestRecord: recentRecords.value[0] || null,
  state: recordsSourceState.value
}))

function formatCount(value) {
  return Number(value).toLocaleString('ar-SA')
}

function actionSeverityColor(severity) {
  return { critical: 'error', warning: 'warning', info: 'info' }[severity] || 'primary'
}

function actionSourceIcon(source) {
  return { maintenance: 'mdi-wrench-clock', document: 'mdi-file-alert-outline', odometer: 'mdi-speedometer' }[source] || 'mdi-information-outline'
}

function formatDate(date) {
  return date && dayjs(date).isValid() ? dayjs(date).format('DD/MM/YYYY') : '—'
}

function formatMoney(value) {
  return Number(value).toLocaleString('ar-SA', { maximumFractionDigits: 2 })
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
const savingCar = ref(false)
const carDialogError = ref('')
const savingCarImage = ref(false)

function triggerImageUpload() { imageInput.value?.click() }
function triggerDialogImageUpload() { dialogImageInput.value?.click() }

async function handleImageUpload(event) {
  const file = event.target.files[0]
  if (!file || savingCarImage.value) return
  const validationError = await validateDataUrlFile(file)
  if (validationError) { showSnackbar(validationError, 'error'); return }
  savingCarImage.value = true
  try {
    const image = await readFileAsDataUrl(file)
    await carStore.updateCar({ image })
    showSnackbar('تم تحديث صورة السيارة')
  } catch {
    showSnackbar('تعذر حفظ الصورة. بقيت الصورة الحالية؛ أعد المحاولة.', 'error')
  } finally {
    savingCarImage.value = false
    event.target.value = ''
  }
}

async function handleDialogImageUpload(event) {
  const file = event.target.files[0]
  if (!file) return
  const validationError = await validateDataUrlFile(file)
  if (validationError) { carDialogError.value = validationError; return }
  try {
    carFormData.value.image = await readFileAsDataUrl(file)
    carDialogError.value = ''
  } catch (error) { carDialogError.value = error.message }
}

async function saveCar() {
  if (savingCar.value) return
  savingCar.value = true
  carDialogError.value = ''
  try {
    await carStore.addCar(carFormData.value)
    showCarDialog.value = false
    carFormData.value = { make: '', model: '', year: new Date().getFullYear(), plateNumber: '', color: '', initialOdometer: 0, notes: '', image: null }
    showSnackbar('تم إضافة السيارة بنجاح')
  } catch {
    carDialogError.value = 'تعذر حفظ السيارة. بقيت البيانات في النموذج؛ أعد المحاولة.'
  } finally { savingCar.value = false }
}

// Odometer Dialog
const showOdometerDialog = ref(false)
const newOdometerReading = ref(null)
const odometerNotes = ref('')
const savingOdometer = ref(false)
const odometerSaveError = ref('')

function openOdometerDialog() {
  odometerSaveError.value = ''
  showOdometerDialog.value = true
}

async function saveOdometerReading() {
  if (savingOdometer.value) return
  savingOdometer.value = true
  odometerSaveError.value = ''
  try {
    await odometerStore.addReading({ reading: newOdometerReading.value, notes: odometerNotes.value })
    showOdometerDialog.value = false
    newOdometerReading.value = null
    odometerNotes.value = ''
    showSnackbar('تم تحديث قراءة العداد')
  } catch {
    odometerSaveError.value = 'تعذر تأكيد تحديث قراءة العداد. تحقق من القراءة الحالية قبل إعادة المحاولة.'
  } finally {
    savingOdometer.value = false
  }
}

// Navigation
const router = useRouter()

function goToAddMaintenance() {
  router.push('/tasks')
}

function formatOdometerRate(value) {
  if (value === null || value === undefined || value === '') return '—'
  const number = Number(value)
  return Number.isFinite(number) ? number.toLocaleString('ar-SA', { maximumFractionDigits: 1 }) : '—'
}

function formatOdometerDate(value) {
  return value && dayjs(value).isValid() ? dayjs(value).format('DD/MM/YYYY') : 'تاريخ غير متاح'
}
</script>

<style scoped>
/* Welcome Card */
.welcome-card {
  background: linear-gradient(135deg, rgba(var(--v-theme-surface), 0.95), rgba(var(--v-theme-surface), 0.9));
  border: 1px solid rgba(var(--v-theme-primary), 0.1);
}

.needs-setup-card {
  border: 1px solid rgba(var(--v-theme-info), .32);
}

.needs-setup-icon {
  width: 48px;
  height: 48px;
  flex: 0 0 48px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: rgba(var(--v-theme-info), .12);
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

.odometer-history-list {
  max-height: 210px;
  overflow-y: auto;
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

.dashboard-action-item :deep(.v-list-item__content) {
  min-width: 0;
}

.dashboard-action-cta {
  max-width: 132px;
  white-space: normal;
  line-height: 1.25;
  text-align: center;
}

.glass-card {
  animation: fadeInUp 0.6s ease-out forwards;
  animation-delay: 0.2s;
}

/* Entry Animations (Unified) */
.animate-slide-up {
  opacity: 0;
}

/* Mobile Adjustments */
@media (max-width: 960px) {
  .dashboard {
    padding-bottom: 100px;
  }
  
  .v-row.gap-6 {
    gap: 24px !important;
  }

  .progress-label-mobile {
    position: absolute;
    right: 0;
    top: -24px;
    background: #222;
    padding: 2px 8px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: bold;
    color: #fff;
    border: 1px solid rgba(255,255,255,0.1);
  }

  .action-btn-mobile :deep(.v-btn__content) {
    font-size: 16px;
    font-weight: 700;
  }
}

@media (max-width: 600px) {
  .dashboard-action-item :deep(.v-list-item__append) {
    max-width: 104px;
    margin-inline-start: 4px;
  }

  .dashboard-action-cta {
    max-width: 100px;
    min-width: 0;
    padding-inline: 6px;
    font-size: 0.75rem;
  }
}
</style>
