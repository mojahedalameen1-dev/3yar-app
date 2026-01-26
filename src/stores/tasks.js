import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useCarStore } from './car'
import { useOdometerStore } from './odometer'
import dayjs from 'dayjs'

export const useTasksStore = defineStore('tasks', () => {
    // State
    const tasks = ref([])
    const loading = ref(false)
    const error = ref(null)

    // Status constants
    const STATUS = {
        LATE: 'late',
        DUE: 'due',
        SOON: 'soon',
        GOOD: 'good'
    }

    const STATUS_LABELS = {
        late: 'متأخر',
        due: 'مستحق الآن',
        soon: 'قريب',
        good: 'على ما يرام'
    }

    const PRIORITY_LABELS = {
        high: 'عالية',
        medium: 'متوسطة',
        low: 'منخفضة'
    }

    // Helper function to calculate task status
    function calculateTaskStatus(task) {
        const carStore = useCarStore()
        const odometerStore = useOdometerStore()
        const currentOdometer = carStore.car?.currentOdometer || 0
        const today = dayjs()

        let distanceProgress = 0
        let timeProgress = 0
        let estimatedDate = null
        let kmRemaining = null
        let hasNoMaintenanceHistory = false

        const hasDistanceHistory = task.lastMaintenanceOdometer !== null
        const hasTimeHistory = task.lastMaintenanceDate !== null

        if (task.type === 'distance' || task.type === 'both') {
            if (hasDistanceHistory && task.intervalKm) {
                const kmSinceLast = currentOdometer - task.lastMaintenanceOdometer
                kmRemaining = Math.max(0, task.intervalKm - kmSinceLast)
                distanceProgress = (kmSinceLast / task.intervalKm) * 100

                if (odometerStore.averageDailyKm > 0 && kmRemaining > 0) {
                    const daysRemaining = Math.ceil(kmRemaining / odometerStore.averageDailyKm)
                    estimatedDate = dayjs().add(daysRemaining, 'day').toISOString()
                }
            } else if (!hasDistanceHistory && task.intervalKm) {
                hasNoMaintenanceHistory = true
                distanceProgress = 100
                kmRemaining = 0
            }
        }

        if (task.type === 'time' || task.type === 'both') {
            if (hasTimeHistory && task.intervalMonths) {
                const lastDate = dayjs(task.lastMaintenanceDate)
                const monthsSinceLast = today.diff(lastDate, 'month', true)
                timeProgress = (monthsSinceLast / task.intervalMonths) * 100
            } else if (!hasTimeHistory && task.intervalMonths) {
                hasNoMaintenanceHistory = true
                timeProgress = 100
            }
        }

        const progress = Math.max(distanceProgress, timeProgress)

        if (task.type === 'time' || task.type === 'both') {
            if (hasTimeHistory && task.intervalMonths) {
                const lastDate = dayjs(task.lastMaintenanceDate)
                const nextDueDate = lastDate.add(task.intervalMonths, 'month')

                if (estimatedDate) {
                    if (nextDueDate.isBefore(dayjs(estimatedDate))) {
                        estimatedDate = nextDueDate.toISOString()
                    }
                } else {
                    estimatedDate = nextDueDate.toISOString()
                }
            }
        }

        if (task.snoozedUntil && dayjs(task.snoozedUntil).isAfter(today)) {
            return {
                status: STATUS.GOOD,
                progress: Math.min(progress, 100),
                isSnoozed: true,
                snoozedUntil: task.snoozedUntil,
                kmRemaining,
                hasNoMaintenanceHistory
            }
        }

        let status
        if (progress >= 100 || hasNoMaintenanceHistory) {
            status = STATUS.LATE
        } else if (progress >= 90) {
            status = STATUS.DUE
        } else if (progress >= 75) {
            status = STATUS.SOON
        } else {
            status = STATUS.GOOD
        }

        return {
            status,
            progress: Math.min(progress, 150),
            isSnoozed: false,
            distanceProgress,
            timeProgress,
            estimatedDate,
            kmRemaining,
            hasNoMaintenanceHistory
        }
    }

    // Getters
    const tasksWithStatus = computed(() => {
        return tasks.value.map(task => ({
            ...task,
            statusInfo: calculateTaskStatus(task),
            priorityLabel: PRIORITY_LABELS[task.priority]
        }))
    })

    const sortedTasks = computed(() => {
        const statusOrder = { late: 0, due: 1, soon: 2, good: 3 }
        const priorityOrder = { high: 0, medium: 1, low: 2 }

        return [...tasksWithStatus.value].sort((a, b) => {
            const statusDiff = statusOrder[a.statusInfo.status] - statusOrder[b.statusInfo.status]
            if (statusDiff !== 0) return statusDiff
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
            if (priorityDiff !== 0) return priorityDiff
            return b.statusInfo.progress - a.statusInfo.progress
        })
    })

    const alertTasks = computed(() => {
        return sortedTasks.value.filter(
            task => task.statusInfo.status !== STATUS.GOOD && !task.statusInfo.isSnoozed
        )
    })

    const snoozedTasks = computed(() => {
        return tasksWithStatus.value.filter(task => task.statusInfo.isSnoozed)
    })

    const taskStats = computed(() => {
        const all = tasksWithStatus.value
        return {
            total: all.length,
            late: all.filter(t => t.statusInfo.status === STATUS.LATE).length,
            due: all.filter(t => t.statusInfo.status === STATUS.DUE).length,
            soon: all.filter(t => t.statusInfo.status === STATUS.SOON).length,
            good: all.filter(t => t.statusInfo.status === STATUS.GOOD).length,
            snoozed: snoozedTasks.value.length
        }
    })

    // Database mapping
    function mapFromDb(row) {
        return {
            id: row.id,
            name: row.name,
            type: row.type,
            intervalKm: row.interval_km,
            intervalMonths: row.interval_months,
            priority: row.priority,
            isRecurring: row.is_recurring,
            lastMaintenanceDate: row.last_maintenance_date,
            lastMaintenanceOdometer: row.last_maintenance_odometer,
            snoozedUntil: row.snoozed_until,
            createdAt: row.created_at
        }
    }

    function mapToDb(task) {
        return {
            name: task.name,
            type: task.type,
            interval_km: task.intervalKm || null,
            interval_months: task.intervalMonths || null,
            priority: task.priority || 'medium',
            is_recurring: task.isRecurring !== false,
            last_maintenance_date: task.lastMaintenanceDate || null,
            last_maintenance_odometer: task.lastMaintenanceOdometer || null,
            snoozed_until: task.snoozedUntil || null
        }
    }

    function getDefaultTasks() {
        return [
            { id: 1, name: 'تغيير الزيت', type: 'both', intervalKm: 5000, intervalMonths: 3, priority: 'high', isRecurring: true, lastMaintenanceDate: null, lastMaintenanceOdometer: null, snoozedUntil: null, createdAt: new Date().toISOString() },
            { id: 2, name: 'فحص الفرامل', type: 'distance', intervalKm: 20000, intervalMonths: null, priority: 'high', isRecurring: true, lastMaintenanceDate: null, lastMaintenanceOdometer: null, snoozedUntil: null, createdAt: new Date().toISOString() },
            { id: 3, name: 'تغيير فلتر الهواء', type: 'distance', intervalKm: 15000, intervalMonths: null, priority: 'medium', isRecurring: true, lastMaintenanceDate: null, lastMaintenanceOdometer: null, snoozedUntil: null, createdAt: new Date().toISOString() },
            { id: 4, name: 'فحص الإطارات', type: 'time', intervalKm: null, intervalMonths: 6, priority: 'medium', isRecurring: true, lastMaintenanceDate: null, lastMaintenanceOdometer: null, snoozedUntil: null, createdAt: new Date().toISOString() },
            { id: 5, name: 'تجديد الاستمارة', type: 'time', intervalKm: null, intervalMonths: 12, priority: 'high', isRecurring: true, lastMaintenanceDate: null, lastMaintenanceOdometer: null, snoozedUntil: null, createdAt: new Date().toISOString() }
        ]
    }

    // Actions
    async function fetchTasks() {
        loading.value = true
        error.value = null
        try {
            const { data, error: err } = await supabase
                .from('maintenance_tasks')
                .select('*')
                .order('created_at', { ascending: true })

            if (err) throw err

            if (data && data.length > 0) {
                tasks.value = data.map(mapFromDb)
            } else {
                // Try to migrate from localStorage only (no auto defaults)
                const stored = localStorage.getItem('maintenance_tasks')
                if (stored) {
                    const localTasks = JSON.parse(stored)
                    for (const task of localTasks) {
                        await addTask(task)
                    }
                    localStorage.removeItem('maintenance_tasks')
                }
                // Note: Default tasks are now only added through the Onboarding Wizard
                // This ensures new users start with a clean slate
            }
        } catch (err) {
            error.value = err.message
            console.error('Error fetching tasks:', err)
        } finally {
            loading.value = false
        }
    }

    async function addTask(taskData) {
        try {
            const { data, error: err } = await supabase
                .from('maintenance_tasks')
                .insert([mapToDb(taskData)])
                .select()
                .single()

            if (err) throw err

            const newTask = mapFromDb(data)
            tasks.value.push(newTask)
            return newTask
        } catch (err) {
            error.value = err.message
            console.error('Error adding task:', err)
            throw err
        }
    }

    async function updateTask(id, updates) {
        try {
            const dbUpdates = {}
            if (updates.name !== undefined) dbUpdates.name = updates.name
            if (updates.type !== undefined) dbUpdates.type = updates.type
            if (updates.intervalKm !== undefined) dbUpdates.interval_km = updates.intervalKm
            if (updates.intervalMonths !== undefined) dbUpdates.interval_months = updates.intervalMonths
            if (updates.priority !== undefined) dbUpdates.priority = updates.priority
            if (updates.isRecurring !== undefined) dbUpdates.is_recurring = updates.isRecurring
            if (updates.lastMaintenanceDate !== undefined) dbUpdates.last_maintenance_date = updates.lastMaintenanceDate
            if (updates.lastMaintenanceOdometer !== undefined) dbUpdates.last_maintenance_odometer = updates.lastMaintenanceOdometer
            if (updates.snoozedUntil !== undefined) dbUpdates.snoozed_until = updates.snoozedUntil

            const { data, error: err } = await supabase
                .from('maintenance_tasks')
                .update(dbUpdates)
                .eq('id', id)
                .select()
                .single()

            if (err) throw err

            const index = tasks.value.findIndex(t => t.id === id)
            if (index !== -1) {
                tasks.value[index] = mapFromDb(data)
            }
        } catch (err) {
            error.value = err.message
            console.error('Error updating task:', err)
            throw err
        }
    }

    async function deleteTask(id) {
        try {
            const { error: err } = await supabase
                .from('maintenance_tasks')
                .delete()
                .eq('id', id)

            if (err) throw err
            tasks.value = tasks.value.filter(t => t.id !== id)
        } catch (err) {
            error.value = err.message
            console.error('Error deleting task:', err)
            throw err
        }
    }

    async function snoozeTask(id, duration) {
        const durationMap = { 'day': 1, 'week': 7, 'twoWeeks': 14, 'month': 30 }
        const days = durationMap[duration] || 7
        const snoozedUntil = dayjs().add(days, 'day').toISOString()
        await updateTask(id, { snoozedUntil })
    }

    async function cancelSnooze(id) {
        await updateTask(id, { snoozedUntil: null })
    }

    async function recordMaintenance(taskId, maintenanceData) {
        const carStore = useCarStore()
        const currentOdometer = maintenanceData.odometer || carStore.car?.currentOdometer || 0
        const maintenanceDate = maintenanceData.date || new Date().toISOString()

        await updateTask(taskId, {
            lastMaintenanceDate: maintenanceDate,
            lastMaintenanceOdometer: currentOdometer,
            snoozedUntil: null
        })
    }

    async function resetTasks() {
        try {
            const { error: err } = await supabase
                .from('maintenance_tasks')
                .delete()
                .neq('id', 0)

            if (err) throw err

            tasks.value = []
            // Note: Default tasks are no longer auto-added here
            // Use addDefaultTasks() explicitly if needed
        } catch (err) {
            error.value = err.message
            console.error('Error resetting tasks:', err)
            throw err
        }
    }

    // Add default tasks explicitly (called from Wizard or Settings)
    async function addDefaultTasks() {
        const defaults = getDefaultTasks()
        for (const task of defaults) {
            await addTask(task)
        }
    }

    return {
        tasks,
        loading,
        error,
        STATUS,
        STATUS_LABELS,
        PRIORITY_LABELS,
        tasksWithStatus,
        sortedTasks,
        alertTasks,
        snoozedTasks,
        taskStats,
        fetchTasks,
        addTask,
        updateTask,
        deleteTask,
        snoozeTask,
        cancelSnooze,
        recordMaintenance,
        resetTasks,
        addDefaultTasks,
        calculateTaskStatus
    }
})
