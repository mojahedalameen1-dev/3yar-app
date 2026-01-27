import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import dayjs from 'dayjs'

export const useRecordsStore = defineStore('records', () => {
    // State
    const records = ref([])
    const loading = ref(false)
    const error = ref(null)

    // Reset store state
    function $reset() {
        records.value = []
        loading.value = false
        error.value = null
    }

    // Get current user ID from session
    async function getUserId() {
        const { data: { session } } = await supabase.auth.getSession()
        return session?.user?.id || null
    }

    // Getters
    const sortedRecords = computed(() => {
        return [...records.value].sort((a, b) =>
            new Date(b.date) - new Date(a.date)
        )
    })

    const totalCost = computed(() => {
        return records.value.reduce((sum, record) => sum + (record.cost || 0), 0)
    })

    const thisMonthCost = computed(() => {
        const startOfMonth = dayjs().startOf('month')
        return records.value
            .filter(r => dayjs(r.date).isAfter(startOfMonth))
            .reduce((sum, r) => sum + (r.cost || 0), 0)
    })

    const thisYearCost = computed(() => {
        const startOfYear = dayjs().startOf('year')
        return records.value
            .filter(r => dayjs(r.date).isAfter(startOfYear))
            .reduce((sum, r) => sum + (r.cost || 0), 0)
    })

    const recordsByMonth = computed(() => {
        const grouped = {}
        records.value.forEach(record => {
            const monthKey = dayjs(record.date).format('YYYY-MM')
            if (!grouped[monthKey]) {
                grouped[monthKey] = {
                    month: dayjs(record.date).format('MMMM YYYY'),
                    records: [],
                    totalCost: 0
                }
            }
            grouped[monthKey].records.push(record)
            grouped[monthKey].totalCost += record.cost || 0
        })

        return Object.values(grouped).sort((a, b) =>
            new Date(b.records[0].date) - new Date(a.records[0].date)
        )
    })

    const recentRecords = computed(() => {
        return sortedRecords.value.slice(0, 5)
    })

    const averageMaintenanceCost = computed(() => {
        if (records.value.length === 0) return 0
        return Math.round(totalCost.value / records.value.length)
    })

    const stats = computed(() => ({
        totalRecords: records.value.length,
        totalCost: totalCost.value,
        thisMonthCost: thisMonthCost.value,
        thisYearCost: thisYearCost.value,
        averageCost: averageMaintenanceCost.value
    }))

    // Database mapping
    function mapFromDb(row) {
        return {
            id: row.id,
            taskId: row.task_id,
            taskName: row.task_name,
            date: row.date,
            odometerReading: row.odometer_reading,
            cost: row.cost,
            serviceCenter: row.service_center,
            invoiceNumber: row.invoice_number,
            invoiceImage: row.invoice_image,
            notes: row.notes,
            createdAt: row.created_at
        }
    }

    function mapToDb(record) {
        return {
            task_id: record.taskId,
            task_name: record.taskName,
            date: record.date || new Date().toISOString(),
            odometer_reading: record.odometerReading || 0,
            cost: record.cost || 0,
            service_center: record.serviceCenter || '',
            invoice_number: record.invoiceNumber || '',
            invoice_image: record.invoiceImage || null,
            notes: record.notes || ''
        }
    }

    // Actions
    async function fetchRecords() {
        loading.value = true
        error.value = null
        try {
            const userId = await getUserId()
            if (!userId) {
                records.value = []
                return
            }

            const { data, error: err } = await supabase
                .from('maintenance_records')
                .select('*')
                .eq('user_id', userId)
                .order('date', { ascending: false })

            if (err) throw err

            records.value = data ? data.map(mapFromDb) : []
        } catch (err) {
            error.value = err.message
            console.error('Error fetching records:', err)
        } finally {
            loading.value = false
        }
    }

    async function addRecord(recordData) {
        loading.value = true
        error.value = null
        try {
            const { data, error: err } = await supabase
                .from('maintenance_records')
                .insert([mapToDb(recordData)])
                .select()
                .maybeSingle()

            if (err) throw err

            const newRecord = mapFromDb(data)
            records.value.push(newRecord)
            return newRecord
        } catch (err) {
            error.value = err.message
            console.error('Error adding record:', err)
            throw err
        } finally {
            loading.value = false
        }
    }

    async function updateRecord(id, updates) {
        loading.value = true
        error.value = null
        try {
            const dbUpdates = {}
            if (updates.taskId !== undefined) dbUpdates.task_id = updates.taskId
            if (updates.taskName !== undefined) dbUpdates.task_name = updates.taskName
            if (updates.date !== undefined) dbUpdates.date = updates.date
            if (updates.odometerReading !== undefined) dbUpdates.odometer_reading = updates.odometerReading
            if (updates.cost !== undefined) dbUpdates.cost = updates.cost
            if (updates.serviceCenter !== undefined) dbUpdates.service_center = updates.serviceCenter
            if (updates.invoiceNumber !== undefined) dbUpdates.invoice_number = updates.invoiceNumber
            if (updates.invoiceImage !== undefined) dbUpdates.invoice_image = updates.invoiceImage
            if (updates.notes !== undefined) dbUpdates.notes = updates.notes

            const { data, error: err } = await supabase
                .from('maintenance_records')
                .update(dbUpdates)
                .eq('id', id)
                .select()
                .maybeSingle()

            if (err) throw err

            const index = records.value.findIndex(r => r.id === id)
            if (index !== -1) {
                records.value[index] = mapFromDb(data)
            }
        } catch (err) {
            error.value = err.message
            console.error('Error updating record:', err)
            throw err
        } finally {
            loading.value = false
        }
    }

    async function deleteRecord(id) {
        loading.value = true
        error.value = null
        try {
            const { error: err } = await supabase
                .from('maintenance_records')
                .delete()
                .eq('id', id)

            if (err) throw err

            records.value = records.value.filter(r => r.id !== id)
        } catch (err) {
            error.value = err.message
            console.error('Error deleting record:', err)
            throw err
        } finally {
            loading.value = false
        }
    }

    function getRecordsByTask(taskId) {
        return records.value.filter(r => r.taskId === taskId)
    }

    function filterRecords({ startDate, endDate, taskName, minCost, maxCost }) {
        return sortedRecords.value.filter(record => {
            if (startDate && dayjs(record.date).isBefore(startDate)) return false
            if (endDate && dayjs(record.date).isAfter(endDate)) return false
            if (taskName && !record.taskName.includes(taskName)) return false
            if (minCost !== undefined && record.cost < minCost) return false
            if (maxCost !== undefined && record.cost > maxCost) return false
            return true
        })
    }

    async function clearAllRecords() {
        loading.value = true
        error.value = null
        try {
            const { error: err } = await supabase
                .from('maintenance_records')
                .delete()
                .neq('id', 0) // Delete all

            if (err) throw err
            records.value = []
        } catch (err) {
            error.value = err.message
            console.error('Error clearing records:', err)
            throw err
        } finally {
            loading.value = false
        }
    }

    return {
        records,
        loading,
        error,
        $reset,
        sortedRecords,
        totalCost,
        thisMonthCost,
        thisYearCost,
        recordsByMonth,
        recentRecords,
        averageMaintenanceCost,
        stats,
        fetchRecords,
        addRecord,
        updateRecord,
        deleteRecord,
        getRecordsByTask,
        filterRecords,
        clearAllRecords
    }
})
