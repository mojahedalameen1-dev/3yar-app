import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useCarStore } from './car'
import dayjs from 'dayjs'

export const useOdometerStore = defineStore('odometer', () => {
    // State
    const readings = ref(loadFromStorage())

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

    // Actions
    function loadFromStorage() {
        const stored = localStorage.getItem('odometer_readings')
        return stored ? JSON.parse(stored) : []
    }

    function saveToStorage() {
        localStorage.setItem('odometer_readings', JSON.stringify(readings.value))
    }

    function addReading(readingData) {
        const carStore = useCarStore()
        const currentOdometer = carStore.car?.currentOdometer || 0

        if (readingData.reading <= currentOdometer && readings.value.length > 0) {
            throw new Error('قراءة العداد يجب أن تكون أكبر من القراءة السابقة')
        }

        const newReading = {
            id: Date.now(),
            reading: readingData.reading,
            date: readingData.date || new Date().toISOString(),
            notes: readingData.notes || '',
            createdAt: new Date().toISOString()
        }

        readings.value.push(newReading)
        carStore.updateOdometer(readingData.reading)
        saveToStorage()

        return newReading
    }

    function deleteReading(id) {
        const index = readings.value.findIndex(r => r.id === id)
        if (index !== -1) {
            readings.value.splice(index, 1)
            saveToStorage()
        }
    }

    function clearAllReadings() {
        readings.value = []
        saveToStorage()
    }

    return {
        readings,
        sortedReadings,
        latestReading,
        totalDistance,
        averageDailyKm,
        readingsWithDistance,
        addReading,
        deleteReading,
        clearAllReadings
    }
})
