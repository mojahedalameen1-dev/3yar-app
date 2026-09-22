import { defineStore } from 'pinia'
import { ref } from 'vue'
import { firebaseAuth } from '@/lib/firebase'
import { authenticatedGet } from '@/services/api-client'
import { SAFE_FEATURE_FLAGS } from '../../shared/contracts/feature-flags.js'

function safeFlags() {
  return { ...SAFE_FEATURE_FLAGS }
}

export const useFeaturesStore = defineStore('features', () => {
  const flags = ref(safeFlags())
  const status = ref('idle')
  let requestVersion = 0
  let activeController = null

  function reset() {
    requestVersion += 1
    activeController?.abort()
    activeController = null
    flags.value = safeFlags()
    status.value = 'idle'
  }

  async function load(userId) {
    if (!userId) {
      reset()
      return
    }

    requestVersion += 1
    const currentRequest = requestVersion
    activeController?.abort()
    const controller = new AbortController()
    activeController = controller
    flags.value = safeFlags()
    status.value = 'loading'

    let timeoutId
    const timeoutPromise = new Promise((_resolve, reject) => {
      timeoutId = setTimeout(() => {
        controller.abort()
        reject(new Error('Feature flag request timed out'))
      }, 4000)
    })

    try {
      const request = (async () => {
        const currentUser = firebaseAuth.currentUser
        if (!currentUser || currentUser.uid !== userId) throw new Error('Authenticated user is unavailable')

        const token = await currentUser.getIdToken()
        const payload = await authenticatedGet('/api/config/features', token, { signal: controller.signal })
        if (currentRequest !== requestVersion) return

        const responseFlags = payload?.flags && typeof payload.flags === 'object' ? payload.flags : {}
        flags.value = Object.fromEntries(Object.keys(SAFE_FEATURE_FLAGS).map(key => [key, responseFlags[key] === true]))
        status.value = payload?.degraded ? 'degraded' : 'ready'
      })()

      await Promise.race([request, timeoutPromise])
    } catch {
      if (currentRequest === requestVersion) {
        flags.value = safeFlags()
        status.value = 'degraded'
        console.warn('Feature flags unavailable; new features remain disabled.')
      }
    } finally {
      clearTimeout(timeoutId)
      if (currentRequest === requestVersion) activeController = null
    }
  }

  return { flags, status, reset, load }
})
