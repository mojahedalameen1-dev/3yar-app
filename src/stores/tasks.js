import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useCarStore } from './car'
import { useOdometerStore } from './odometer'
import dayjs from 'dayjs'

export const useTasksStore = defineStore('tasks', () => {
    // State
    const tasks = ref(loadFromStorage())

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

        // Check if task has never been performed
        const hasDistanceHistory = task.lastMaintenanceOdometer !== null
        const hasTimeHistory = task.lastMaintenanceDate !== null

        // Calculate distance progress & estimate date
        if (task.type === 'distance' || task.type === 'both') {
            if (hasDistanceHistory && task.intervalKm) {
                const kmSinceLast = currentOdometer - task.lastMaintenanceOdometer
                kmRemaining = Math.max(0, task.intervalKm - kmSinceLast)
                distanceProgress = (kmSinceLast / task.intervalKm) * 100

                // Calculate estimated date if we have daily average
                if (odometerStore.averageDailyKm > 0 && kmRemaining > 0) {
                    const daysRemaining = Math.ceil(kmRemaining / odometerStore.averageDailyKm)
                    estimatedDate = dayjs().add(daysRemaining, 'day').toISOString()
                }
            } else if (!hasDistanceHistory && task.intervalKm) {
                // No maintenance history - treat as overdue
                hasNoMaintenanceHistory = true
                distanceProgress = 100
                kmRemaining = 0
            }
        }

        // Calculate time progress
        if (task.type === 'time' || task.type === 'both') {
            if (hasTimeHistory && task.intervalMonths) {
                const lastDate = dayjs(task.lastMaintenanceDate)
                const monthsSinceLast = today.diff(lastDate, 'month', true)
                timeProgress = (monthsSinceLast / task.intervalMonths) * 100
            } else if (!hasTimeHistory && task.intervalMonths) {
                // No maintenance history - treat as overdue
                hasNoMaintenanceHistory = true
                timeProgress = 100
            }
        }

        // Use the higher progress value
        const progress = Math.max(distanceProgress, timeProgress)

        // If time-based date is sooner (or exists and distance doesn't), use it for estimation
        if (task.type === 'time' || task.type === 'both') {
            if (hasTimeHistory && task.intervalMonths) {
                const lastDate = dayjs(task.lastMaintenanceDate)
                const nextDueDate = lastDate.add(task.intervalMonths, 'month')

                // If we have both estimates, take the sooner one
                if (estimatedDate) {
                    if (nextDueDate.isBefore(dayjs(estimatedDate))) {
                        estimatedDate = nextDueDate.toISOString()
                    }
                } else {
                    estimatedDate = nextDueDate.toISOString()
                }
            }
        }

        // Check for snooze
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

        // Determine status based on progress
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
            progress: Math.min(progress, 150), // Cap at 150% for display
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
            // First sort by status
            const statusDiff = statusOrder[a.statusInfo.status] - statusOrder[b.statusInfo.status]
            if (statusDiff !== 0) return statusDiff

            // Then by priority
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
            if (priorityDiff !== 0) return priorityDiff

            // Then by progress (higher first)
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

    // Actions
    function loadFromStorage() {
        const stored = localStorage.getItem('maintenance_tasks')
        return stored ? JSON.parse(stored) : getDefaultTasks()
    }

    function saveToStorage() {
        localStorage.setItem('maintenance_tasks', JSON.stringify(tasks.value))
    }

    function getDefaultTasks() {
        return [
            {
                id: 1,
                name: 'تغيير الزيت',
                type: 'both',
                intervalKm: 5000,
                intervalMonths: 3,
                priority: 'high',
                isRecurring: true,
                lastMaintenanceDate: null,
                lastMaintenanceOdometer: null,
                snoozedUntil: null,
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                name: 'فحص الفرامل',
                type: 'distance',
                intervalKm: 20000,
                intervalMonths: null,
                priority: 'high',
                isRecurring: true,
                lastMaintenanceDate: null,
                lastMaintenanceOdometer: null,
                snoozedUntil: null,
                createdAt: new Date().toISOString()
            },
            {
                id: 3,
                name: 'تغيير فلتر الهواء',
                type: 'distance',
                intervalKm: 15000,
                intervalMonths: null,
                priority: 'medium',
                isRecurring: true,
                lastMaintenanceDate: null,
                lastMaintenanceOdometer: null,
                snoozedUntil: null,
                createdAt: new Date().toISOString()
            },
            {
                id: 4,
                name: 'فحص الإطارات',
                type: 'time',
                intervalKm: null,
                intervalMonths: 6,
                priority: 'medium',
                isRecurring: true,
                lastMaintenanceDate: null,
                lastMaintenanceOdometer: null,
                snoozedUntil: null,
                createdAt: new Date().toISOString()
            },
            {
                id: 5,
                name: 'تجديد الاستمارة',
                type: 'time',
                intervalKm: null,
                intervalMonths: 12,
                priority: 'high',
                isRecurring: true,
                lastMaintenanceDate: null,
                lastMaintenanceOdometer: null,
                snoozedUntil: null,
                createdAt: new Date().toISOString()
            }
        ]
    }

    function addTask(taskData) {
        const newTask = {
            id: Date.now(),
            name: taskData.name,
            type: taskData.type,
            intervalKm: taskData.intervalKm || null,
            intervalMonths: taskData.intervalMonths || null,
            priority: taskData.priority || 'medium',
            isRecurring: taskData.isRecurring !== false,
            lastMaintenanceDate: taskData.lastMaintenanceDate || null,
            lastMaintenanceOdometer: taskData.lastMaintenanceOdometer || null,
            snoozedUntil: null,
            createdAt: new Date().toISOString()
        }

        tasks.value.push(newTask)
        saveToStorage()
        return newTask
    }

    function updateTask(id, updates) {
        const index = tasks.value.findIndex(t => t.id === id)
        if (index !== -1) {
            tasks.value[index] = {
                ...tasks.value[index],
                ...updates,
                updatedAt: new Date().toISOString()
            }
            saveToStorage()
        }
    }

    function deleteTask(id) {
        const index = tasks.value.findIndex(t => t.id === id)
        if (index !== -1) {
            tasks.value.splice(index, 1)
            saveToStorage()
        }
    }

    function snoozeTask(id, duration) {
        const durationMap = {
            'day': 1,
            'week': 7,
            'twoWeeks': 14,
            'month': 30
        }

        const days = durationMap[duration] || 7
        const snoozedUntil = dayjs().add(days, 'day').toISOString()

        updateTask(id, { snoozedUntil })
    }

    function cancelSnooze(id) {
        updateTask(id, { snoozedUntil: null })
    }

    function recordMaintenance(taskId, maintenanceData) {
        const carStore = useCarStore()
        const currentOdometer = maintenanceData.odometer || carStore.car?.currentOdometer || 0
        const maintenanceDate = maintenanceData.date || new Date().toISOString()

        updateTask(taskId, {
            lastMaintenanceDate: maintenanceDate,
            lastMaintenanceOdometer: currentOdometer,
            snoozedUntil: null
        })
    }

    function resetTasks() {
        tasks.value = getDefaultTasks()
        saveToStorage()
    }

    return {
        tasks,
        STATUS,
        STATUS_LABELS,
        PRIORITY_LABELS,
        tasksWithStatus,
        sortedTasks,
        alertTasks,
        snoozedTasks,
        taskStats,
        addTask,
        updateTask,
        deleteTask,
        snoozeTask,
        cancelSnooze,
        recordMaintenance,
        resetTasks,
        calculateTaskStatus
    }
})
