import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import dotenv from 'dotenv'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

dotenv.config({ path: resolve('.env.local') })

const COLLECTIONS = Object.freeze([
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
])

function argumentValue(name) {
  const prefix = `--${name}=`
  const entry = process.argv.slice(2).find(argument => argument.startsWith(prefix))
  return entry ? entry.slice(prefix.length) : null
}

function assertTarget(target, expectedProjectId, credentials) {
  if (target !== 'production-read-only') {
    throw new Error('Specify --target=production-read-only to permit a production read-only audit.')
  }
  if (!expectedProjectId || credentials.project_id !== expectedProjectId) {
    throw new Error('The expected project ID does not match the configured Firebase credentials.')
  }
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('A production audit cannot run while a Firestore Emulator host is configured.')
  }
}

async function readCollection(db, name, fields) {
  let query = db.collection(name)
  if (fields.length) query = query.select(...fields)
  const snapshot = await query.get()
  return snapshot.docs.map(document => ({ ...document.data(), _documentId: document.id }))
}

function countByOwner(cars) {
  const counts = {}
  for (const car of cars) {
    if (!car.user_id) continue
    counts[car.user_id] = (counts[car.user_id] || 0) + 1
  }
  return Object.values(counts).filter(count => count > 1).length
}

async function main() {
  const target = argumentValue('target')
  const expectedProjectId = argumentValue('expected-project')
  const credentialsPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  if (!credentialsPath) throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH is required for the read-only audit.')

  const credentials = JSON.parse(await readFile(resolve(credentialsPath), 'utf8'))
  assertTarget(target, expectedProjectId, credentials)

  const app = getApps()[0] || initializeApp({ credential: cert(credentials), projectId: credentials.project_id })
  const db = getFirestore(app, process.env.FIREBASE_DATABASE_ID || '(default)')
  const fields = {
    cars: ['user_id', 'schema_version', 'public_share_enabled'],
    maintenance_tasks: ['user_id', 'car_id', 'schema_version', 'last_maintenance_date', 'last_maintenance_odometer'],
    maintenance_records: ['user_id', 'car_id', 'schema_version', 'items', 'task_id'],
    documents: ['user_id', 'car_id', 'schema_version'],
    odometer_readings: ['user_id', 'car_id', 'schema_version'],
    profiles: ['user_id', 'schema_version'],
    announcements: [],
    announcement_reads: ['user_id'],
    activity_logs: ['user_id'],
    default_maintenance_templates: []
  }

  const snapshots = Object.fromEntries(await Promise.all(COLLECTIONS.map(async collection => [
    collection,
    await readCollection(db, collection, fields[collection] || [])
  ])))

  const cars = snapshots.cars
  const carIds = new Set(cars.map(car => car._documentId))
  const userCollections = ['profiles', 'cars', 'maintenance_tasks', 'maintenance_records', 'documents', 'odometer_readings', 'announcement_reads']
  const missingSchemaVersion = userCollections.reduce((count, collection) => count + snapshots[collection].filter(item => item.schema_version !== 2).length, 0)
  const tasksWithoutBaseline = snapshots.maintenance_tasks.filter(task => (
    !task.last_maintenance_date
    && (task.last_maintenance_odometer === null || task.last_maintenance_odometer === undefined)
  )).length
  const recordsWithoutItems = snapshots.maintenance_records.filter(record => !Array.isArray(record.items)).length
  const carBoundCollections = ['maintenance_tasks', 'maintenance_records', 'documents', 'odometer_readings']
  const missingCarId = carBoundCollections.reduce((count, collection) => count + snapshots[collection].filter(item => !item.car_id).length, 0)
  const danglingCarReferences = carBoundCollections.reduce((count, collection) => count + snapshots[collection].filter(item => item.car_id && !carIds.has(item.car_id)).length, 0)

  const report = {
    target,
    projectId: credentials.project_id,
    readOnly: true,
    counts: Object.fromEntries(COLLECTIONS.map(collection => [collection, snapshots[collection].length])),
    issues: {
      missingSchemaVersion,
      carBoundDocumentsMissingCarId: missingCarId,
      documentsReferencingMissingCar: danglingCarReferences,
      maintenanceTasksWithoutBaseline: tasksWithoutBaseline,
      legacyRecordsWithoutItemsArray: recordsWithoutItems,
      carsWithLegacyPublicShareEnabled: cars.filter(car => car.public_share_enabled === true).length,
      usersWithMultipleCars: countByOwner(cars)
    }
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  await db.terminate()
}

main().catch(error => {
  process.stderr.write(`Read-only audit stopped: ${error.message}\n`)
  process.exitCode = 1
})
