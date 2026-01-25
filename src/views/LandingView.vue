<template>
  <div class="landing-page">
    <!-- Header -->
    <header class="landing-header">
      <div class="header-container">
        <div class="logo d-flex align-center gap-2">
          <div class="logo-wrapper">
            <v-img :src="ayarLogo" width="36" height="36" contain></v-img>
          </div>
          <span class="logo-text">عيار</span>
        </div>
        
        <nav class="nav-links">
          <a href="#features" class="nav-link">المميزات</a>
          <a href="#how" class="nav-link">كيف يعمل</a>
          <a href="#qr" class="nav-link">QR Pass</a>
        </nav>
        
        <div class="header-actions">
          <router-link to="/login" class="login-link">دخول</router-link>
          <v-btn color="primary" variant="outlined" to="/register" class="register-btn">
            ابدأ الآن
          </v-btn>
        </div>
      </div>
    </header>

    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">
          <span class="hero-title-line">إدارة سيارتك</span>
          <span class="hero-title-line text-gradient">بذكاء احترافي</span>
        </h1>
        
        <p class="hero-subtitle">
          نظام متكامل لتتبع صيانة سيارتك، إدارة مصاريفها، 
          ومشاركة حالتها عبر رمز QR الذكي
        </p>
        
        <div class="hero-cta">
          <v-btn 
            color="primary" 
            size="x-large" 
            to="/register"
            class="cta-btn"
          >
            ابدأ مجاناً
          </v-btn>
        </div>
      </div>
      
      <!-- Hero Car Image -->
      <div class="hero-car">
        <div class="car-glow"></div>
        <v-img 
          src="https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=1200&q=80" 
          class="car-image"
          cover
        ></v-img>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="features-section">
      <div class="section-container">
        <div class="section-header">
          <span class="section-badge">المميزات</span>
          <h2 class="section-title">كل ما تحتاجه في مكان واحد</h2>
        </div>
        
        <div class="features-grid">
          <div v-for="feature in features" :key="feature.title" class="feature-card">
            <div class="feature-icon" :style="{ background: feature.gradient }">
              <v-icon size="28" color="white">{{ feature.icon }}</v-icon>
            </div>
            <h3 class="feature-title">{{ feature.title }}</h3>
            <p class="feature-desc">{{ feature.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- QR Pass Section -->
    <section id="qr" class="qr-section">
      <div class="section-container">
        <div class="qr-content">
          <div class="qr-text">
            <span class="section-badge">نظام الباركود</span>
            <h2 class="section-title">QR Vehicle Pass</h2>
            <p class="qr-desc">
              احصل على رمز QR فريد لسيارتك يمكن مشاركته مع المشترين المحتملين أو مراكز الصيانة. 
              يعرض حالة السيارة وتاريخ صيانتها بشكل آمن دون الكشف عن معلوماتك الشخصية.
            </p>
            <ul class="qr-features">
              <li><v-icon color="success" size="18" class="me-2">mdi-check-circle</v-icon> عداد المسافات المحدث</li>
              <li><v-icon color="success" size="18" class="me-2">mdi-check-circle</v-icon> حالة الصيانة الدورية</li>
              <li><v-icon color="success" size="18" class="me-2">mdi-check-circle</v-icon> صلاحية الوثائق</li>
            </ul>
          </div>
          <div class="qr-visual">
            <div class="qr-phone">
              <div class="phone-screen">
                <div class="phone-header">
                  <v-icon color="primary" size="20">mdi-car</v-icon>
                  <span>حالة السيارة</span>
                </div>
                <div class="phone-qr">
                  <v-icon size="80" color="primary">mdi-qrcode</v-icon>
                </div>
                <div class="phone-stats">
                  <div class="stat"><span>العداد</span><strong>45,230 كم</strong></div>
                  <div class="stat"><span>الزيت</span><strong class="text-success">جيد</strong></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works -->
    <section id="how" class="how-section">
      <div class="section-container">
        <div class="section-header">
          <span class="section-badge">كيف يعمل</span>
          <h2 class="section-title">ثلاث خطوات بسيطة</h2>
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
    <section class="cta-section">
      <div class="cta-container">
        <h2 class="cta-title">ابدأ إدارة سيارتك بذكاء</h2>
        <p class="cta-desc">مجاني بالكامل • بدون بطاقة ائتمان</p>
        <v-btn color="white" size="x-large" to="/register" class="cta-btn-white">
          إنشاء حساب مجاني
        </v-btn>
      </div>
    </section>

    <!-- Footer -->
    <footer class="landing-footer">
      <div class="footer-content">
        <div class="footer-brand">
          <v-img :src="ayarLogo" width="32" height="32" class="me-2"></v-img>
          <span class="footer-logo">عيار</span>
        </div>
        <p class="footer-copy">© {{ new Date().getFullYear() }} عيار - جميع الحقوق محفوظة</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import ayarLogo from '@/assets/ayar-logo.png'

const features = [
  {
    icon: 'mdi-qrcode-scan',
    gradient: 'linear-gradient(135deg, #1976D2, #42a5f5)',
    title: 'نظام الباركود الذكي',
    desc: 'شارك حالة سيارتك عبر رمز QR فريد مع المشترين أو مراكز الفحص'
  },
  {
    icon: 'mdi-wrench-clock',
    gradient: 'linear-gradient(135deg, #43A047, #66BB6A)',
    title: 'متابعة الصيانة الدورية',
    desc: 'تنبيهات ذكية قبل موعد الصيانة لجميع مهام سيارتك'
  },
  {
    icon: 'mdi-file-document-check',
    gradient: 'linear-gradient(135deg, #FB8C00, #FFA726)',
    title: 'إدارة المصاريف والوثائق',
    desc: 'احفظ جميع فواتير الصيانة ووثائق السيارة في مكان واحد'
  }
]

const steps = [
  { title: 'سجّل حسابك', desc: 'أنشئ حساب مجاني في ثوانٍ' },
  { title: 'أضف سيارتك', desc: 'أدخل بيانات سيارتك الأساسية' },
  { title: 'تتبع وشارك', desc: 'استلم التنبيهات وشارك حالة سيارتك' }
]
</script>

<style scoped>
.landing-page {
  min-height: 100vh;
  background: #0a1929;
  color: white;
  font-family: 'Tajawal', sans-serif;
  overflow-x: hidden;
}

/* Header */
.landing-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: rgba(10, 25, 41, 0.85);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.header-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo-wrapper {
  width: 44px;
  height: 44px;
  background: white;
  border-radius: 12px;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-text {
  font-size: 1.5rem;
  font-weight: 800;
  color: #42a5f5;
}

.nav-links {
  display: flex;
  gap: 32px;
}

.nav-link {
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  font-size: 0.95rem;
  transition: color 0.2s;
}

.nav-link:hover {
  color: white;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.login-link {
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  font-weight: 500;
}

.register-btn {
  border-radius: 100px !important;
  text-transform: none;
  font-weight: 600;
}

/* Hero */
.hero-section {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 120px 24px 60px;
  position: relative;
}

.hero-content {
  text-align: center;
  max-width: 700px;
  z-index: 2;
}

.hero-title {
  font-size: clamp(2.5rem, 7vw, 4rem);
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 24px;
}

.hero-title-line {
  display: block;
}

.text-gradient {
  background: linear-gradient(135deg, #42a5f5,  #1976D2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 32px;
  line-height: 1.8;
}

.cta-btn {
  font-size: 1.1rem;
  font-weight: 700;
  padding: 12px 40px !important;
  border-radius: 100px !important;
}

.hero-car {
  position: relative;
  width: 100%;
  max-width: 900px;
  margin-top: 40px;
  z-index: 1;
}

.car-glow {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  height: 100px;
  background: radial-gradient(ellipse, rgba(25, 118, 210, 0.3) 0%, transparent 70%);
  filter: blur(40px);
}

.car-image {
  width: 100%;
  height: 300px;
  object-fit: cover;
  border-radius: 16px;
}

/* Section Common */
.section-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px;
}

.section-header {
  text-align: center;
  margin-bottom: 48px;
}

.section-badge {
  display: inline-block;
  background: rgba(25, 118, 210, 0.15);
  border: 1px solid rgba(25, 118, 210, 0.3);
  border-radius: 100px;
  padding: 6px 20px;
  font-size: 0.875rem;
  color: #42a5f5;
  margin-bottom: 16px;
}

.section-title {
  font-size: clamp(1.5rem, 4vw, 2.25rem);
  font-weight: 700;
}

/* Features */
.features-section {
  padding: 100px 0;
  background: linear-gradient(180deg, #0a1929 0%, #0d2137 100%);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.feature-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  padding: 32px;
  text-align: center;
  transition: all 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-8px);
  border-color: rgba(25, 118, 210, 0.3);
}

.feature-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}

.feature-title {
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 12px;
}

.feature-desc {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.95rem;
  line-height: 1.7;
}

/* QR Section */
.qr-section {
  padding: 100px 0;
  background: #0d2137;
}

.qr-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
}

.qr-desc {
  color: rgba(255, 255, 255, 0.7);
  font-size: 1.05rem;
  line-height: 1.8;
  margin-top: 16px;
}

.qr-features {
  list-style: none;
  padding: 0;
  margin-top: 24px;
}

.qr-features li {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  color: rgba(255, 255, 255, 0.8);
}

.qr-phone {
  background: linear-gradient(135deg, #1a2744, #0d2137);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 32px;
  padding: 12px;
  max-width: 280px;
  margin: 0 auto;
}

.phone-screen {
  background: #0a1929;
  border-radius: 24px;
  padding: 20px;
}

.phone-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  font-weight: 600;
}

.phone-qr {
  background: white;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
  display: flex;
  justify-content: center;
}

.phone-stats {
  display: flex;
  justify-content: space-around;
}

.phone-stats .stat {
  text-align: center;
}

.phone-stats .stat span {
  display: block;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

.phone-stats .stat strong {
  font-size: 0.95rem;
}

/* How Section */
.how-section {
  padding: 100px 0;
  background: linear-gradient(180deg, #0d2137 0%, #0a1929 100%);
}

.steps-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
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
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.step-desc {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
}

/* CTA */
.cta-section {
  padding: 80px 24px;
  background: linear-gradient(135deg, #1976D2, #1565C0);
  text-align: center;
}

.cta-title {
  font-size: clamp(1.5rem, 4vw, 2rem);
  font-weight: 700;
  margin-bottom: 12px;
}

.cta-desc {
  opacity: 0.9;
  margin-bottom: 32px;
}

.cta-btn-white {
  color: #1976D2 !important;
  font-weight: 700;
  border-radius: 100px !important;
  padding: 12px 40px !important;
}

/* Footer */
.landing-footer {
  padding: 32px 24px;
  background: #060d17;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.footer-content {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.footer-brand {
  display: flex;
  align-items: center;
}

.footer-logo {
  font-size: 1.25rem;
  font-weight: 700;
  color: #42a5f5;
}

.footer-copy {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.875rem;
}

/* Responsive */
@media (max-width: 768px) {
  .nav-links {
    display: none;
  }
  
  .qr-content {
    grid-template-columns: 1fr;
    text-align: center;
  }
  
  .steps-grid {
    grid-template-columns: 1fr;
  }
  
  .footer-content {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
}
</style>
