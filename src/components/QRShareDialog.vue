<template>
  <v-dialog v-model="dialogVisible" max-width="450" persistent>
    <v-card class="rounded-xl">
      <v-card-title class="d-flex align-center pa-5">
        <div class="dialog-icon me-3">
          <v-icon color="primary">mdi-qrcode</v-icon>
        </div>
        <div>
          <div class="text-h6">مشاركة حالة السيارة</div>
          <div class="text-caption text-medium-emphasis">شارك رمز QR للوصول السريع</div>
        </div>
        <v-spacer></v-spacer>
        <v-btn icon variant="text" @click="close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-divider></v-divider>

      <v-card-text class="pa-5">
        <!-- Share Toggle -->
        <v-card variant="tonal" :color="shareEnabled ? 'success' : 'grey'" class="mb-5">
          <v-card-text class="d-flex align-center justify-space-between pa-4">
            <div>
              <div class="text-subtitle-2 font-weight-bold">
                {{ shareEnabled ? 'المشاركة مفعلة' : 'المشاركة متوقفة' }}
              </div>
              <div class="text-caption">
                {{ shareEnabled ? 'يمكن للآخرين رؤية حالة سيارتك' : 'فقط أنت يمكنك رؤية البيانات' }}
              </div>
            </div>
            <v-switch
              v-model="shareEnabled"
              color="success"
              hide-details
              :loading="loading"
              @update:model-value="toggleShare"
            ></v-switch>
          </v-card-text>
        </v-card>

        <!-- QR Code -->
        <div v-if="shareEnabled" class="qr-section text-center">
          <div class="qr-container mx-auto mb-4">
            <img 
              v-if="qrCodeUrl" 
              :src="qrCodeUrl" 
              alt="QR Code" 
              class="qr-image"
            />
            <v-progress-circular 
              v-else 
              indeterminate 
              color="primary"
            ></v-progress-circular>
          </div>

          <v-text-field
            v-model="shareUrl"
            label="رابط المشاركة"
            readonly
            variant="outlined"
            density="compact"
            dir="ltr"
            class="mb-3"
          >
            <template #append-inner>
              <v-btn 
                icon 
                variant="text" 
                size="small" 
                @click="copyLink"
              >
                <v-icon>{{ copied ? 'mdi-check' : 'mdi-content-copy' }}</v-icon>
              </v-btn>
            </template>
          </v-text-field>

          <div class="d-flex gap-2 justify-center">
            <v-btn 
              color="primary" 
              variant="tonal"
              prepend-icon="mdi-download"
              @click="downloadQR"
            >
              تحميل QR
            </v-btn>
            <v-btn 
              color="info" 
              variant="tonal"
              prepend-icon="mdi-share-variant"
              @click="shareNative"
            >
              مشاركة
            </v-btn>
          </div>
        </div>

        <!-- Privacy Notice -->
        <v-alert 
          type="info" 
          variant="tonal" 
          class="mt-4"
          density="compact"
        >
          <template #text>
            <div class="text-caption">
              <strong>ملاحظة:</strong> الصفحة العامة تعرض فقط المعلومات التقنية (العداد، حالة الصيانة، الوثائق). لا يتم عرض التكاليف أو المعلومات الشخصية.
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
const shareEnabled = ref(false)
const shareToken = ref('')
const qrCodeUrl = ref('')
const loading = ref(false)
const copied = ref(false)

// Share URL
const shareUrl = computed(() => {
  if (!shareToken.value) return ''
  return `${window.location.origin}/status/${shareToken.value}`
})

// Initialize on dialog open
watch(() => props.modelValue, async (isOpen) => {
  if (isOpen && props.car) {
    shareEnabled.value = props.car.publicShareEnabled || false
    shareToken.value = props.car.shareToken || ''
    
    if (shareEnabled.value && shareToken.value) {
      await generateQR()
    }
  }
})

// Toggle share
async function toggleShare(enabled) {
  loading.value = true
  try {
    const { error } = await supabase
      .from('cars')
      .update({ public_share_enabled: enabled })
      .eq('id', props.car.id)

    if (error) throw error

    if (enabled && shareToken.value) {
      await generateQR()
    }

    emit('updated', { public_share_enabled: enabled })
  } catch (err) {
    console.error('Error toggling share:', err)
    shareEnabled.value = !enabled // Revert
  } finally {
    loading.value = false
  }
}

// Generate QR code
async function generateQR() {
  if (!shareUrl.value) return
  
  try {
    qrCodeUrl.value = await QRCode.toDataURL(shareUrl.value, {
      width: 200,
      margin: 2,
      color: {
        dark: '#1976D2',
        light: '#FFFFFF'
      }
    })
  } catch (err) {
    console.error('Error generating QR:', err)
  }
}

// Copy link
function copyLink() {
  navigator.clipboard.writeText(shareUrl.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

// Download QR
function downloadQR() {
  if (!qrCodeUrl.value) return
  
  const link = document.createElement('a')
  link.download = `ayar-car-status-${props.car.make}-${props.car.model}.png`
  link.href = qrCodeUrl.value
  link.click()
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
    } catch (err) {
      // User cancelled or error
    }
  } else {
    copyLink()
  }
}

function close() {
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
</style>
