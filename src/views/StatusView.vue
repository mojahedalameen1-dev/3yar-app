<template>
  <main class="status-unavailable">
    <v-card class="status-card pa-6 pa-sm-10 text-center" rounded="xl" elevation="2">
      <div class="status-icon mb-5">
        <v-icon size="38" color="primary">mdi-share-off-outline</v-icon>
      </div>
      <p class="text-overline text-primary mb-2">عيار</p>
      <h1 class="text-h5 font-weight-bold mb-3">المشاركة العامة غير متاحة حاليًا</h1>
      <p class="text-body-1 text-medium-emphasis mb-6">
        لا يمكن عرض بيانات السيارة عبر هذا الرابط. يمكنك استخدام عيار لإدارة بيانات سيارتك الخاصة.
      </p>
      <div class="d-flex flex-column flex-sm-row justify-center ga-3">
        <v-btn color="primary" to="/login">تسجيل الدخول</v-btn>
        <v-btn variant="outlined" to="/">الصفحة الرئيسية</v-btn>
      </div>
    </v-card>
  </main>
</template>

<style scoped>
.status-unavailable {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgb(var(--v-theme-background));
}

.status-card {
  width: min(100%, 520px);
}

.status-icon {
  width: 76px;
  height: 76px;
  display: grid;
  place-items: center;
  margin-inline: auto;
  border-radius: 24px;
  background: rgba(var(--v-theme-primary), 0.1);
}
</style>
