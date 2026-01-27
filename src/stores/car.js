import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export const useCarStore = defineStore('car', () => {
    // State
    const car = ref(null)
    const loading = ref(false)
    const error = ref(null)

    // Getters
    const hasCar = computed(() => car.value !== null)

    const carInfo = computed(() => {
        if (!car.value) return null
        return {
            ...car.value,
            displayName: `${car.value.make} ${car.value.model} ${car.value.year}`
        }
    })

    // Reset store state
    function $reset() {
        car.value = null
        loading.value = false
        error.value = null
    }

    // Get current user ID from session
    async function getUserId() {
        const { data: { session } } = await supabase.auth.getSession()
        return session?.user?.id || null
    }

    // Actions
    async function fetchCar() {
        loading.value = true
        error.value = null
        try {
            const userId = await getUserId()
            if (!userId) {
                car.value = null
                return
            }

            const { data, error: err } = await supabase
                .from('cars')
                .select('*')
                .eq('user_id', userId)
                .limit(1)
                .maybeSingle()

            if (err) {
                throw err
            }

            if (data) {
                car.value = mapFromDb(data)
            } else {
                car.value = null
            }
        } catch (err) {
            error.value = err.message
            console.error('Error fetching car:', err)
        } finally {
            loading.value = false
        }
    }

    function mapFromDb(row) {
        return {
            id: row.id,
            make: row.make,
            model: row.model,
            year: row.year,
            plateNumber: row.plate_number,
            color: row.color,
            vin: row.vin,
            initialOdometer: row.initial_odometer,
            currentOdometer: row.current_odometer,
            image: row.image,
            notes: row.notes,
            publicShareEnabled: row.public_share_enabled,
            shareToken: row.share_token,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }
    }

    function mapToDb(carData) {
        return {
            make: carData.make,
            model: carData.model,
            year: carData.year,
            plate_number: carData.plateNumber,
            color: carData.color || '',
            vin: carData.vin || '',
            initial_odometer: carData.initialOdometer || 0,
            current_odometer: carData.currentOdometer || carData.initialOdometer || 0,
            image: carData.image || null,
            notes: carData.notes || ''
        }
    }

    async function addCar(carData) {
        loading.value = true
        error.value = null
        try {
            const userId = await getUserId()
            if (!userId) throw new Error('يجب تسجيل الدخول أولاً')

            const dbData = {
                ...mapToDb(carData),
                user_id: userId
            }

            const { data, error: err } = await supabase
                .from('cars')
                .insert([dbData])
                .select()
                .maybeSingle()

            if (err) throw err
            if (!data) {
                throw new Error('فشل في إضافة السيارة')
            }

            // Re-fetch to ensure sync
            await fetchCar()
            return car.value
        } catch (err) {
            error.value = err.message
            console.error('Error adding car:', err)
            throw err
        } finally {
            loading.value = false
        }
    }

    async function updateCar(updates) {
        if (!car.value || !car.value.id) {
            throw new Error('لا توجد سيارة للتحديث')
        }
        loading.value = true
        error.value = null
        try {
            const userId = await getUserId()
            if (!userId) throw new Error('يجب تسجيل الدخول أولاً')

            const dbUpdates = {}
            if (updates.make !== undefined) dbUpdates.make = updates.make
            if (updates.model !== undefined) dbUpdates.model = updates.model
            if (updates.year !== undefined) dbUpdates.year = updates.year
            if (updates.plateNumber !== undefined) dbUpdates.plate_number = updates.plateNumber
            if (updates.color !== undefined) dbUpdates.color = updates.color
            if (updates.vin !== undefined) dbUpdates.vin = updates.vin
            if (updates.initialOdometer !== undefined) dbUpdates.initial_odometer = updates.initialOdometer
            if (updates.currentOdometer !== undefined) dbUpdates.current_odometer = updates.currentOdometer
            if (updates.image !== undefined) dbUpdates.image = updates.image
            if (updates.notes !== undefined) dbUpdates.notes = updates.notes

            const { data, error: err } = await supabase
                .from('cars')
                .update(dbUpdates)
                .eq('id', car.value.id)
                .eq('user_id', userId)
                .select()
                .maybeSingle()

            if (err) throw err

            // Re-fetch to ensure sync with database
            await fetchCar()
            return car.value
        } catch (err) {
            error.value = err.message
            console.error('Error updating car:', err)
            throw err
        } finally {
            loading.value = false
        }
    }

    async function updateOdometer(reading) {
        if (car.value && reading > car.value.currentOdometer) {
            await updateCar({ currentOdometer: reading })
        }
    }

    async function deleteCar() {
        if (!car.value) return
        loading.value = true
        error.value = null
        try {
            const userId = await getUserId()
            if (!userId) throw new Error('يجب تسجيل الدخول أولاً')

            const { error: err } = await supabase
                .from('cars')
                .delete()
                .eq('id', car.value.id)
                .eq('user_id', userId)

            if (err) throw err
            car.value = null
        } catch (err) {
            error.value = err.message
            console.error('Error deleting car:', err)
            throw err
        } finally {
            loading.value = false
        }
    }

    return {
        car,
        loading,
        error,
        hasCar,
        carInfo,
        $reset,
        fetchCar,
        addCar,
        updateCar,
        updateOdometer,
        deleteCar
    }
})

