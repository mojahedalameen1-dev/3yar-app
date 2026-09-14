import { adminAuth, adminDb, requireUser, sendError } from './_firebase-admin.js'

async function deleteByUserId(db, userId) {
    const collections = ['profiles', 'cars', 'maintenance_tasks', 'maintenance_records', 'documents', 'odometer_readings', 'announcement_reads', 'activity_logs']
    for (const collectionName of collections) {
        const snapshots = await db.collection(collectionName).where('user_id', '==', userId).get()
        for (let offset = 0; offset < snapshots.docs.length; offset += 450) {
            const batch = db.batch()
            snapshots.docs.slice(offset, offset + 450).forEach(snapshot => batch.delete(snapshot.ref))
            await batch.commit()
        }
    }
}

export default async function handler(request, response) {
    if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' })
    try {
        const caller = await requireUser(request, { admin: true })
        const { operation, args = {} } = request.body || {}
        const db = adminDb()

        if (operation === 'createUserProfileAdmin') {
            if (!args.new_user_id) return response.status(400).json({ error: 'User UID is required' })
            const now = new Date().toISOString()
            await db.collection('profiles').doc(args.new_user_id).set({
                id: args.new_user_id,
                user_id: args.new_user_id,
                first_name: args.first_name || '',
                last_name: args.last_name || '',
                phone: args.phone || '',
                email: args.email || '',
                role: args.role || 'user',
                created_at: now,
                updated_at: now
            }, { merge: true })
            return response.status(200).json({ success: true })
        }

        if (operation === 'deleteUserByAdmin') {
            if (!args.target_user_id || args.target_user_id === caller.uid) {
                return response.status(400).json({ error: 'Invalid target user' })
            }
            await deleteByUserId(db, args.target_user_id)
            try { await adminAuth().deleteUser(args.target_user_id) }
            catch (error) { if (error.code !== 'auth/user-not-found') throw error }
            return response.status(200).json({ success: true })
        }

        return response.status(400).json({ error: 'Unsupported operation' })
    } catch (error) {
        sendError(response, error)
    }
}
