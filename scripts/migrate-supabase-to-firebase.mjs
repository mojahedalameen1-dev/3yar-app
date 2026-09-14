import { config } from 'dotenv'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { cert, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

config({ path: '.env.local' })
config()

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'FIREBASE_SERVICE_ACCOUNT_PATH']
const missing = required.filter(name => !process.env[name])
if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`)

const serviceAccount = JSON.parse(
    await readFile(resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH), 'utf8')
)
const firebaseApp = initializeApp({ credential: cert(serviceAccount) })
const firebaseAuth = getAuth(firebaseApp)
const firestore = getFirestore(firebaseApp, process.env.FIREBASE_DATABASE_ID || '(default)')
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
})

const tables = [
    'profiles',
    'cars',
    'maintenance_tasks',
    'maintenance_records',
    'documents',
    'odometer_readings',
    'announcements',
    'announcement_reads',
    'activity_logs',
    'default_maintenance_templates'
]

function clean(value) {
    if (Array.isArray(value)) return value.map(clean)
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value)
            .filter(([, item]) => item !== undefined)
            .map(([key, item]) => [key, clean(item)]))
    }
    return value
}

function normalizeRelations(table, source) {
    const row = { ...source }
    if (row.id != null) row.id = String(row.id)
    if (row.car_id != null) row.car_id = String(row.car_id)
    if (row.task_id != null) row.task_id = String(row.task_id)
    if (row.announcement_id != null) row.announcement_id = String(row.announcement_id)
    if (table === 'profiles') row.id = row.user_id
    return clean(row)
}

async function migrateAuthUsers() {
    let page = 1
    let migrated = 0
    while (true) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
        if (error) throw error
        for (const sourceUser of data.users) {
            try {
                await firebaseAuth.getUser(sourceUser.id)
            } catch (error) {
                if (error.code !== 'auth/user-not-found') throw error
                await firebaseAuth.createUser({
                    uid: sourceUser.id,
                    email: sourceUser.email,
                    emailVerified: Boolean(sourceUser.email_confirmed_at),
                    displayName: sourceUser.user_metadata?.full_name || undefined
                })
            }
            migrated++
        }
        if (data.users.length < 1000) break
        page++
    }
    console.log(`Auth users prepared: ${migrated}. Passwords are not copied; users must reset them.`)
}

async function migrateTable(table) {
    let offset = 0
    let migrated = 0
    const pageSize = 500
    while (true) {
        const { data, error } = await supabase.from(table).select('*').range(offset, offset + pageSize - 1)
        if (error) {
            if (error.code === '42P01') {
                console.warn(`Skipping missing table: ${table}`)
                return
            }
            throw error
        }
        if (!data.length) break

        const batch = firestore.batch()
        data.forEach(row => {
            const id = table === 'profiles' ? row.user_id : String(row.id ?? `${row.user_id}_${row.announcement_id}`)
            batch.set(firestore.collection(table).doc(id), normalizeRelations(table, { ...row, id }), { merge: true })
        })
        await batch.commit()
        migrated += data.length
        if (data.length < pageSize) break
        offset += pageSize
    }
    console.log(`${table}: ${migrated} documents`)
}

async function syncAdminClaims() {
    const profiles = await firestore.collection('profiles').get()
    let admins = 0
    for (const profile of profiles.docs) {
        if (profile.data().role !== 'admin') continue
        const user = await firebaseAuth.getUser(profile.id)
        await firebaseAuth.setCustomUserClaims(user.uid, {
            ...user.customClaims,
            admin: true
        })
        admins++
    }
    console.log(`Admin claims synchronized: ${admins}`)
}

await migrateAuthUsers()
for (const table of tables) await migrateTable(table)
await syncAdminClaims()
console.log('Migration completed. Test authentication and core workflows before switching traffic.')
