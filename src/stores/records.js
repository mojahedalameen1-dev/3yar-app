import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import dayjs from 'dayjs'

export const useRecordsStore = defineStore('records', () => {
    // State
    const records = ref(loadFromStorage())

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

    // Actions
    function loadFromStorage() {
        const stored = localStorage.getItem('maintenance_records')
        return stored ? JSON.parse(stored) : []
    }

    function saveToStorage() {
        localStorage.setItem('maintenance_records', JSON.stringify(records.value))
    }

    function addRecord(recordData) {
        const newRecord = {
            id: Date.now(),
            taskId: recordData.taskId,
            taskName: recordData.taskName,
            date: recordData.date || new Date().toISOString(),
            odometerReading: recordData.odometerReading || 0,
            cost: recordData.cost || 0,
            serviceCenter: recordData.serviceCenter || '',
            invoiceNumber: recordData.invoiceNumber || '',
            invoiceImage: recordData.invoiceImage || null,
            notes: recordData.notes || '',
            createdAt: new Date().toISOString()
        }

        records.value.push(newRecord)
        saveToStorage()
        return newRecord
    }

    function updateRecord(id, updates) {
        const index = records.value.findIndex(r => r.id === id)
        if (index !== -1) {
            records.value[index] = {
                ...records.value[index],
                ...updates,
                updatedAt: new Date().toISOString()
            }
            saveToStorage()
        }
    }

    function deleteRecord(id) {
        const index = records.value.findIndex(r => r.id === id)
        if (index !== -1) {
            records.value.splice(index, 1)
            saveToStorage()
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

    function clearAllRecords() {
        records.value = []
        saveToStorage()
    }

    return {
        records,
        sortedRecords,
        totalCost,
        thisMonthCost,
        thisYearCost,
        recordsByMonth,
        recentRecords,
        averageMaintenanceCost,
        stats,
        addRecord,
        updateRecord,
        deleteRecord,
        getRecordsByTask,
        filterRecords,
        clearAllRecords
    }
})
