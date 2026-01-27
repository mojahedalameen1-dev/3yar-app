import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export const useAuthStore = defineStore('auth', () => {
    // State
    const user = ref(null)
    const session = ref(null)
    const loading = ref(true)
    const error = ref(null)

    // Getters
    const isAuthenticated = computed(() => !!user.value)
    const userEmail = computed(() => user.value?.email || '')
    const userId = computed(() => user.value?.id || null)
    const userInitials = computed(() => {
        if (!user.value?.email) return '?'
        const email = user.value.email
        return email.charAt(0).toUpperCase()
    })

    // Clear all other stores (called on login/logout)
    function clearAllStores() {
        // Import stores dynamically to avoid circular dependencies
        const { useCarStore } = require('./car')
        const { useTasksStore } = require('./tasks')
        const { useRecordsStore } = require('./records')
        const { useDocumentsStore } = require('./documents')
        const { useOdometerStore } = require('./odometer')
        const { useProfileStore } = require('./profile')

        // Reset each store
        const carStore = useCarStore()
        const tasksStore = useTasksStore()
        const recordsStore = useRecordsStore()
        const documentsStore = useDocumentsStore()
        const odometerStore = useOdometerStore()
        const profileStore = useProfileStore()

        carStore.$reset()
        tasksStore.$reset()
        recordsStore.$reset()
        documentsStore.$reset()
        odometerStore.$reset()
        profileStore.$reset()
    }

    // Initialize auth state
    async function initialize() {
        loading.value = true
        try {
            // Get initial session
            const { data: { session: currentSession } } = await supabase.auth.getSession()
            session.value = currentSession
            user.value = currentSession?.user || null

            // Listen for auth changes
            supabase.auth.onAuthStateChange((event, newSession) => {
                const previousUser = user.value?.id
                session.value = newSession
                user.value = newSession?.user || null

                // Clear stores when user changes or signs out
                if (event === 'SIGNED_OUT' || (previousUser && previousUser !== newSession?.user?.id)) {
                    clearAllStores()
                }
            })
        } catch (err) {
            error.value = err.message
            console.error('Auth initialization error:', err)
        } finally {
            loading.value = false
        }
    }

    // Sign up with email/password
    async function signUp(email, password) {
        loading.value = true
        error.value = null
        try {
            const { data, error: err } = await supabase.auth.signUp({
                email,
                password
            })
            if (err) throw err
            return { success: true, data }
        } catch (err) {
            error.value = err.message
            return { success: false, error: err.message }
        } finally {
            loading.value = false
        }
    }

    // Sign in with email/password
    async function signIn(email, password) {
        loading.value = true
        error.value = null
        try {
            // Clear stores BEFORE login to prevent flash of previous data
            clearAllStores()

            const { data, error: err } = await supabase.auth.signInWithPassword({
                email,
                password
            })
            if (err) throw err
            user.value = data.user
            session.value = data.session
            return { success: true }
        } catch (err) {
            error.value = err.message
            return { success: false, error: err.message }
        } finally {
            loading.value = false
        }
    }

    // Sign out
    async function signOut() {
        loading.value = true
        error.value = null
        try {
            // Clear stores BEFORE signOut
            clearAllStores()

            const { error: err } = await supabase.auth.signOut()
            if (err) throw err
            user.value = null
            session.value = null
            return { success: true }
        } catch (err) {
            error.value = err.message
            return { success: false, error: err.message }
        } finally {
            loading.value = false
        }
    }

    // Reset password
    async function resetPassword(email) {
        loading.value = true
        error.value = null
        try {
            const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`
            })
            if (err) throw err
            return { success: true }
        } catch (err) {
            error.value = err.message
            return { success: false, error: err.message }
        } finally {
            loading.value = false
        }
    }

    return {
        user,
        session,
        loading,
        error,
        isAuthenticated,
        userEmail,
        userId,
        userInitials,
        initialize,
        signUp,
        signIn,
        signOut,
        resetPassword,
        clearAllStores
    }
})

