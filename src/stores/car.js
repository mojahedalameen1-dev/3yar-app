import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export const useCarStore = defineStore('car', () => {
    // State
    const car = ref(loadFromStorage())

    // Getters
    const hasCar = computed(() => car.value !== null)

    const carInfo = computed(() => {
        if (!car.value) return null
        return {
            ...car.value,
            displayName: `${car.value.make} ${car.value.model} ${car.value.year}`
        }
    })

    // Actions
    function loadFromStorage() {
        // Try to recover data from multi-car storage if simple storage is empty
        const stored = localStorage.getItem('car_data')
        if (!stored) {
            const multiStored = localStorage.getItem('cars_data')
            if (multiStored) {
                const cars = JSON.parse(multiStored)
                const activeId = localStorage.getItem('active_car_id')
                if (cars.length > 0) {
                    // Return the active car or the first one found
                    return activeId ? (cars.find(c => c.id == activeId) || cars[0]) : cars[0]
                }
            }
            return null
        }
        return JSON.parse(stored)
    }

    function saveToStorage() {
        if (car.value) {
            localStorage.setItem('car_data', JSON.stringify(car.value))
        } else {
            localStorage.removeItem('car_data')
        }
    }

    function addCar(carData) {
        car.value = {
            id: Date.now(),
            make: carData.make,
            model: carData.model,
            year: carData.year,
            plateNumber: carData.plateNumber,
            color: carData.color || '',
            vin: carData.vin || '',
            initialOdometer: carData.initialOdometer || 0,
            currentOdometer: carData.initialOdometer || 0,
            image: carData.image || null,
            notes: carData.notes || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
        saveToStorage()
    }

    function updateCar(updates) {
        if (car.value) {
            car.value = {
                ...car.value,
                ...updates,
                updatedAt: new Date().toISOString()
            }
            saveToStorage()
        }
    }

    function updateOdometer(reading) {
        if (car.value && reading > car.value.currentOdometer) {
            car.value.currentOdometer = reading
            car.value.updatedAt = new Date().toISOString()
            saveToStorage()
        }
    }

    function deleteCar() {
        car.value = null
        saveToStorage()
    }

    // Watch for external changes
    watch(car, saveToStorage, { deep: true })

    return {
        car,
        hasCar,
        carInfo,
        addCar,
        updateCar,
        updateOdometer,
        deleteCar
    }
})
