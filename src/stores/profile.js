import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export const useProfileStore = defineStore('profile', () => {
    // State
    const profile = ref(null)
    const loading = ref(false)
    const error = ref(null)

    // Reset store state
    function $reset() {
        profile.value = null
        loading.value = false
        error.value = null
    }

    // Getters
    const firstName = computed(() => profile.value?.firstName || '')
    const lastName = computed(() => profile.value?.lastName || '')
    const fullName = computed(() => {
        if (!profile.value) return ''
        const first = profile.value.firstName || ''
        const last = profile.value.lastName || ''
        return `${first} ${last}`.trim()
    })
    const phone = computed(() => profile.value?.phone || '')
    const isComplete = computed(() => {
        return !!(profile.value?.firstName && profile.value?.lastName)
    })
    const hasProfile = computed(() => profile.value !== null)
    const role = computed(() => profile.value?.role || 'user')
    const isAdmin = computed(() => profile.value?.role === 'admin')

    // Set role directly (used by router guard)
    function setRole(newRole) {
        if (profile.value) {
            profile.value = { ...profile.value, role: newRole }
        } else {
            profile.value = { role: newRole }
        }
    }

    // Get current user ID from session
    async function getUserId() {
        const { data: { session } } = await supabase.auth.getSession()
        return session?.user?.id || null
    }

    // Database mapping
    function mapFromDb(row) {
        return {
            id: row.id,
            userId: row.user_id,
            firstName: row.first_name,
            lastName: row.last_name,
            phone: row.phone,
            role: row.role || 'user',
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }
    }

    // Fetch user profile
    async function fetchProfile() {
        loading.value = true
        error.value = null
        try {
            const userId = await getUserId()
            if (!userId) {
                profile.value = null
                return
            }

            const { data, error: err } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle()

            if (err) throw err

            if (data) {
                profile.value = mapFromDb(data)
            } else {
                // Profile doesn't exist yet, create empty one
                profile.value = {
                    userId,
                    firstName: '',
                    lastName: '',
                    phone: ''
                }
            }
        } catch (err) {
            error.value = err.message
            console.error('Error fetching profile:', err)
        } finally {
            loading.value = false
        }
    }

    // Update user profile
    async function updateProfile(updates) {
        loading.value = true
        error.value = null
        try {
            const userId = await getUserId()
            if (!userId) throw new Error('يجب تسجيل الدخول أولاً')

            const dbUpdates = {
                user_id: userId,
                first_name: updates.firstName,
                last_name: updates.lastName,
                phone: updates.phone || ''
            }

            // Upsert - insert if not exists, update if exists
            const { data, error: err } = await supabase
                .from('profiles')
                .upsert(dbUpdates, { onConflict: 'user_id' })
                .select()
                .maybeSingle()

            if (err) throw err

            if (data) {
                profile.value = mapFromDb(data)
            }

            return { success: true }
        } catch (err) {
            error.value = err.message
            console.error('Error updating profile:', err)
            return { success: false, error: err.message }
        } finally {
            loading.value = false
        }
    }

    return {
        profile,
        loading,
        error,
        $reset,
        firstName,
        lastName,
        fullName,
        phone,
        isComplete,
        hasProfile,
        role,
        isAdmin,
        setRole,
        fetchProfile,
        updateProfile
    }
})
