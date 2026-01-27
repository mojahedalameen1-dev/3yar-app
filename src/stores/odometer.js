import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useCarStore } from './car'
import dayjs from 'dayjs'

export const useOdometerStore = defineStore('odometer', () => {
    // State
    const readings = ref([])
    const loading = ref(false)
    const error = ref(null)

    // Reset store state
    function $reset() {
        readings.value = []
        loading.value = false
        error.value = null
    }

    // Get current user ID from session
    async function getUserId() {
        const { data: { session } } = await supabase.auth.getSession()
        return session?.user?.id || null
    }

    // Getters
    const sortedReadings = computed(() => {
        return [...readings.value].sort((a, b) =>
            new Date(b.date) - new Date(a.date)
        )
    })

    const latestReading = computed(() => {
        if (readings.value.length === 0) return null
        return sortedReadings.value[0]
    })

    const totalDistance = computed(() => {
        if (readings.value.length < 2) return 0
        const sorted = sortedReadings.value
        return sorted[0].reading - sorted[sorted.length - 1].reading
    })

    const averageDailyKm = computed(() => {
        if (readings.value.length < 2) return 0
        const sorted = sortedReadings.value
        const firstDate = dayjs(sorted[sorted.length - 1].date)
        const lastDate = dayjs(sorted[0].date)
        const days = lastDate.diff(firstDate, 'day') || 1
        return Math.round(totalDistance.value / days)
    })

    const readingsWithDistance = computed(() => {
        const sorted = sortedReadings.value
        return sorted.map((reading, index) => {
            const prevReading = sorted[index + 1]
            const distanceSinceLast = prevReading
                ? reading.reading - prevReading.reading
                : 0
            return {
                ...reading,
                distanceSinceLast
            }
        })
    })

    // Database mapping
    function mapFromDb(row) {
        return {
            id: row.id,
            reading: row.reading,
            date: row.date,
            notes: row.notes,
            createdAt: row.created_at
        }
    }

    function mapToDb(reading) {
        return {
            reading: reading.reading,
            date: reading.date || new Date().toISOString(),
            notes: reading.notes || ''
        }
    }

    // Actions
    async function fetchReadings() {
        loading.value = true
        error.value = null
        try {
            const userId = await getUserId()
            if (!userId) {
                readings.value = []
                return
            }

            const { data, error: err } = await supabase
                .from('odometer_readings')
                .select('*')
                .eq('user_id', userId)
                .order('date', { ascending: false })

            if (err) throw err

            readings.value = data ? data.map(mapFromDb) : []
        } catch (err) {
            error.value = err.message
            console.error('Error fetching readings:', err)
        } finally {
            loading.value = false
        }
    }

    async function addReading(readingData) {
        const carStore = useCarStore()
        const currentOdometer = carStore.car?.currentOdometer || 0

        if (readingData.reading <= currentOdometer && readings.value.length > 0) {
            throw new Error('قراءة العداد يجب أن تكون أكبر من القراءة السابقة')
        }

        try {
            const { data, error: err } = await supabase
                .from('odometer_readings')
                .insert([mapToDb(readingData)])
                .select()
                .maybeSingle()

            if (err) throw err

            const newReading = mapFromDb(data)
            readings.value.push(newReading)
            await carStore.updateOdometer(readingData.reading)
            return newReading
        } catch (err) {
            error.value = err.message
            console.error('Error adding reading:', err)
            throw err
        }
    }

    async function deleteReading(id) {
        try {
            const { error: err } = await supabase
                .from('odometer_readings')
                .delete()
                .eq('id', id)

            if (err) throw err
            readings.value = readings.value.filter(r => r.id !== id)
        } catch (err) {
            error.value = err.message
            console.error('Error deleting reading:', err)
            throw err
        }
    }

    async function clearAllReadings() {
        try {
            const { error: err } = await supabase
                .from('odometer_readings')
                .delete()
                .neq('id', 0)

            if (err) throw err
            readings.value = []
        } catch (err) {
            error.value = err.message
            console.error('Error clearing readings:', err)
            throw err
        }
    }

    return {
        readings,
        loading,
        error,
        $reset,
        sortedReadings,
        latestReading,
        totalDistance,
        averageDailyKm,
        readingsWithDistance,
        fetchReadings,
        addReading,
        deleteReading,
        clearAllReadings
    }
})
