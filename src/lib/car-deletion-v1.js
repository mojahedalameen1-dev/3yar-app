import { collection, doc, getDoc, getDocs, query, updateDoc, where, writeBatch } from 'firebase/firestore'
import { firebaseAuth, firestore } from './firebase'

const CHILD_COLLECTIONS = ['maintenance_tasks', 'maintenance_records', 'odometer_readings', 'documents']
const MAX_ATOMIC_DELETION_WRITES = 450

async function readCarChildren(userId, carId) {
    const snapshots = await Promise.all(CHILD_COLLECTIONS.map(collectionName => getDocs(query(
        collection(firestore, collectionName),
        where('user_id', '==', userId),
        where('car_id', '==', carId)
    ))))
    return snapshots.flatMap(snapshot => snapshot.docs)
}

/** Deletes a car and its V1 data in a single bounded batch after blocking new child writes. */
export async function deleteCarDataV1(carId) {
    const user = firebaseAuth.currentUser
    if (!user) throw new Error('انتهت جلسة الدخول. سجّل الدخول ثم أعد المحاولة.')
    if (!carId) throw new Error('تعذر تحديد السيارة المراد حذفها.')

    const normalizedCarId = String(carId)
    const carRef = doc(firestore, 'cars', normalizedCarId)
    const carSnapshot = await getDoc(carRef)
    if (!carSnapshot.exists() || carSnapshot.data().user_id !== user.uid) {
        throw new Error('السيارة غير موجودة أو لا تملك صلاحية حذفها.')
    }

    if (carSnapshot.data().deletion_requested !== true) {
        await updateDoc(carRef, { deletion_requested: true, updated_at: new Date().toISOString() })
    }

    try {
        const children = await readCarChildren(user.uid, normalizedCarId)
        if (children.length + 1 > MAX_ATOMIC_DELETION_WRITES) {
            throw new Error('تحتوي السيارة على بيانات أكثر من الحد الآمن للحذف مرة واحدة. لم تُحذف أي بيانات؛ تواصل مع الدعم.')
        }

        const batch = writeBatch(firestore)
        children.forEach(child => batch.delete(child.ref))
        batch.delete(carRef)
        await batch.commit()
        return { deletedChildren: children.length }
    } catch (error) {
        // Preserve the deletion marker if recovery fails; a retry can resume safely.
        try {
            const currentCar = await getDoc(carRef)
            if (currentCar.exists() && currentCar.data().deletion_requested === true) {
                await updateDoc(carRef, { deletion_requested: false, updated_at: new Date().toISOString() })
            }
        } catch {
            // Do not report success; the owner can retry from the marked car.
        }
        throw error
    }
}
