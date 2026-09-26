import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/firebase'
import { useCarStore } from './car'
import { calculateOdometerInsightsV1 } from '../lib/odometer-insights-v1'
import { commitOdometerReadingV1 } from '../lib/odometer-entry-v1'

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
    const insights = computed(() => calculateOdometerInsightsV1(readings.value))
    const sortedReadings = computed(() => insights.value.history)

    const latestReading = computed(() => {
        return sortedReadings.value.find(reading => reading.valid) || null
    })

    const totalDistance = computed(() => {
        const accepted = insights.value.analysisReadings
        if (accepted.length < 2) return 0
        return accepted.at(-1).reading - accepted[0].reading
    })

    const averageDailyKm = computed(() => insights.value.averageDailyKm)

    const readingsWithDistance = computed(() => sortedReadings.value)

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

            const carId = useCarStore().car?.id
            if (!carId) {
                readings.value = []
                return
            }

            const { data, error: err } = await supabase
                .from('odometer_readings')
                .select('*')
                .eq('user_id', userId)
                .eq('car_id', carId)

            if (err) throw err

            readings.value = data ? data.map(mapFromDb) : []
        } catch (err) {
            error.value = err.message
            console.error('Error fetching readings:', err)
        } finally {
            loading.value = false
        }
    }

    async function addReading(readingData, { allowCurrentBaseline = false } = {}) {
        const carStore = useCarStore()
        const carId = carStore.car?.id
        if (allowCurrentBaseline && readings.value.length > 0) {
            throw new Error('لا يمكن إضافة قراءة بداية متابعة بعد وجود قراءات سابقة.')
        }

        try {
            const result = await commitOdometerReadingV1({
                carId,
                readingData,
                allowCurrentBaseline
            })
            const newReading = mapFromDb(result.reading)
            if (!readings.value.some(item => String(item.id) === String(newReading.id))) {
                readings.value.push(newReading)
            }
            carStore.applyCommittedOdometer(result.car.current_odometer)
            return newReading
        } catch (err) {
            error.value = err.message
            console.error('Error adding reading:', err)
            throw err
        }
    }

    async function deleteReading(id) {
        try {
            const userId = await getUserId()
            const carId = useCarStore().car?.id
            if (!userId || !carId) throw new Error('تعذر تحديد حسابك وسيارتك لحذف القراءة بأمان.')
            const { error: err } = await supabase
                .from('odometer_readings')
                .delete()
                .eq('id', id)
                .eq('user_id', userId)
                .eq('car_id', carId)

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
            const userId = await getUserId()
            const carId = useCarStore().car?.id
            if (!userId || !carId) throw new Error('تعذر تحديد حسابك وسيارتك لحذف القراءات بأمان.')
            const { error: err } = await supabase
                .from('odometer_readings')
                .delete()
                .eq('user_id', userId)
                .eq('car_id', carId)

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
        insights,
        readingsWithDistance,
        fetchReadings,
        addReading,
        applyCommittedReading(reading) {
            if (readings.value.some(item => String(item.id) === String(reading.id))) return
            readings.value.push(mapFromDb(reading))
        },
        deleteReading,
        clearAllReadings
    }
})
