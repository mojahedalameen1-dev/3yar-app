import { config } from 'dotenv'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { cert, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

config({ path: '.env.local', quiet: true })

const serviceAccount = JSON.parse(await readFile(resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH), 'utf8'))
const app = initializeApp({ credential: cert(serviceAccount) }, 'verification')
const firestore = getFirestore(app, process.env.FIREBASE_DATABASE_ID || '(default)')
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
})

const tables = [
    'profiles', 'cars', 'maintenance_tasks', 'maintenance_records', 'documents',
    'odometer_readings', 'announcements', 'announcement_reads', 'activity_logs',
    'default_maintenance_templates'
]

let matches = true
for (const table of tables) {
    const [{ count, error }, destination] = await Promise.all([
        supabase.from(table).select('*', { count: 'exact', head: true }),
        firestore.collection(table).count().get()
    ])
    if (error?.code === '42P01') continue
    if (error) throw error
    const firebaseCount = destination.data().count
    const equal = count === firebaseCount
    matches &&= equal
    console.log(`${table}: source=${count}, destination=${firebaseCount}, match=${equal}`)
}

const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
if (bucketError) throw bucketError
console.log(`Storage buckets: ${buckets.length}`)
for (const bucket of buckets) {
    const { data, error } = await supabase.storage.from(bucket.name).list('', { limit: 1000 })
    if (error) throw error
    console.log(`Storage ${bucket.name}: top-level entries=${data.length}`)
}

console.log(`All table counts match: ${matches}`)
