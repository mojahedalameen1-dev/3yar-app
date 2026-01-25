<template>
  <div class="landing-page">
    <!-- Header -->
    <header class="landing-header">
      <div class="container d-flex align-center justify-space-between py-4 px-4">
        <div class="logo d-flex align-center gap-3">
          <div class="logo-wrapper">
            <v-img :src="ayarLogo" width="40" height="40" contain></v-img>
          </div>
          <span class="logo-text">عيار</span>
        </div>
        <div class="header-actions d-flex gap-2">
          <v-btn variant="text" color="white" to="/login">
            دخول
          </v-btn>
          <v-btn color="primary" variant="flat" to="/register" class="px-6">
            ابدأ مجاناً
          </v-btn>
        </div>
      </div>
    </header>

    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-bg"></div>
      <div class="hero-content text-center px-4">
        <div class="hero-badge mx-auto mb-6">
          <v-icon color="primary" class="me-2">mdi-shield-check</v-icon>
          <span>منصة موثوقة لإدارة السيارات</span>
        </div>
        
        <h1 class="hero-title mb-4">
          <span class="text-primary">عيار:</span> رفيق سيارتك الذكي
        </h1>
        
        <p class="hero-subtitle mx-auto mb-8">
          نظام متكامل لتتبع صيانة سيارتك، إدارة مصاريفها، ومشاركة حالتها عبر رمز QR الذكي. 
          كل ما تحتاجه في مكان واحد.
        </p>
        
        <div class="hero-cta d-flex gap-3 justify-center flex-wrap">
          <v-btn 
            color="primary" 
            size="x-large" 
            to="/register"
            class="px-8 cta-btn"
          >
            <v-icon start>mdi-rocket-launch</v-icon>
            ابدأ الآن مجاناً
          </v-btn>
          <v-btn 
            variant="outlined" 
            color="white" 
            size="x-large"
            class="px-8"
            @click="scrollToFeatures"
          >
            اكتشف المزيد
            <v-icon end>mdi-chevron-down</v-icon>
          </v-btn>
        </div>

        <!-- Stats -->
        <div class="hero-stats d-flex justify-center gap-8 mt-12 flex-wrap">
          <div class="stat-item">
            <div class="stat-value">100%</div>
            <div class="stat-label">مجاني</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <div class="stat-value">QR</div>
            <div class="stat-label">مشاركة ذكية</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <div class="stat-value">24/7</div>
            <div class="stat-label">متاح دائماً</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="features-section py-16 px-4">
      <div class="container">
        <div class="section-header text-center mb-12">
          <v-chip color="primary" variant="tonal" class="mb-4">المميزات</v-chip>
          <h2 class="section-title mb-4">كل ما تحتاجه لإدارة سيارتك</h2>
          <p class="section-subtitle mx-auto">
            أدوات ذكية تجعل متابعة صيانة سيارتك أسهل من أي وقت مضى
          </p>
        </div>

        <div class="features-grid">
          <v-card 
            v-for="feature in features" 
            :key="feature.title"
            class="feature-card"
          >
            <v-card-text class="pa-6 text-center">
              <div class="feature-icon mx-auto mb-4" :class="`bg-${feature.color}`">
                <v-icon size="32" color="white">{{ feature.icon }}</v-icon>
              </div>
              <h3 class="feature-title mb-3">{{ feature.title }}</h3>
              <p class="feature-desc">{{ feature.desc }}</p>
            </v-card-text>
          </v-card>
        </div>
      </div>
    </section>

    <!-- How It Works -->
    <section class="how-section py-16 px-4">
      <div class="container">
        <div class="section-header text-center mb-12">
          <v-chip color="success" variant="tonal" class="mb-4">كيف يعمل</v-chip>
          <h2 class="section-title mb-4">ثلاث خطوات للبدء</h2>
        </div>

        <div class="steps-grid">
          <div v-for="(step, i) in steps" :key="i" class="step-item">
            <div class="step-number">{{ i + 1 }}</div>
            <h4 class="step-title">{{ step.title }}</h4>
            <p class="step-desc">{{ step.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section py-16 px-4 text-center">
      <div class="container">
        <h2 class="cta-title mb-4">جاهز لإدارة سيارتك بذكاء؟</h2>
        <p class="cta-desc mb-8 mx-auto">
          انضم الآن واحصل على نظام متكامل لتتبع صيانة سيارتك مجاناً
        </p>
        <v-btn color="white" size="x-large" to="/register" class="px-10 cta-btn-light">
          <v-icon start>mdi-account-plus</v-icon>
          إنشاء حساب مجاني
        </v-btn>
      </div>
    </section>

    <!-- Footer -->
    <footer class="landing-footer pa-6 text-center">
      <div class="d-flex align-center justify-center gap-2 mb-3">
        <v-img :src="ayarLogo" width="28" height="28" contain></v-img>
        <span class="text-h6 font-weight-bold text-primary">عيار</span>
      </div>
      <p class="text-caption text-medium-emphasis">
        © {{ new Date().getFullYear() }} عيار - جميع الحقوق محفوظة
      </p>
    </footer>
  </div>
</template>

<script setup>
import ayarLogo from '@/assets/ayar-logo.png'

const features = [
  {
    icon: 'mdi-qrcode-scan',
    color: 'primary',
    title: 'نظام الباركود الذكي',
    desc: 'شارك حالة سيارتك مع الآخرين عبر رمز QR فريد. مثالي لعمليات البيع والفحص الفني.'
  },
  {
    icon: 'mdi-wrench-clock',
    color: 'success',
    title: 'متابعة الصيانة الدورية',
    desc: 'تنبيهات ذكية قبل موعد الصيانة. تتبع الزيت، الفرامل، الإطارات وكل المهام تلقائياً.'
  },
  {
    icon: 'mdi-file-document-check',
    color: 'warning',
    title: 'إدارة المصاريف والوثائق',
    desc: 'احفظ جميع فواتير الصيانة ووثائق السيارة. تنبيهات قبل انتهاء التأمين والاستمارة.'
  }
]

const steps = [
  {
    title: 'سجّل حسابك',
    desc: 'أنشئ حساب مجاني في أقل من دقيقة'
  },
  {
    title: 'أضف سيارتك',
    desc: 'أدخل بيانات سيارتك وقراءة العداد'
  },
  {
    title: 'تتبع وشارك',
    desc: 'استلم التنبيهات وشارك حالة سيارتك'
  }
]

function scrollToFeatures() {
  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<style scoped>
.landing-page {
  min-height: 100vh;
  background: #0a1929;
  color: white;
  font-family: 'Tajawal', sans-serif;
}

/* Header */
.landing-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: rgba(10, 25, 41, 0.9);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.logo-wrapper {
  width: 48px;
  height: 48px;
  background: white;
  border-radius: 12px;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-text {
  font-size: 1.5rem;
  font-weight: 700;
  color: #42a5f5;
}

/* Hero */
.hero-section {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding-top: 80px;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(ellipse at 50% 0%, rgba(25, 118, 210, 0.2) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 80%, rgba(76, 175, 80, 0.1) 0%, transparent 40%);
}

.hero-content {
  position: relative;
  z-index: 1;
  max-width: 800px;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  background: rgba(25, 118, 210, 0.15);
  border: 1px solid rgba(25, 118, 210, 0.3);
  border-radius: 100px;
  padding: 8px 20px;
  font-size: 0.875rem;
}

.hero-title {
  font-size: clamp(2rem, 6vw, 3.5rem);
  font-weight: 800;
  line-height: 1.2;
}

.hero-subtitle {
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.7);
  max-width: 600px;
  line-height: 1.8;
}

.cta-btn {
  font-weight: 700;
  letter-spacing: 0;
}

.hero-stats {
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: #42a5f5;
}

.stat-label {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
}

/* Features */
.features-section {
  background: linear-gradient(180deg, #0a1929 0%, #0d2137 100%);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.section-title {
  font-size: clamp(1.5rem, 4vw, 2.25rem);
  font-weight: 700;
}

.section-subtitle {
  font-size: 1.125rem;
  color: rgba(255, 255, 255, 0.6);
  max-width: 500px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.feature-card {
  background: rgba(255, 255, 255, 0.03) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 20px !important;
  transition: all 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-8px);
  border-color: rgba(25, 118, 210, 0.3) !important;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.feature-icon {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.feature-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: white;
}

.feature-desc {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.7;
}

/* How It Works */
.how-section {
  background: #0d2137;
}

.steps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 32px;
  max-width: 800px;
  margin: 0 auto;
}

.step-item {
  text-align: center;
}

.step-number {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1976D2, #42a5f5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0 auto 16px;
}

.step-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.step-desc {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.6);
}

/* CTA Section */
.cta-section {
  background: linear-gradient(135deg, #1976D2, #1565C0);
}

.cta-title {
  font-size: clamp(1.5rem, 4vw, 2rem);
  font-weight: 700;
}

.cta-desc {
  font-size: 1.125rem;
  opacity: 0.9;
  max-width: 500px;
}

.cta-btn-light {
  color: #1976D2 !important;
  font-weight: 700;
}

/* Footer */
.landing-footer {
  background: #060d17;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

/* Responsive */
@media (max-width: 600px) {
  .hero-stats {
    gap: 24px;
  }
  
  .stat-divider {
    display: none;
  }
  
  .header-actions .v-btn--variant-text {
    display: none;
  }
}
</style>
