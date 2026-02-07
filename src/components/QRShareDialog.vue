<template>
  <v-dialog v-model="visible" max-width="400">
    <v-card class="rounded-xl">
      <v-toolbar color="transparent" density="compact">
        <v-toolbar-title class="text-h6 font-weight-bold px-4">مشاركة حالة السيارة</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon @click="close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-divider></v-divider>

      <v-card-text class="pa-4 text-center">
        <div v-if="loading" class="py-8">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <div class="mt-2 text-caption">جاري إنشاء الرابط...</div>
        </div>

        <div v-else>
          <div class="qr-code-wrapper mb-4 pa-4 bg-white rounded-lg elevation-2 d-inline-block">
             <img v-if="qrCodeUrl" :src="qrCodeUrl" class="qr-img" alt="QR Code" />
          </div>
          
          <h3 class="text-h6 font-weight-bold mb-1">{{ car?.make }} {{ car?.model }}</h3>
          <p class="text-body-2 text-medium-emphasis mb-4">{{ car?.year }}</p>

          <v-text-field
            v-model="shareUrl"
            readonly
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-link"
            append-inner-icon="mdi-content-copy"
            @click:append-inner="copyLink"
            label="رابط المشاركة"
            class="mb-2"
          ></v-text-field>

          <div class="d-flex gap-2">
            <v-btn color="secondary" variant="tonal" class="flex-grow-1" prepend-icon="mdi-printer" @click="printQR">
              طباعة
            </v-btn>
            <v-btn color="primary" class="flex-grow-1" prepend-icon="mdi-share-variant" @click="shareNative">
              مشاركة
            </v-btn>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import QRCode from 'qrcode'
import { supabase } from '@/lib/supabase'

const props = defineProps({
  modelValue: Boolean,
  car: Object
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const loading = ref(false)
const qrCodeUrl = ref('')
const shareToken = ref('')

const shareUrl = computed(() => {
  if (!shareToken.value) return ''
  return `${window.location.origin}/status/${shareToken.value}`
})

watch(() => props.modelValue, (val) => {
  if (val) {
    initialize()
  }
})

// Initialize immediately on mount
onMounted(() => {
  if (props.modelValue) {
    initialize()
  }
})

async function initialize() {
  if (!props.car) return
  loading.value = true
  try {
    if (props.car.shareToken) {
      shareToken.value = props.car.shareToken
      await generateQR()
    } else {
      await enableShare()
    }
  } catch (e) {
    console.error('Error in share dialog:', e)
  } finally {
    loading.value = false
  }
}

async function enableShare() {
   const { data, error } = await supabase
    .from('cars')
    .update({ public_share_enabled: true })
    .eq('id', props.car.id)
    .select()
    .single()

  if (error) throw error
  if (data) {
    shareToken.value = data.share_token
    await generateQR()
  }
}

async function generateQR() {
  if (!shareUrl.value) return
  qrCodeUrl.value = await QRCode.toDataURL(shareUrl.value, {
    width: 250,
    margin: 1,
    color: { dark: '#000000', light: '#FFFFFF' }
  })
}

function copyLink() {
  navigator.clipboard.writeText(shareUrl.value)
}

function printQR() {
  const printWindow = window.open('', '_blank')
  printWindow.document.write(`
    <html>
      <head>
        <title>QR Code - ${props.car.make} ${props.car.model}</title>
        <style>
          body { 
            font-family: sans-serif; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            margin: 0; 
          }
          .card { 
            text-align: center; 
            padding: 20px; 
            border: 2px solid #000; 
            border-radius: 12px;
            width: 300px;
          }
          img { width: 200px; height: 200px; }
          h2 { margin: 10px 0 5px; font-size: 20px; }
          p { margin: 0; font-size: 16px; color: #555; }
        </style>
      </head>
      <body>
        <div class="card">
          <img src="${qrCodeUrl.value}" />
          <h2>${props.car.make} ${props.car.model}</h2>
          <p>${props.car.year}</p>
          <p style="margin-top: 10px; font-size: 12px; color: #888;">Powered by Ayar</p>
        </div>
        <script>
          window.onload = function() { window.print(); window.close(); }
        ` + '<' + '/script>' + `
      </body>
    </html>
  `)
  printWindow.document.close()
}

async function shareNative() {
  if (/Android/i.test(navigator.userAgent)) {
    try {
      await navigator.share({
        title: 'مشاركة حالة السيارة',
        text: `شاهد حالة سيارتي ${props.car.make} ${props.car.model}`,
        url: shareUrl.value
      })
    } catch (e) {
        // ignore share cancellation
    }
  } else if (navigator.share) {
    try {
      await navigator.share({
        title: 'مشاركة حالة السيارة',
        text: `شاهد حالة سيارتي ${props.car.make} ${props.car.model}`,
        url: shareUrl.value
      })
    } catch (e) {
        // ignore share cancellation
    }
  } else {
    copyLink()
  }
}

function close() {
  visible.value = false
}
</script>

<style scoped>
.qr-img {
  width: 200px;
  height: 200px;
  display: block;
}
</style>
