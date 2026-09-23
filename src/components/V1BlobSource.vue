<template>
  <slot :url="resolvedUrl" :loading="loading" :error="error" />
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import { firebaseAuth } from '@/lib/firebase'

const props = defineProps({
  source: { type: String, default: '' },
  documentId: { type: [String, Number], default: '' },
  collectionName: { type: String, default: 'documents' }
})

const resolvedUrl = ref('')
const loading = ref(false)
const error = ref('')
let objectUrl = ''
let requestNumber = 0

function getPrivateBlobPath(source) {
  if (source.startsWith('users/')) return source
  try {
    const parsed = new URL(source, window.location.origin)
    if (parsed.pathname === '/api/blob') return parsed.searchParams.get('pathname') || ''
  } catch {
    return ''
  }
  return ''
}

function clearObjectUrl() {
  if (objectUrl) URL.revokeObjectURL(objectUrl)
  objectUrl = ''
}

watch(() => [props.source, props.documentId, props.collectionName], async ([source, documentId, collectionName]) => {
  const currentRequest = ++requestNumber
  clearObjectUrl()
  resolvedUrl.value = ''
  error.value = ''
  if (!source) return
  const pathname = getPrivateBlobPath(source)
  if (!pathname) {
    resolvedUrl.value = source
    return
  }
  if (!documentId) {
    error.value = 'تعذر تحديد السجل المرتبط بالملف.'
    return
  }

  loading.value = true
  try {
    const user = firebaseAuth.currentUser
    if (!user) throw new Error('سجّل الدخول لعرض الملف.')
    const token = await user.getIdToken()
    const query = new URLSearchParams({ pathname, documentId: String(documentId), collection: collectionName })
    const response = await fetch(`/api/blob?${query.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
    if (!response.ok) throw new Error(response.status === 403 ? 'ليس لديك صلاحية عرض هذا الملف.' : 'تعذر تحميل الملف.')
    const blob = await response.blob()
    if (currentRequest !== requestNumber) return
    objectUrl = URL.createObjectURL(blob)
    resolvedUrl.value = objectUrl
  } catch (cause) {
    if (currentRequest === requestNumber) error.value = cause.message || 'تعذر تحميل الملف.'
  } finally {
    if (currentRequest === requestNumber) loading.value = false
  }
}, { immediate: true })

onBeforeUnmount(clearObjectUrl)
</script>
