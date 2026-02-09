<!-- Redesigned Management Portal v2.0 - Full CRUD, PDF Support & Security -->
<template>
  <div class="management-portal rtl-layout">
    <v-layout class="full-height">
      <!-- Sidebar Navigation (RTL - Right Side) -->
      <v-navigation-drawer
        v-model="drawer"
        location="right"
        :permanent="!isMobile"
        :temporary="isMobile"
        width="280"
        class="admin-sidebar d-flex flex-column"
        elevation="0"
        border="0"
      >
        <!-- Header -->
        <div class="sidebar-header">
          <div class="d-flex align-center gap-3">
            <div class="logo-box">
              <v-icon size="24" color="white">mdi-shield-crown</v-icon>
            </div>
            <div>
              <div class="text-h6 font-weight-bold text-white ls-0">منصة الإدارة</div>
              <div class="text-caption text-cyan-lighten-3">Iyar Control Tower</div>
            </div>
          </div>
        </div>

        <!-- Navigation Menu -->
        <v-list nav class="sidebar-menu flex-grow-1">
          <v-list-item
            v-for="item in menuItems"
            :key="item.id"
            :value="item.id"
            :active="activeTab === item.id"
            @click="activeTab = item.id"
            class="menu-item mb-1"
            rounded="lg"
          >
            <template #prepend>
              <v-icon :icon="item.icon" size="20" class="me-2"></v-icon>
            </template>
            <v-list-item-title class="font-weight-medium">
              {{ item.title }}
            </v-list-item-title>
          </v-list-item>
        </v-list>

        <!-- Spacer to push footer to bottom -->
        <v-spacer></v-spacer>

        <!-- Footer Actions -->
        <div class="sidebar-footer">
          <v-divider class="mb-4 border-opacity-10"></v-divider>
          <v-btn
            block
            variant="tonal"
            color="cyan-accent-1"
            class="return-btn font-weight-bold"
            @click="returnToApp"
          >
            <v-icon start>mdi-arrow-right</v-icon>
            العودة للتطبيق
          </v-btn>
        </div>
      </v-navigation-drawer>

      <!-- Mobile Header (Premium Style) -->
      <v-app-bar v-if="isMobile" color="#000000" elevation="0" border="b" class="mobile-admin-header px-2">
        <v-app-bar-nav-icon variant="text" @click="drawer = !drawer"></v-app-bar-nav-icon>
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          عيار - لوحة الإدارة
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <!-- Theme Toggle -->
        <v-btn icon variant="text" size="small" color="amber" @click="toggleTheme">
           <v-icon>mdi-theme-light-dark</v-icon>
        </v-btn>
      </v-app-bar>

      <!-- Main Content Area -->
      <v-main class="admin-content" :class="{ 'bg-black': isMobile }">
        <v-container fluid :class="['fill-height align-start', isMobile ? 'pa-4 pb-16' : 'pa-6 pb-6']">
          
          <!-- Section Header -->
          <div class="section-header mb-6 d-flex flex-wrap align-center justify-space-between gap-4">
            <div class="flex-shrink-1" style="min-width: 0;">
              <h2 class="text-h4 font-weight-bold text-white mb-1 text-truncate">
                {{ currentMenuItem.title }}
              </h2>
              <p class="text-body-2 text-medium-emphasis">
                {{ currentMenuItem.subtitle }}
              </p>
            </div>
            
            <!-- Global Actions / Filters -->
            <div v-if="activeTab !== 'analytics'" class="d-flex gap-3 align-center flex-shrink-0 flex-wrap">
               <v-text-field
                v-model="globalSearch"
                prepend-inner-icon="mdi-magnify"
                label="بحث شامل..."
                variant="outlined"
                density="compact"
                hide-details
                class="search-bar"
                bg-color="rgba(255,255,255,0.05)"
                style="max-width: 300px; min-width: 200px"
              ></v-text-field>

              <!-- Create Buttons based on active tab -->
              <v-btn
                v-if="['users', 'cars', 'records', 'documents'].includes(activeTab)"
                color="cyan-accent-3"
                prepend-icon="mdi-plus"
                class="font-weight-bold"
                @click="openCreateDialog"
              >
                إضافة جديد
              </v-btn>
            </div>
          </div>

          <!-- DYNAMIC CONTENT VIEWS -->
          <v-window v-model="activeTab" class="flex-grow-1 w-100" transition="fade-transition">
            
            <!-- 1. ANALYTICS VIEW -->
            <v-window-item value="analytics">
              <div class="analytics-dashboard">
                <!-- KPI Cards -->
                <v-row class="mb-4" dense>
                  <v-col v-for="(stat, i) in kpiStats" :key="stat.title" cols="12" sm="6" lg="3">
                    <div :class="['animate-slide-up', isMobile ? 'surface-card pa-6' : 'kpi-card glass-panel h-100']" :style="{ animationDelay: `${0.1 * (i + 1)}s` }">
                      <div class="d-flex justify-space-between align-start mb-4">
                        <div class="kpi-icon-box" :class="stat.colorClass">
                          <v-icon color="white" size="24">{{ stat.icon }}</v-icon>
                        </div>
                        <span class="trend-badge" :class="stat.trend >= 0 ? 'positive' : 'negative'">
                          {{ stat.trend }}%
                          <v-icon size="12">{{ stat.trend >= 0 ? 'mdi-arrow-up' : 'mdi-arrow-down' }}</v-icon>
                        </span>
                      </div>
                      <div :class="['font-weight-bold text-white mb-1', isMobile ? 'stat-value-large' : 'text-h4']">
                        {{ stat.value }}
                      </div>
                      <div class="kpi-label text-caption text-medium-emphasis">
                        {{ stat.title }}
                      </div>
                    </div>
                  </v-col>
                </v-row>

                <!-- Charts Area -->
                <v-row :class="{ 'gap-6': isMobile }">
                  <v-col cols="12" lg="8">
                    <div :class="['animate-slide-up', isMobile ? 'surface-card pa-6' : 'glass-panel pa-4 fill-height']" style="animation-delay: 0.4s">
                      <div class="panel-title mb-4">
                        <v-icon color="cyan" class="me-2">mdi-chart-line</v-icon>
                        نمو المنصة
                      </div>
                      <div :style="{ height: isMobile ? '250px' : '300px' }">
                         <Line v-if="chartsReady" :data="growthChartData" :options="lineChartOptions" />
                      </div>
                    </div>
                  </v-col>
                  <v-col cols="12" lg="4">
                    <div :class="['animate-slide-up', isMobile ? 'surface-card pa-6' : 'glass-panel pa-4 fill-height']" style="animation-delay: 0.5s">
                      <div class="panel-title mb-4">
                        <v-icon color="pink" class="me-2">mdi-chart-pie</v-icon>
                        توزيع الماركات
                      </div>
                      <div :style="{ height: isMobile ? '250px' : '300px' }">
                        <Doughnut v-if="chartsReady" :data="brandChartData" :options="donutChartOptions" />
                      </div>
                    </div>
                  </v-col>
                </v-row>
              </div>
            </v-window-item>

            <!-- 2. USERS MANAGEMENT -->
            <v-window-item value="users">
              <div :class="['table-container', isMobile ? '' : 'glass-panel']">
                <!-- Empty State -->
                <div v-if="!filteredUsers.length" class="empty-state">
                  <v-icon size="64" color="grey-darken-2" aria-label="لا يوجد مستخدمين">mdi-account-off</v-icon>
                  <p class="text-body-1 text-grey mt-2">لا يوجد مستخدمين لعرضهم</p>
                </div>

                <!-- Desktop Table -->
                <v-data-table
                  v-else-if="!isMobile"
                  :headers="userHeaders"
                  :items="filteredUsers"
                  :search="globalSearch"
                  class="admin-table"
                  hover
                >
                  <template #item.profile="{ item }">
                    <div class="d-flex align-center gap-3 py-2">
                       <v-avatar color="surface-light" size="40">
                         <span class="text-h6 font-weight-bold text-primary">{{ getInitials(item) }}</span>
                       </v-avatar>
                       <div>
                         <div class="text-subtitle-2 font-weight-bold text-white">
                           {{ item.first_name }} {{ item.last_name }}
                         </div>
                         <div class="text-caption text-medium-emphasis">{{ item.email || 'No Email' }}</div>
                       </div>
                    </div>
                  </template>

                  <template #item.role="{ item }">
                    <v-chip
                      :color="item.role === 'admin' ? 'purple' : 'cyan'"
                      size="small"
                      variant="flat"
                    >
                      {{ item.role === 'admin' ? 'مدير نظام' : 'مستخدم' }}
                    </v-chip>
                  </template>

                   <template #item.actions="{ item }">
                    <div class="d-flex justify-end gap-2">
                      <v-btn icon variant="text" size="small" color="blue-lighten-3" @click="openEditUser(item)">
                        <v-icon>mdi-pencil</v-icon>
                      </v-btn>
                      <v-btn icon variant="text" size="small" color="red-lighten-3" @click="confirmDelete('user', item)">
                        <v-icon>mdi-delete</v-icon>
                      </v-btn>
                    </div>
                  </template>
                </v-data-table>

                <!-- Mobile List Cards with Pagination -->
                <v-data-iterator
                  v-else
                  :items="filteredUsers"
                  :items-per-page="5"
                  :search="globalSearch"
                >
                  <template v-slot:default="{ items }">
                    <div class="d-flex flex-column gap-4">
                      <div v-for="item in items" :key="item.raw.user_id" class="surface-card pa-4 animate-slide-up">
                        <div class="d-flex align-center justify-space-between mb-3">
                          <div class="d-flex align-center gap-3">
                            <v-avatar color="grey-darken-3" size="48">
                              <span class="text-h6 font-weight-bold text-white">{{ getInitials(item.raw) }}</span>
                            </v-avatar>
                            <div>
                              <div class="text-h6 font-weight-bold text-white">
                                {{ item.raw.first_name }} {{ item.raw.last_name }}
                              </div>
                              <v-chip
                                :color="item.raw.role === 'admin' ? 'purple' : 'cyan'"
                                size="x-small"
                                variant="tonal"
                                class="mt-1"
                              >
                                {{ item.raw.role === 'admin' ? 'مدير نظام' : 'مستخدم' }}
                              </v-chip>
                            </div>
                          </div>
                          <!-- Actions Menu -->
                          <v-menu>
                            <template v-slot:activator="{ props }">
                              <v-btn icon="mdi-dots-vertical" variant="text" color="grey" v-bind="props"></v-btn>
                            </template>
                            <v-list density="compact" class="bg-grey-darken-3">
                              <v-list-item @click="openEditUser(item.raw)" prepend-icon="mdi-pencil" title="تعديل"></v-list-item>
                              <v-list-item @click="confirmDelete('user', item.raw)" prepend-icon="mdi-delete" class="text-red" title="حذف"></v-list-item>
                            </v-list>
                          </v-menu>
                        </div>
                        
                        <div class="d-flex flex-column gap-2 mb-3">
                          <div class="d-flex align-center text-caption text-medium-emphasis">
                            <v-icon size="small" class="me-2">mdi-email</v-icon>
                            {{ item.raw.email || 'No Email' }}
                          </div>
                          <div class="d-flex align-center text-caption text-medium-emphasis">
                            <v-icon size="small" class="me-2">mdi-phone</v-icon>
                            {{ item.raw.phone || 'غير مسجل' }}
                          </div>
                        </div>

                        <v-btn
                          v-if="item.raw.phone"
                          block
                          color="success"
                          variant="tonal"
                          prepend-icon="mdi-whatsapp"
                          target="_blank"
                          :href="`https://wa.me/${item.raw.phone.replace(/\+/g, '')}`"
                          class="rounded-xl"
                        >
                          مراسلة واتساب
                        </v-btn>
                      </div>
                    </div>
                  </template>
                  <template v-slot:footer="{ page, pageCount, prevPage, nextPage }">
                    <div class="d-flex align-center justify-center gap-4 mt-4 text-white">
                      <v-btn icon="mdi-chevron-right" variant="text" :disabled="page === 1" @click="prevPage"></v-btn>
                      <span class="text-caption font-weight-bold">صفحة {{ page }} من {{ pageCount }}</span>
                      <v-btn icon="mdi-chevron-left" variant="text" :disabled="page === pageCount" @click="nextPage"></v-btn>
                    </div>
                  </template>
                </v-data-iterator>
              </div>
            </v-window-item>

            <!-- 3. CARS MANAGEMENT -->
            <v-window-item value="cars">
              <div :class="['table-container', isMobile ? '' : 'glass-panel']">
                <div v-if="!filteredCars.length" class="empty-state">
                  <v-icon size="64" color="grey-darken-2">mdi-car-off</v-icon>
                  <p class="text-body-1 text-grey mt-2">لا توجد سيارات مسجلة</p>
                </div>

                <!-- Desktop Table -->
                <v-data-table
                  v-else-if="!isMobile"
                  :headers="carHeaders"
                  :items="filteredCars"
                  :search="globalSearch"
                  class="admin-table"
                  hover
                >
                  <template #item.vehicle="{ item }">
                    <div class="d-flex align-center gap-3 py-2">
                      <v-avatar rounded="lg" color="grey-darken-3" size="48">
                         <v-img v-if="item.image" :src="item.image" cover></v-img>
                         <v-icon v-else icon="mdi-car" color="grey"></v-icon>
                      </v-avatar>
                      <div>
                        <div class="text-subtitle-2 font-weight-bold text-white">{{ item.make }} {{ item.model }}</div>
                        <div class="text-caption text-medium-emphasis">{{ item.year }} • {{ item.plate_number }}</div>
                      </div>
                    </div>
                  </template>

                  <template #item.owner="{ item }">
                    <div class="text-body-2">
                      {{ getUserName(item.user_id) }}
                    </div>
                  </template>

                   <template #item.odometer="{ item }">
                    <div class="font-weight-mono text-cyan-lighten-2">
                      {{ (item.current_odometer || 0).toLocaleString() }} km
                    </div>
                  </template>

                  <template #item.actions="{ item }">
                    <div class="d-flex justify-end gap-2">
                      <v-btn icon variant="text" size="small" color="blue-lighten-3" @click="openEditCar(item)">
                        <v-icon>mdi-pencil</v-icon>
                      </v-btn>
                      <v-btn icon variant="text" size="small" color="red-lighten-3" @click="confirmDelete('car', item)">
                        <v-icon>mdi-delete</v-icon>
                      </v-btn>
                    </div>
                  </template>
                </v-data-table>

                <!-- Mobile List Cards with Pagination -->
                <v-data-iterator
                  v-else
                  :items="filteredCars"
                  :items-per-page="5"
                  :search="globalSearch"
                >
                  <template v-slot:default="{ items }">
                    <div class="d-flex flex-column gap-4">
                      <div v-for="item in items" :key="item.raw.id" class="surface-card pa-0 overflow-hidden animate-slide-up">
                        <v-img
                          :src="item.raw.image || 'https://via.placeholder.com/300x150?text=No+Image'"
                          height="150"
                          cover
                          class="bg-grey-darken-4"
                        >
                          <div class="d-flex justify-end pa-2">
                            <v-menu>
                              <template v-slot:activator="{ props }">
                                <v-btn icon="mdi-dots-vertical" variant="tonal" color="white" size="small" v-bind="props" class="glass-panel"></v-btn>
                              </template>
                              <v-list density="compact" class="bg-grey-darken-3">
                                <v-list-item @click="openEditCar(item.raw)" prepend-icon="mdi-pencil" title="تعديل"></v-list-item>
                                <v-list-item @click="confirmDelete('car', item.raw)" prepend-icon="mdi-delete" class="text-red" title="حذف"></v-list-item>
                              </v-list>
                            </v-menu>
                          </div>
                        </v-img>
                        
                        <div class="pa-4">
                          <div class="d-flex justify-space-between align-center mb-2">
                            <h3 class="text-h6 font-weight-bold text-white">{{ item.raw.make }} {{ item.raw.model }}</h3>
                            <v-chip size="small" color="primary">{{ item.raw.year }}</v-chip>
                          </div>
                          
                          <div class="d-flex align-center gap-2 mb-3">
                            <v-chip size="small" variant="outlined" color="grey">{{ item.raw.plate_number }}</v-chip>
                            <div class="text-caption text-cyan-lighten-2 font-weight-bold">
                               {{ (item.raw.current_odometer || 0).toLocaleString() }} كم
                            </div>
                          </div>

                          <v-divider class="mb-3 border-opacity-10"></v-divider>
                          
                          <div class="d-flex align-center text-caption text-medium-emphasis">
                            <v-icon size="small" class="me-2">mdi-account</v-icon>
                            المالك: {{ getUserName(item.raw.user_id) }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </template>
                  <template v-slot:footer="{ page, pageCount, prevPage, nextPage }">
                     <div class="d-flex align-center justify-center gap-4 mt-4 text-white">
                      <v-btn icon="mdi-chevron-right" variant="text" :disabled="page === 1" @click="prevPage"></v-btn>
                      <span class="text-caption font-weight-bold">صفحة {{ page }} من {{ pageCount }}</span>
                      <v-btn icon="mdi-chevron-left" variant="text" :disabled="page === pageCount" @click="nextPage"></v-btn>
                    </div>
                  </template>
                </v-data-iterator>
              </div>
            </v-window-item>

            <!-- 4. RECORDS MANAGEMENT -->
            <v-window-item value="records">
              <div :class="['table-container', isMobile ? '' : 'glass-panel']">
                <div v-if="!filteredRecords.length" class="empty-state">
                  <v-icon size="64" color="grey-darken-2">mdi-file-remove</v-icon>
                  <p class="text-body-1 text-grey mt-2">لا توجد سجلات صيانة</p>
                </div>

                <!-- Desktop Table -->
                <v-data-table
                  v-else-if="!isMobile"
                  :headers="recordHeaders"
                  :items="filteredRecords"
                  :search="globalSearch"
                  class="admin-table"
                  hover
                >
                  <template #item.task="{ item }">
                     <div class="d-flex align-center gap-2">
                       <v-icon color="orange-accent-2" size="small">mdi-wrench</v-icon>
                       <span class="text-white font-weight-medium">{{ item.task_name }}</span>
                     </div>
                  </template>

                  <template #item.cost="{ item }">
                    <span class="text-green-accent-3 font-weight-bold">
                      {{ (item.cost || 0).toLocaleString() }} SAR
                    </span>
                  </template>

                  <template #item.date="{ item }">
                    {{ formatDate(item.date) }}
                  </template>

                  <template #item.actions="{ item }">
                    <div class="d-flex justify-end gap-2">
                      <v-btn icon variant="text" size="small" color="blue-lighten-3" @click="openEditRecord(item)">
                        <v-icon>mdi-pencil</v-icon>
                      </v-btn>
                      <v-btn icon variant="text" size="small" color="red-lighten-3" @click="confirmDelete('record', item)">
                        <v-icon>mdi-delete</v-icon>
                      </v-btn>
                    </div>
                  </template>
                </v-data-table>

                <!-- Mobile List Cards with Pagination -->
                <v-data-iterator
                  v-else
                  :items="filteredRecords"
                  :items-per-page="5"
                  :search="globalSearch"
                >
                  <template v-slot:default="{ items }">
                    <div class="d-flex flex-column gap-3">
                      <div v-for="item in items" :key="item.raw.id" class="surface-card pa-4 animate-slide-up">
                        <div class="d-flex justify-space-between align-start mb-2">
                          <div class="d-flex align-center gap-3">
                             <div class="kpi-icon-box bg-orange-gradient" style="width: 40px; height: 40px;">
                               <v-icon color="white" size="20">mdi-wrench</v-icon>
                             </div>
                             <div>
                                <div class="text-subtitle-1 font-weight-bold text-white">{{ item.raw.task_name }}</div>
                                <div class="text-caption text-medium-emphasis">{{ formatDate(item.raw.date) }}</div>
                             </div>
                          </div>
                          <div class="text-end">
                             <div class="text-h6 font-weight-bold text-green-accent-3">{{ (item.raw.cost || 0).toLocaleString() }}</div>
                             <div class="text-caption text-medium-emphasis">SAR</div>
                          </div>
                        </div>
                        
                        <div class="d-flex align-center justify-space-between mt-3 pt-3 border-t border-opacity-10">
                           <div class="text-caption text-medium-emphasis">
                             <v-icon size="small" class="me-1">mdi-map-marker</v-icon>
                             {{ item.raw.service_center || 'مركز غير محدد' }}
                           </div>
                           <div class="d-flex gap-2">
                              <v-btn icon="mdi-pencil" variant="text" size="small" density="comfortable" color="blue" @click="openEditRecord(item.raw)"></v-btn>
                              <v-btn icon="mdi-delete" variant="text" size="small" density="comfortable" color="red" @click="confirmDelete('record', item.raw)"></v-btn>
                           </div>
                        </div>
                      </div>
                    </div>
                  </template>
                  <template v-slot:footer="{ page, pageCount, prevPage, nextPage }">
                     <div class="d-flex align-center justify-center gap-4 mt-4 text-white">
                      <v-btn icon="mdi-chevron-right" variant="text" :disabled="page === 1" @click="prevPage"></v-btn>
                      <span class="text-caption font-weight-bold">صفحة {{ page }} من {{ pageCount }}</span>
                      <v-btn icon="mdi-chevron-left" variant="text" :disabled="page === pageCount" @click="nextPage"></v-btn>
                    </div>
                  </template>
                </v-data-iterator>
              </div>
            </v-window-item>

             <!-- 5. DOCUMENTS MANAGEMENT -->
            <v-window-item value="documents">
              <div :class="['table-container', isMobile ? '' : 'glass-panel']">
                 <div v-if="!filteredDocs.length" class="empty-state">
                  <v-icon size="64" color="grey-darken-2">mdi-file-document-alert</v-icon>
                  <p class="text-body-1 text-grey mt-2">لا توجد وثائق محفوظة</p>
                </div>

                <!-- Desktop Table -->
                <v-data-table
                  v-else-if="!isMobile"
                  :headers="docHeaders"
                  :items="filteredDocs"
                  :search="globalSearch"
                  class="admin-table"
                  hover
                >
                  <template #item.type="{ item }">
                     <v-chip :color="getDocColor(item.type)" size="small" variant="tonal" class="font-weight-bold">
                       {{ item.type }}
                     </v-chip>
                  </template>

                  <template #item.preview="{ item }">
                    <v-btn 
                      v-if="item.image" 
                      variant="text" 
                      size="small" 
                      color="cyan-accent-2"
                      prepend-icon="mdi-eye"
                      @click="viewDocument(item)"
                    >
                      عرض
                    </v-btn>
                    <span v-else class="text-caption text-grey">لا يوجد ملف</span>
                  </template>

                   <template #item.actions="{ item }">
                    <div class="d-flex justify-end gap-2">
                      <v-btn icon variant="text" size="small" color="red-lighten-3" @click="confirmDelete('document', item)">
                        <v-icon>mdi-delete</v-icon>
                      </v-btn>
                    </div>
                  </template>
                </v-data-table>

                 <!-- Mobile List Cards with Pagination -->
                 <v-data-iterator
                   v-else
                   :items="filteredDocs"
                   :items-per-page="5"
                   :search="globalSearch"
                 >
                   <template v-slot:default="{ items }">
                     <div class="d-flex flex-column gap-3">
                       <div v-for="item in items" :key="item.raw.id" class="surface-card pa-4 animate-slide-up">
                          <div class="d-flex justify-space-between align-center mb-3">
                             <div class="d-flex align-center gap-3">
                                <v-icon :color="getDocColor(item.raw.type)" size="28">mdi-file-document</v-icon>
                                 <div>
                                   <div class="text-subtitle-1 font-weight-bold text-white">{{ item.raw.type }}</div>
                                   <div class="text-caption text-medium-emphasis">
                                     ينتهي: {{ item.raw.expiry_date ? formatDate(item.raw.expiry_date) : 'غير محدد' }}
                                   </div>
                                 </div>
                             </div>
                             <v-chip size="small" :color="getDocColor(item.raw.type)" variant="tonal">
                                {{ dayjs(item.raw.expiry_date).fromNow() }}
                             </v-chip>
                          </div>

                          <div class="d-flex gap-2">
                             <v-btn 
                                block 
                                color="cyan-accent-3" 
                                variant="tonal" 
                                class="flex-grow-1 rounded-lg"
                                prepend-icon="mdi-eye"
                                :disabled="!item.raw.image"
                                @click="viewDocument(item.raw)"
                              >
                                عرض الوثيقة
                              </v-btn>
                              <v-btn
                                 icon="mdi-delete"
                                 variant="tonal"
                                 color="red-accent-2"
                                 class="rounded-lg"
                                 @click="confirmDelete('document', item.raw)"
                              ></v-btn>
                          </div>
                       </div>
                     </div>
                   </template>
                   <template v-slot:footer="{ page, pageCount, prevPage, nextPage }">
                      <div class="d-flex align-center justify-center gap-4 mt-4 text-white">
                       <v-btn icon="mdi-chevron-right" variant="text" :disabled="page === 1" @click="prevPage"></v-btn>
                       <span class="text-caption font-weight-bold">صفحة {{ page }} من {{ pageCount }}</span>
                       <v-btn icon="mdi-chevron-left" variant="text" :disabled="page === pageCount" @click="nextPage"></v-btn>
                     </div>
                   </template>
                 </v-data-iterator>
              </div>
            </v-window-item>

            <!-- 6. SYSTEM SETTINGS (Unchanged mostly) -->
            <v-window-item value="settings">
              <v-row>
                <!-- Broadcast Settings -->
                <v-col cols="12" md="8" class="mx-auto">
                  <div class="glass-panel pa-6">
                    <div class="panel-title mb-4">
                      <v-icon color="red" class="me-2">mdi-broadcast</v-icon>
                      بث الإشعارات
                    </div>
                    <v-form @submit.prevent="sendAnnouncement">
                      <v-text-field
                        v-model="announcementForm.title"
                        label="عنوان الإشعار *"
                        variant="outlined"
                        bg-color="rgba(255,255,255,0.03)"
                        :rules="[v => !!v || 'العنوان مطلوب']"
                        class="mb-4"
                        required
                      ></v-text-field>
                      <v-textarea
                        v-model="announcementForm.message"
                        label="نص الرسالة *"
                        rows="3"
                        variant="outlined"
                        bg-color="rgba(255,255,255,0.03)"
                        :rules="[v => !!v || 'نص الرسالة مطلوب']"
                        class="mb-4"
                        required
                      ></v-textarea>
                      <v-select
                        v-model="announcementForm.type"
                        :items="announcementTypeOptions"
                        item-title="label"
                        item-value="value"
                        label="نوع التنبيه *"
                        variant="outlined"
                        bg-color="rgba(255,255,255,0.03)"
                        :rules="[v => !!v || 'نوع التنبيه مطلوب']"
                        class="mb-6"
                        required
                      ></v-select>
                      
                      <v-card-actions class="pa-0">
                        <v-btn color="red-accent-2" block size="large" type="submit" :loading="sendingAnnouncement" class="font-weight-bold">
                          إرسال للجميع
                        </v-btn>
                      </v-card-actions>
                    </v-form>
                  </div>
                </v-col>

              </v-row>
            </v-window-item>

          </v-window>
        </v-container>
      </v-main>
    </v-layout>

    <!-- Generic Delete Dialog -->
    <v-dialog v-model="deleteDialog.show" max-width="400">
      <v-card color="#1e1e24" class="border-thin">
        <v-card-title class="text-h6 text-red-accent-2">
          <v-icon start>mdi-alert-circle</v-icon>
          تأكيد الحذف
        </v-card-title>
        <v-card-text>
          هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="deleteDialog.show = false">إلغاء</v-btn>
          <v-btn color="red-accent-2" variant="flat" @click="executeDelete" :loading="deleteDialog.loading">حذف نهائي</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- CREATE / EDIT DIALOGS -->
    
    <!-- User Create/Edit Dialog -->
    <v-dialog v-model="userDialog.show" max-width="500">
      <v-card :title="userDialog.isEdit ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'" color="#1e1e24">
        <v-card-text>
          <v-text-field v-model="userDialog.data.user_id" label="User ID (من سوبابيس)" hint="قم بنسخ الـ ID من لوحة تحكم Supabase Auth" persistent-hint class="mb-2" v-if="!userDialog.isEdit"></v-text-field>
          <v-row dense>
             <v-col cols="6">
               <v-text-field v-model="userDialog.data.first_name" label="الاسم الأول"></v-text-field>
             </v-col>
             <v-col cols="6">
               <v-text-field v-model="userDialog.data.last_name" label="الاسم الأخير"></v-text-field>
             </v-col>
          </v-row>
          <v-text-field v-model="userDialog.data.phone" label="رقم الهاتف" class="mb-2"></v-text-field>
          <v-text-field v-model="userDialog.data.email" label="البريد الإلكتروني"></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="userDialog.show = false">إلغاء</v-btn>
          <v-btn color="primary" @click="saveUser" :loading="userDialog.loading">حفظ</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

     <!-- Car Create/Edit Dialog -->
    <v-dialog v-model="carDialog.show" max-width="500">
      <v-card :title="carDialog.isEdit ? 'تعديل السيارة' : 'إضافة سيارة جديدة'" color="#1e1e24">
        <v-card-text>
          <v-select
              v-if="!carDialog.isEdit"
              v-model="carDialog.data.user_id"
              :items="adminStore.users"
              item-title="first_name"
              item-value="user_id"
              label="المالك"
              class="mb-2"
          >
             <template v-slot:item="{ props, item }">
               <v-list-item v-bind="props" :subtitle="item.raw.email"></v-list-item>
             </template>
          </v-select>
          <v-row dense>
            <v-col cols="6"><v-text-field v-model="carDialog.data.make" label="الشركة المصنعة"></v-text-field></v-col>
            <v-col cols="6"><v-text-field v-model="carDialog.data.model" label="الموديل"></v-text-field></v-col>
          </v-row>
          <v-row dense>
            <v-col cols="6"><v-text-field v-model="carDialog.data.year" label="السنة" type="number"></v-text-field></v-col>
            <v-col cols="6"><v-text-field v-model="carDialog.data.plate_number" label="رقم اللوحة"></v-text-field></v-col>
          </v-row>
          <v-text-field v-model="carDialog.data.current_odometer" label="قراءة العداد الحالية" type="number"></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="carDialog.show = false">إلغاء</v-btn>
          <v-btn color="primary" @click="saveCar" :loading="carDialog.loading">حفظ</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    
    <!-- Record Create/Edit Dialog -->
    <v-dialog v-model="recordDialog.show" max-width="500">
        <v-card :title="recordDialog.isEdit ? 'تعديل السجل' : 'إضافة سجل صيانة'" color="#1e1e24">
            <v-card-text>
                <!-- Select User Logic Wrapper -->
                <v-select
                  v-if="!recordDialog.isEdit"
                  v-model="recordDialog.data.user_id"
                  :items="adminStore.users"
                  item-title="first_name"
                  item-value="user_id"
                  label="المستخدم"
                  class="mb-2"
                ></v-select>

                <v-select
                   v-if="!recordDialog.isEdit"
                   v-model="recordDialog.data.car_id"
                   :items="availableCars"
                   item-title="model"
                   item-value="id"
                   label="السيارة"
                   class="mb-2"
                   :disabled="!recordDialog.data.user_id"
                ></v-select>

                <v-text-field v-model="recordDialog.data.task_name" label="اسم المهمة" class="mb-2"></v-text-field>
                <v-row dense>
                   <v-col cols="6"><v-text-field v-model="recordDialog.data.cost" label="التكلفة" type="number"></v-text-field></v-col>
                   <v-col cols="6"><v-text-field v-model="recordDialog.data.date" label="التاريخ" type="date"></v-text-field></v-col>
                </v-row>
                <v-text-field v-model="recordDialog.data.service_center" label="مركز الخدمة" class="mb-2"></v-text-field>
                <v-textarea v-model="recordDialog.data.notes" label="ملاحظات" rows="2"></v-textarea>
            </v-card-text>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn @click="recordDialog.show = false">إلغاء</v-btn>
                <v-btn color="primary" @click="saveRecord" :loading="recordDialog.loading">حفظ</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

    <!-- Document Create Dialog -->
    <v-dialog v-model="docDialog.show" max-width="500">
        <v-card title="رفع وثيقة جديدة" color="#1e1e24">
            <v-card-text>
                <v-select
                  v-model="docDialog.data.user_id"
                  :items="adminStore.users"
                  item-title="first_name"
                  item-value="user_id"
                  label="المستخدم"
                  class="mb-2"
                ></v-select>

                <v-select
                   v-model="docDialog.data.car_id"
                   :items="docAvailableCars"
                   item-title="model"
                   item-value="id"
                   label="السيارة"
                   class="mb-2"
                   :disabled="!docDialog.data.user_id"
                ></v-select>

                <v-select
                  v-model="docDialog.data.type"
                  :items="['استمارة', 'تأمين', 'فحص', 'رخصة', 'أخرى']"
                  label="نوع الوثيقة"
                  class="mb-2"
                ></v-select>
                
                <v-text-field v-model="docDialog.data.expiry_date" label="تاريخ الانتهاء" type="date" class="mb-4"></v-text-field>
                
                <v-file-input
                  v-model="docDialog.file"
                  label="ملف الوثيقة (صورة أو PDF)"
                  prepend-icon="mdi-camera"
                  accept="image/*,application/pdf"
                  variant="outlined"
                ></v-file-input>
            </v-card-text>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn @click="docDialog.show = false">إلغاء</v-btn>
                <v-btn color="primary" @click="saveDocument" :loading="docDialog.loading">رفع</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

    <!-- Document Viewer (Enhanced) -->
    <v-dialog v-model="docViewer.show" fullscreen transition="dialog-bottom-transition">
       <v-card class="bg-black">
         <v-toolbar color="surface" density="compact">
            <v-btn icon="mdi-close" @click="docViewer.show = false"></v-btn>
            <v-toolbar-title>معاينة الوثيقة</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn color="primary" variant="text" :href="docViewer.url" target="_blank" prepend-icon="mdi-download">تحميل</v-btn>
         </v-toolbar>
         <v-progress-linear v-if="docViewer.loading" indeterminate color="cyan-accent-3" absolute bottom></v-progress-linear>
         <div class="d-flex align-center justify-center fill-height bg-grey-darken-4 pa-4">
             <!-- PDF Viewer Check -->
             <iframe 
               v-if="isPdf(docViewer.url)" 
               :src="docViewer.url"
               width="100%" 
               height="100%" 
               frameborder="0"
               @load="docViewer.loading = false"
             ></iframe>
             <v-img 
                v-else 
                :src="docViewer.url" 
                contain 
                max-height="90vh"
                @load="docViewer.loading = false"
             ></v-img>
         </div>
       </v-card>
    </v-dialog>

     <!-- Global Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" location="top" timeout="3000">
       <v-icon start>{{ snackbar.color === 'success' ? 'mdi-check-circle' : 'mdi-alert' }}</v-icon>
       {{ snackbar.text }}
    </v-snackbar>

    <!-- Admin Bottom Navigation -->
    <v-bottom-navigation
      v-if="isMobile"
      v-model="activeTab"
      bg-color="#000000"
      active-color="cyan-accent-3"
      grow
      class="mobile-admin-bottom-nav"
    >
      <v-btn value="analytics">
        <v-icon>mdi-chart-areaspline</v-icon>
        <span>الإحصائيات</span>
      </v-btn>
      <v-btn value="users">
        <v-icon>mdi-account-group</v-icon>
        <span>المستخدمين</span>
      </v-btn>
      <v-btn value="cars">
        <v-icon>mdi-car</v-icon>
        <span>السيارات</span>
      </v-btn>
      <v-btn value="settings">
        <v-icon>mdi-cog</v-icon>
        <span>الإعدادات</span>
      </v-btn>
    </v-bottom-navigation>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminStore } from '@/stores/admin'
import { useThemeStore } from '@/stores/theme'
import { Doughnut, Line } from 'vue-chartjs'
import { useDisplay } from 'vuetify'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler
} from 'chart.js'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/ar'

dayjs.extend(relativeTime)
dayjs.locale('ar')
ChartJS.register(Title, Tooltip, Legend, ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Filler)

const router = useRouter()
const adminStore = useAdminStore()
const themeStore = useThemeStore()
const { mobile } = useDisplay()

const isMobile = computed(() => mobile.value)

function toggleTheme() {
  themeStore.toggleTheme()
}
// State
const drawer = ref(true) // Sidebar toggle
const activeTab = ref('analytics')
const globalSearch = ref('')
const chartsReady = ref(false)
const snackbar = ref({ show: false, text: '', color: 'success' })
const sendingAnnouncement = ref(false)

// Combined Create/Edit Dialogs State
const deleteDialog = ref({ show: false, loading: false, type: null, item: null })
const userDialog = ref({ show: false, loading: false, isEdit: false, data: {} })
const carDialog = ref({ show: false, loading: false, isEdit: false, data: {} })
const recordDialog = ref({ show: false, loading: false, isEdit: false, data: {} })
const docDialog = ref({ show: false, loading: false, data: {}, file: null })
const docViewer = ref({ show: false, url: null })

// Announcement Form
const announcementForm = ref({ title: '', message: '', type: 'info' })
const announcementTypeOptions = [
  { value: 'info', label: 'تنبيه' },
  { value: 'warning', label: 'تحذير' },
  { value: 'success', label: 'نجاح' },
  { value: 'error', label: 'خطأ' }
]

// --- Navigation ---
const menuItems = [
  { id: 'analytics', title: 'الإحصائيات', subtitle: 'نظرة عامة على النظام', icon: 'mdi-chart-areaspline' },
  { id: 'users', title: 'إدارة المستخدمين', subtitle: 'التحكم في حسابات العملاء', icon: 'mdi-account-group' },
  { id: 'cars', title: 'إدارة السيارات', subtitle: 'سجل المركبات المسجلة', icon: 'mdi-car-multiple' },
  { id: 'records', title: 'سجلات الصيانة', subtitle: 'أرشيف العمليات', icon: 'mdi-history' },
  { id: 'documents', title: 'إدارة الوثائق', subtitle: 'المستندات والمرفقات', icon: 'mdi-file-document-multiple' },
  { id: 'settings', title: 'إعدادات النظام', subtitle: 'التكوين والبث', icon: 'mdi-cog' },
]

const currentMenuItem = computed(() => 
  menuItems.find(i => i.id === activeTab.value) || menuItems[0]
)

// --- Search & Filtering ---
const filteredUsers = computed(() => {
  if (!globalSearch.value) return adminStore.users
  const q = globalSearch.value.toLowerCase()
  return adminStore.users.filter(u => 
    u.first_name?.toLowerCase().includes(q) || 
    u.last_name?.toLowerCase().includes(q) ||
    u.phone?.includes(q) ||
    u.email?.toLowerCase().includes(q)
  )
})

const filteredCars = computed(() => {
  if (!globalSearch.value) return adminStore.cars
  const q = globalSearch.value.toLowerCase()
  return adminStore.cars.filter(c => 
    c.make?.toLowerCase().includes(q) || 
    c.model?.toLowerCase().includes(q) || 
    c.plate_number?.includes(q)
  )
})

const filteredRecords = computed(() => {
  if (!globalSearch.value) return adminStore.records
  const q = globalSearch.value.toLowerCase()
  return adminStore.records.filter(r => 
    r.task_name?.toLowerCase().includes(q) ||
    r.invoice_number?.includes(q)
  )
})

const filteredDocs = computed(() => {
   if (!globalSearch.value) return adminStore.documents
   const q = globalSearch.value.toLowerCase()
   return adminStore.documents.filter(d => 
     d.type?.toLowerCase().includes(q)
   )
})

// --- Computed Helpers for Selects ---
const availableCars = computed(() => {
    return adminStore.cars.filter(c => c.user_id === recordDialog.value.data.user_id)
})
const docAvailableCars = computed(() => {
    return adminStore.cars.filter(c => c.user_id === docDialog.value.data.user_id)
})

// --- Data Headers ---
const userHeaders = [
  { title: 'الملف الشخصي', key: 'profile', align: 'start' },
  { title: 'الدور', key: 'role', align: 'start' },
  { title: 'الهاتف', key: 'phone', align: 'start' },
  { title: 'تاريخ الانضمام', key: 'created_at', align: 'end' },
  { title: 'إجراءات', key: 'actions', align: 'end', sortable: false },
]

const carHeaders = [
  { title: 'المركبة', key: 'vehicle', align: 'start' },
  { title: 'المالك', key: 'owner', align: 'start' },
  { title: 'العداد', key: 'odometer', align: 'end' },
  { title: 'إجراءات', key: 'actions', align: 'end', sortable: false },
]

const recordHeaders = [
  { title: 'المهمة', key: 'task', align: 'start' },
  { title: 'التكلفة', key: 'cost', align: 'start' },
  { title: 'التاريخ', key: 'date', align: 'end' },
  { title: 'المكان', key: 'service_center', align: 'end' },
  { title: 'إجراءات', key: 'actions', align: 'end', sortable: false },
]

const docHeaders = [
  { title: 'النوع', key: 'type', align: 'start' },
  { title: 'تاريخ الانتهاء', key: 'expiry_date', align: 'start' },
  { title: 'المعاينة', key: 'preview', align: 'center' },
  { title: 'إجراءات', key: 'actions', align: 'end', sortable: false },
]

// --- Charts Data ---
const kpiStats = computed(() => [
  { 
    title: 'إجمالي المستخدمين', 
    value: adminStore.analytics.totalUsers.toLocaleString(), 
    icon: 'mdi-account-group', 
    colorClass: 'bg-cyan-gradient',
    trend: 12 
  },
  { 
    title: 'السيارات المسجلة', 
    value: adminStore.analytics.totalCars.toLocaleString(), 
    icon: 'mdi-car', 
    colorClass: 'bg-pink-gradient', 
    trend: 8 
  },
  { 
    title: 'عمليات الصيانة', 
    value: adminStore.analytics.totalRecords.toLocaleString(), 
    icon: 'mdi-wrench', 
    colorClass: 'bg-orange-gradient',
    trend: -2 
  },
  { 
    title: 'إجمالي التكاليف', 
    value: adminStore.analytics.totalCost.toLocaleString() + ' ر.س', 
    icon: 'mdi-cash', 
    colorClass: 'bg-green-gradient',
    trend: 5 
  },
])

const growthChartData = computed(() => ({
    labels: adminStore.analytics.userGrowth.map(d => dayjs(d.date).format('DD/MM')),
    datasets: [{
       label: 'مستخدمين جدد',
       data: adminStore.analytics.userGrowth.map(d => d.count),
       borderColor: '#00BCD4',
       backgroundColor: 'rgba(0, 188, 212, 0.1)',
       fill: true,
       tension: 0.4
    }]
}))

const brandChartData = computed(() => ({
    labels: Object.keys(adminStore.analytics.brandDistribution),
    datasets: [{
      data: Object.values(adminStore.analytics.brandDistribution),
      backgroundColor: ['#00BCD4', '#E91E63', '#FFC107', '#4CAF50', '#9C27B0'],
      borderWidth: 0
    }]
}))

const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)' } },
    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)' } }
  }
}

const donutChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'right', labels: { color: 'white', padding: 20 } } }
}

// --- Logic ---

function returnToApp() {
  router.push({ name: 'dashboard' })
}

function getInitials(user) {
  return ((user.first_name?.[0] || '') + (user.last_name?.[0] || '')).toUpperCase()
}

function getUserName(userId) {
  const u = adminStore.getUserById(userId)
  return u ? `${u.first_name} ${u.last_name}` : 'غير معروف'
}

function formatDate(date) {
  return dayjs(date).format('DD/MM/YYYY')
}

// --- Unified Open Create Dialog ---
function openCreateDialog() {
    if (activeTab.value === 'users') {
        userDialog.value = { show: true, isEdit: false, data: {}, loading: false }
    } else if (activeTab.value === 'cars') {
        carDialog.value = { show: true, isEdit: false, data: {}, loading: false }
    } else if (activeTab.value === 'records') {
        recordDialog.value = { show: true, isEdit: false, data: { date: new Date().toISOString().split('T')[0] }, loading: false }
    } else if (activeTab.value === 'documents') {
        docDialog.value = { show: true, loading: false, data: {}, file: null }
    }
}

// --- USER ACTIONS ---
function openEditUser(user) {
  userDialog.value = { show: true, isEdit: true, data: { ...user }, loading: false }
}
async function saveUser() {
    userDialog.value.loading = true
    let res
    if (userDialog.value.isEdit) {
        res = await adminStore.updateUser(userDialog.value.data.user_id, userDialog.value.data)
    } else {
        res = await adminStore.createUser(userDialog.value.data)
    }
    userDialog.value.loading = false
    if (res.success) {
        showSnack(userDialog.value.isEdit ? 'تم تحديث البيانات' : 'تم إضافة المستخدم')
        userDialog.value.show = false
    } else {
        showSnack(res.error || 'حدث خطأ', 'error')
    }
}

// --- CAR ACTIONS ---
function openEditCar(car) {
  carDialog.value = { show: true, isEdit: true, data: { ...car }, loading: false }
}
async function saveCar() {
    carDialog.value.loading = true
    let res
    if (carDialog.value.isEdit) {
        res = await adminStore.updateCar(carDialog.value.data.id, carDialog.value.data)
    } else {
        res = await adminStore.createCar(carDialog.value.data)
    }
    carDialog.value.loading = false
    if (res.success) {
        showSnack('تم حفظ السيارة بنجاح')
        carDialog.value.show = false
    } else {
        showSnack(res.error || 'حدث خطأ', 'error')
    }
}

// --- RECORD ACTIONS ---
function openEditRecord(record) {
    recordDialog.value = { show: true, isEdit: true, data: { ...record }, loading: false }
}
async function saveRecord() {
    recordDialog.value.loading = true
    let res
    if (recordDialog.value.isEdit) {
        res = await adminStore.updateRecord(recordDialog.value.data.id, recordDialog.value.data)
    } else {
        res = await adminStore.createRecord(recordDialog.value.data)
    }
    recordDialog.value.loading = false
    if (res.success) {
        showSnack('تم حفظ السجل بنجاح')
        recordDialog.value.show = false
    } else {
        showSnack('حدث خطأ', 'error')
    }
}

// --- DOC ACTIONS ---
async function saveDocument() {
    if (!docDialog.value.file) {
        showSnack('يرجى اختيار ملف', 'error'); return
    }
    docDialog.value.loading = true
    const res = await adminStore.createDocument(docDialog.value.data, docDialog.value.file[0])
    docDialog.value.loading = false
    if (res.success) {
        showSnack('تم رفع الوثيقة بنجاح')
        docDialog.value.show = false
    } else {
        showSnack('فشل الرفع', 'error')
    }
}

// --- PDF & Doc Viewer ---
function getDocColor(type) {
  const map = { 'استمارة': 'cyan', 'تأمين': 'green', 'فحص': 'orange' }
  return map[type] || 'grey'
}

function viewDocument(doc) {
  docViewer.value = { show: true, url: doc.image, loading: true }
}

function isPdf(url) {
    if (!url) return false
    return url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('application/pdf')
}

// --- DELETE ---
function confirmDelete(type, item) {
  deleteDialog.value = { show: true, type, item, loading: false }
}

async function executeDelete() {
  deleteDialog.value.loading = true
  const { type, item } = deleteDialog.value
  let res = { success: false }

  if (type === 'user') res = await adminStore.deleteUser(item.user_id)
  else if (type === 'car') res = await adminStore.deleteCar(item.id)
  else if (type === 'record') res = await adminStore.deleteRecord(item.id)
  else if (type === 'document') res = await adminStore.deleteDocument(item.id)

  deleteDialog.value.loading = false
  deleteDialog.value.show = false

  if (res.success) showSnack('تم الحذف بنجاح')
  else showSnack(res.error || 'فشلت عملية الحذف', 'error')
}

// --- SYSTEM ---
async function sendAnnouncement() {
  console.log('🔔 sendAnnouncement called with:', announcementForm.value)

  // Validation: All fields are mandatory
  if (!announcementForm.value.title || !announcementForm.value.message || !announcementForm.value.type) {
    console.error('❌ Validation failed - missing fields')
    showSnack('جميع الحقول إلزامية: العنوان، الرسالة، ونوع التنبيه', 'error')
    return
  }

  console.log('✅ Validation passed, sending to admin store...')
  sendingAnnouncement.value = true
  
  const res = await adminStore.postAnnouncement(announcementForm.value)
  
  console.log('📡 Response from postAnnouncement:', res)
  sendingAnnouncement.value = false
  
  if (res.success) {
    console.log('✅ Broadcast sent successfully!')
    showSnack('تم إرسال الإشعار بنجاح للجميع ✅')
    announcementForm.value = { title: '', message: '', type: 'info' }
  } else {
    console.error('❌ Broadcast failed:',  res.error)
    showSnack(res.error || 'فشل إرسال الإشعار. يرجى المحاولة مرة أخرى', 'error')
  }
}

function showSnack(text, color = 'success') {
  snackbar.value = { show: true, text, color }
}

// Lifecycle
onMounted(async () => {
  // STRICT SECURITY CHECK
  if (sessionStorage.getItem('adminKey') !== 'valid') {
    router.replace({ name: 'admin-login' })
    return
  }

  await adminStore.fetchAnalytics()
  setTimeout(() => chartsReady.value = true, 500)
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap');

.management-portal {
  font-family: 'Tajawal', sans-serif;
  background: #0f172a; /* Slate 900 */
  min-height: 100vh;
  color: white;
}

/* Sidebar Styles */
.admin-sidebar {
  background: #1e293b !important; /* Slate 800 */
  border-left: 1px solid rgba(255,255,255,0.05) !important;
  height: 100vh !important;
  max-height: 100vh !important;
  overflow: hidden !important;
}

.admin-sidebar :deep(.v-navigation-drawer__content) {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.sidebar-menu {
  overflow-y: auto;
  scrollbar-width: none; /* Firefox */
  flex-shrink: 1;
  min-height: 0;
}

.sidebar-menu::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}

.sidebar-header {
  padding: 24px;
  flex-shrink: 0;
}

.logo-box {
  width: 40px; 
  height: 40px;
  background: linear-gradient(135deg, #06b6d4, #3b82f6);
  border-radius: 12px;
  display: grid;
  place-items: center;
}

.menu-item {
  color: #94a3b8; /* Slate 400 */
}

.menu-item--active {
  background: rgba(6, 182, 212, 0.1);
  color: #22d3ee; /* Cyan 400 */
}

.sidebar-footer {
  padding: 20px;
  flex-shrink: 0;
}

/* Content Area */
.admin-content {
  background: #0f172a;
  min-height: 100vh;
  transition: padding-right 0.3s ease;
}

@media (min-width: 960px) {
  .admin-content {
    padding-right: 280px !important;
  }
}

/* Glass Panel Utilities */
.glass-panel {
  background: rgba(30, 41, 59, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

/* KPI Cards */
.kpi-card {
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.kpi-icon-box {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: grid;
  place-items: center;
}

.bg-cyan-gradient { background: linear-gradient(135deg, #06b6d4, #0ea5e9); }
.bg-pink-gradient { background: linear-gradient(135deg, #ec4899, #d946ef); }
.bg-orange-gradient { background: linear-gradient(135deg, #f97316, #ea580c); }
.bg-green-gradient { background: linear-gradient(135deg, #22c55e, #16a34a); }

.trend-badge {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 2px;
}
.trend-badge.positive { color: #4ade80; background: rgba(74, 222, 128, 0.1); }
.trend-badge.negative { color: #f87171; background: rgba(248, 113, 113, 0.1); }

  /* Table Styles */
  .table-container {
    overflow: hidden;
  }
  
  .admin-table {
    background: transparent;
    color: #e2e8f0;
  }
  
  .admin-table :deep(th) {
    background: rgba(30, 41, 59, 0.9);
    color: #94a3b8;
    font-weight: 600;
    border-bottom: 1px solid rgba(255,255,255,0.1);
  }
  
  .admin-table :deep(td) {
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  
  .admin-table :deep(tr:hover) {
    background: rgba(255,255,255,0.03);
  }

/* Entry Animations (Unified) */
.animate-slide-up {
  opacity: 0;
}

/* Mobile Adjustments */
@media (max-width: 960px) {
  .management-portal {
    background: #000000;
  }
  
  .v-row.gap-6 {
    gap: 24px !important;
  }

  .mobile-admin-header {
    background: rgba(0, 0, 0, 0.8) !important;
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
  }

  .mobile-admin-bottom-nav {
    border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
    backdrop-filter: blur(20px);
    height: 64px !important;
  }
}
</style>
