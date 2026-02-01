<template>
  <v-dialog v-model="dialogVisible" max-width="450" :scrim="true" transition="dialog-bottom-transition">
    <v-card class="rounded-xl position-relative overflow-hidden" min-height="300">
      <!-- Absolute Close Button -->
      <v-btn 
        icon="mdi-close"
        variant="tonal"
        size="small"
        color="grey-darken-1"
        class="close-btn-absolute"
        style="z-index: 9999 !important; pointer-events: auto !important; cursor: pointer !important;"
        @click.prevent.stop="close"
        elevation="2"
      ></v-btn>

      <v-card-title class="d-flex align-center pa-5 pt-8">
        <div class="dialog-icon me-3">
          <v-icon color="primary">mdi-qrcode</v-icon>
        </div>
        <div>
          <div class="text-h6">مشاركة حالة السيارة</div>
          <div class="text-caption text-medium-emphasis">شارك رمز QR للوصول السريع</div>
        </div>
      </v-card-title>

      <v-divider></v-divider>

      <v-card-text class="pa-5">
        <!-- Loading State -->
        <div v-if="loading" class="text-center py-5">
          <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
          <p class="text-caption mt-4">جاري إعداد رابط المشاركة...</p>
        </div>

        <!-- QR Content -->
        <div v-else class="qr-section text-center">
          <!-- Printable Area -->
          <div id="print-area" class="print-area mb-4">
            <div class="qr-container mx-auto">
              <img 
                v-if="qrCodeUrl" 
                :src="qrCodeUrl" 
                alt="QR Code" 
                class="qr-image"
              />
            </div>
            <div class="print-only text-center mt-4">
              <h2 class="text-h4 font-weight-bold mb-2">{{ car.make }} {{ car.model }}</h2>
              <p class="text-h6">{{ car.year }}</p>
              <div class="power-by mt-4 text-medium-emphasis">
                <small>Powered by Ayar</small>
              </div>
            </div>
          </div>

          <v-text-field
            v-model="shareUrl"
            label="رابط المشاركة"
            readonly
            variant="outlined"
            density="compact"
            dir="ltr"
            class="mb-3"
            bg-color="rgba(var(--v-theme-surface-variant), 0.1)"
          >
            <template #append-inner>
              <v-btn 
                icon 
                variant="text" 
                size="small" 
                @click="copyLink"
              >
                <v-icon :color="copied ? 'success' : undefined">{{ copied ? 'mdi-check' : 'mdi-content-copy' }}</v-icon>
              </v-btn>
            </template>
          </v-text-field>

          <div class="d-flex gap-2 justify-center flex-wrap">
            <v-btn 
              color="primary" 
              variant="flat"
              prepend-icon="mdi-printer"
              @click="printQR"
              class="flex-grow-1"
            >
              طباعة الباركود
            </v-btn>
            <v-btn 
              color="info" 
              variant="tonal"
              prepend-icon="mdi-share-variant"
              @click="shareNative"
              class="flex-grow-1"
            >
              مشاركة الرابط
            </v-btn>
          </div>
        </div>

        <!-- Privacy Notice -->
        <v-alert 
          type="info" 
          variant="tonal" 
          class="mt-4"
          density="compact"
          icon="mdi-shield-check"
        >
          <template #text>
            <div class="text-caption">
              <strong>آمن ومحمي:</strong> هذا الرابط يعرض فقط عداد السيارة وحالة الصيانة. لا يتم عرض أي بيانات شخصية أو تكاليف.
            </div>
          </template>
        </v-alert>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import QRCode from 'qrcode'

const props = defineProps({
  modelValue: Boolean,
  car: Object
})

const emit = defineEmits(['update:modelValue', 'updated'])

// Dialog visibility
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// State
const shareToken = ref('')
const qrCodeUrl = ref('')
const loading = ref(true)
const copied = ref(false)

// Share URL
const shareUrl = computed(() => {
  if (!shareToken.value) return ''
  return `${window.location.origin}/status/${shareToken.value}`
})

// Initialize on open
watch(() => props.modelValue, async (isOpen) => {
  if (isOpen) {
    await initialize()
  }
})

onMounted(async () => {
  if (props.modelValue) {
    await initialize()
  }
})

async function initialize() {
  if (props.car) {
    loading.value = true
    try {
      if (!props.car.publicShareEnabled || !props.car.shareToken) {
        await enableShare()
      } else {
        shareToken.value = props.car.shareToken
        await generateQR()
      }
    } catch (e) {
      console.error('Error initializing share:', e)
    } finally {
      loading.value = false
    }
  }
}

// Enable Share Logic
async function enableShare() {
  // Generate token if missing (though backend usually handles this)
  const updates = { public_share_enabled: true }
  
  // If we were using backend logic for token generation, triggering update might work.
  // Assuming frontend needs to handle this update or just get value.
  // For now we rely on Supabase returning the updated row.
  
  const { data, error } = await supabase
    .from('cars')
    .update(updates)
    .eq('id', props.car.id)
    .select()
    .single()

  if (error) throw error
  if (data) {
    shareToken.value = data.share_token
    emit('updated', { publicShareEnabled: true, shareToken: data.share_token })
    await generateQR()
  }
}

// Generate QR
async function generateQR() {
  if (!shareUrl.value) return
  try {
    qrCodeUrl.value = await QRCode.toDataURL(shareUrl.value, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' }
    })
  } catch (err) {
    console.error('Error generating QR:', err)
  }
}

// Copy
function copyLink() {
  navigator.clipboard.writeText(shareUrl.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

// Print QR
function printQR() {
  const printWindow = window.open('', '_blank')
  printWindow.document.write(`
    <html>
      <head>
        <title>QR Code - ${props.car.make} ${props.car.model}</title>
        <style>
          body { font-family: sans-serif; text-align: center; padding: 40px; }
          .container { border: 2px solid #000; display: inline-block; padding: 20px; border-radius: 10px; }
          img { width: 250px; height: 250px; }
          h1 { margin: 10px 0 5px; font-size: 24px; }
          p { margin: 0; font-size: 18px; color: #555; }
          .footer { margin-top: 20px; font-size: 12px; color: #888; }
        </style>
      </head>
      <body>
        <div class="container">
          <img src="${qrCodeUrl.value}" />
          <h1>${props.car.make} ${props.car.model}</h1>
          <p>${props.car.year}</p>
          <div class="footer">Ayar App - Digital Passport</div>
        </div>
        <script>
          window.onload = function() { window.print(); window.close(); }
        <\/script>
      </body>
    </html>
  `)
  printWindow.document.close()
}

// Native share
async function shareNative() {
  if (navigator.share) {
    try {
      await navigator.share({
        title: `حالة ${props.car.make} ${props.car.model}`,
        text: 'شاهد حالة سيارتي على عيار',
        url: shareUrl.value
      })
    } catch (_) {}
  } else {
    copyLink()
  }
}

function close() {
  console.log('Close button clicked')
  dialogVisible.value = false
}
</script>

<style scoped>
.dialog-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(25, 118, 210, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-container {
  width: 220px;
  height: 220px;
  background: white;
  border-radius: 16px;
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.qr-image {
  width: 200px;
  height: 200px;
  border-radius: 8px;
}

.print-only { display: none; }

@media print {
  .print-area { display: block !important; }
  .print-only { display: block !important; }
}

.close-btn-absolute {
  position: absolute;
  left: 14px;
  top: 14px;
  z-index: 9999;
}
</style>
