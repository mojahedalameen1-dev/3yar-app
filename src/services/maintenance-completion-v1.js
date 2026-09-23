import { commitMaintenanceCompletionV1 } from '@/lib/maintenance-completion-v1'
import { useCarStore } from '@/stores/car'
import { useOdometerStore } from '@/stores/odometer'
import { useRecordsStore } from '@/stores/records'
import { useTasksStore } from '@/stores/tasks'

/** Shared V1 completion flow used by dashboard and task list. */
export async function completeMaintenanceV1(task, formData) {
    const result = await commitMaintenanceCompletionV1({
        taskId: task.id,
        record: {
            date: new Date().toISOString(),
            odometerReading: formData.odometerReading,
            cost: formData.cost,
            serviceCenter: formData.serviceCenter,
            notes: formData.notes
        }
    })

    useTasksStore().applyMaintenanceCompletion(result.task.id, result.task)
    useRecordsStore().applyCommittedRecord(result.record)
    useOdometerStore().applyCommittedReading(result.reading)
    useCarStore().applyCommittedOdometer(result.car.current_odometer)
    return result.record
}
