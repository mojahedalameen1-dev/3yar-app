import { collection, doc, runTransaction } from 'firebase/firestore'
import { firebaseAuth, firestore } from './firebase'

function validReading(value) {
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return null
    if (typeof value !== 'number' && typeof value !== 'string') return null
    const reading = Number(value)
    return Number.isFinite(reading) && reading >= 0 ? reading : null
}

function toIsoDate(value, label) {
    let date
    try {
        if (value instanceof Date) date = new Date(value.getTime())
        else if (value && typeof value.toDate === 'function') date = value.toDate()
        else date = value ? new Date(value) : new Date()
    } catch {
        date = null
    }
    if (!(date instanceof Date) || !Number.isFinite(date.getTime())) throw new Error(`${label} غير صالح.`)
    return date.toISOString()
}

/** Atomically appends one V1 reading and monotonically updates the car projection. */
export async function commitOdometerReadingV1({ carId, readingData, allowCurrentBaseline = false }) {
    const user = firebaseAuth.currentUser
    if (!user) throw new Error('انتهت جلسة الدخول. سجّل الدخول ثم أعد المحاولة.')
    if (!carId) throw new Error('تعذر تحديد السيارة لحفظ القراءة بأمان.')

    const reading = validReading(readingData?.reading)
    if (reading === null) throw new Error('أدخل قراءة عداد صحيحة تساوي صفرًا أو أكثر.')

    const date = toIsoDate(readingData?.date, 'تاريخ القراءة')
    const createdAt = new Date().toISOString()
    const carRef = doc(firestore, 'cars', String(carId))
    // The onboarding baseline has a stable ID so an interrupted retry reuses one document.
    // Do not read it first: Firestore owner rules cannot authorize get() on a missing
    // document because it has no user_id/car_id to evaluate. The transaction already
    // verifies car ownership, and the deterministic set remains subject to create/update
    // rules for the reading itself.
    const readingRef = allowCurrentBaseline
        ? doc(firestore, 'odometer_readings', `initial_${String(carId)}`)
        : doc(collection(firestore, 'odometer_readings'))

    return runTransaction(firestore, async transaction => {
        const carSnapshot = await transaction.get(carRef)
        if (!carSnapshot.exists()) throw new Error('تعذر العثور على السيارة.')
        const car = carSnapshot.data()
        if (car.user_id !== user.uid || car.deletion_requested === true) {
            throw new Error('لا تملك صلاحية تحديث عداد هذه السيارة.')
        }

        const currentOdometer = Number(car.current_odometer ?? 0)
        if (!Number.isFinite(currentOdometer) || currentOdometer < 0) {
            throw new Error('قراءة العداد الحالية غير صالحة. حدّث بيانات السيارة قبل المتابعة.')
        }
        if (reading < currentOdometer || (reading === currentOdometer && !allowCurrentBaseline)) {
            throw new Error('يجب أن تكون القراءة أعلى من العداد الحالي؛ لا تُسجّل قراءة مكررة.')
        }

        if (allowCurrentBaseline) {
            if (reading !== currentOdometer) {
                throw new Error('قراءة بداية المتابعة يجب أن تطابق العداد الحالي.')
            }
        }

        const row = {
            id: readingRef.id,
            user_id: user.uid,
            car_id: String(carId),
            reading,
            date,
            notes: String(readingData?.notes || ''),
            created_at: createdAt
        }
        transaction.set(readingRef, row)
        if (reading > currentOdometer) {
            transaction.update(carRef, { current_odometer: reading, updated_at: createdAt })
        }

        return {
            reading: row,
            car: { id: String(carId), current_odometer: Math.max(currentOdometer, reading) }
        }
    })
}
