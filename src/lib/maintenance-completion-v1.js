import { collection, doc, runTransaction } from 'firebase/firestore'
import { firebaseAuth, firestore } from './firebase'
import { MAINTENANCE_BASELINE_TYPE } from './maintenance-baseline-v1'

function requiredNumber(value, fieldLabel) {
    const number = Number(value)
    if (!Number.isFinite(number) || number < 0) throw new Error(`${fieldLabel} غير صالح.`)
    return number
}

/** Keep the historical record, task state, odometer history, and car projection atomic. */
export async function commitMaintenanceCompletionV1({ taskId, record }) {
    const user = firebaseAuth.currentUser
    if (!user) throw new Error('انتهت جلسة الدخول. سجّل الدخول ثم أعد المحاولة.')

    const taskRef = doc(firestore, 'maintenance_tasks', String(taskId))
    const recordRef = doc(collection(firestore, 'maintenance_records'))
    const readingRef = doc(collection(firestore, 'odometer_readings'))
    const completedAt = record.date || new Date().toISOString()
    const odometerReading = requiredNumber(record.odometerReading, 'قراءة العداد')
    const cost = requiredNumber(record.cost ?? 0, 'التكلفة')

    return runTransaction(firestore, async transaction => {
        const taskSnapshot = await transaction.get(taskRef)
        if (!taskSnapshot.exists()) throw new Error('تعذر العثور على مهمة الصيانة.')
        const task = taskSnapshot.data()
        if (task.user_id !== user.uid || !task.car_id) {
            throw new Error('لا تملك صلاحية تسجيل الصيانة لهذه المهمة.')
        }

        const carRef = doc(firestore, 'cars', String(task.car_id))
        const carSnapshot = await transaction.get(carRef)
        if (!carSnapshot.exists() || carSnapshot.data().user_id !== user.uid || carSnapshot.data().deletion_requested === true) {
            throw new Error('تعذر التحقق من ملكية السيارة المرتبطة بالمهمة.')
        }

        const car = carSnapshot.data()
        const createdAt = new Date().toISOString()
        const completedRecord = {
            id: recordRef.id,
            user_id: user.uid,
            car_id: task.car_id,
            task_id: String(taskId),
            task_name: task.name,
            date: completedAt,
            odometer_reading: odometerReading,
            cost,
            service_center: record.serviceCenter || '',
            invoice_number: record.invoiceNumber || '',
            invoice_image: record.invoiceImage || null,
            notes: record.notes || '',
            created_at: createdAt
        }
        const odometerEntry = {
            id: readingRef.id,
            user_id: user.uid,
            car_id: task.car_id,
            reading: odometerReading,
            date: completedAt,
            notes: `قراءة عند تسجيل صيانة: ${task.name}`,
            source_record_id: recordRef.id,
            created_at: createdAt
        }

        transaction.set(recordRef, completedRecord)
        transaction.set(readingRef, odometerEntry)
        transaction.update(taskRef, {
            last_maintenance_date: completedAt,
            last_maintenance_odometer: odometerReading,
            baseline_type: MAINTENANCE_BASELINE_TYPE.MAINTENANCE_RECORD,
            snoozed_until: null,
            updated_at: completedAt
        })
        if (odometerReading > Number(car.current_odometer || 0)) {
            transaction.update(carRef, { current_odometer: odometerReading, updated_at: completedAt })
        }

        return {
            record: completedRecord,
            reading: odometerEntry,
            task: {
                id: String(taskId),
                last_maintenance_date: completedAt,
                last_maintenance_odometer: odometerReading,
                baseline_type: MAINTENANCE_BASELINE_TYPE.MAINTENANCE_RECORD,
                snoozed_until: null
            },
            car: { id: String(task.car_id), current_odometer: Math.max(Number(car.current_odometer || 0), odometerReading) }
        }
    })
}
