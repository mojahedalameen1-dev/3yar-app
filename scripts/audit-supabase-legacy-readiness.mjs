import { config } from 'dotenv'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { cert, initializeApp } from 'firebase-admin/app'
import { FieldPath, getFirestore } from 'firebase-admin/firestore'

config({ path: resolve('.env.local'), quiet: true })
config({ quiet: true })

const EXPECTED_SUPABASE_REF = 'koljxracpdgiqbxaiapc'
const FIRESTORE_TABLES = Object.freeze([
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
const STORAGE_OBJECT_SCAN_LIMIT = 50000
const PAGE_SIZE = 1000

function argumentValue(name) {
  const prefix = `--${name}=`
  const argument = process.argv.slice(2).find(value => value.startsWith(prefix))
  return argument ? argument.slice(prefix.length) : null
}

function assertReadOnlyTarget(credentials) {
  if (argumentValue('target') !== 'legacy-supabase-read-only') {
    throw new Error('Specify --target=legacy-supabase-read-only; this audit has no write mode.')
  }
  if (argumentValue('expected-supabase-ref') !== EXPECTED_SUPABASE_REF) {
    throw new Error('The expected Supabase project reference is required and must match the configured legacy source.')
  }
  if (argumentValue('expected-firebase-project') !== credentials.project_id) {
    throw new Error('The expected Firebase project ID does not match the configured service account.')
  }
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('The Firestore comparison target must not be an Emulator.')
  }
}

function errorSummary(error) {
  return { code: error?.code || error?.statusCode || null, status: error?.status || null }
}

function idOf(row, table) {
  const fallbackId = table === 'announcement_reads' && row.user_id && row.announcement_id
    ? `${row.user_id}_${row.announcement_id}`
    : null
  const id = table === 'profiles' ? (row.user_id ?? row.id) : (row.id ?? fallbackId)
  return id === null || id === undefined ? null : String(id)
}

function stableOrderFields(table, fields) {
  if (table === 'profiles' && fields.includes('user_id')) return ['user_id']
  if (fields.includes('id')) return ['id']
  if (table === 'announcement_reads' && fields.includes('user_id') && fields.includes('announcement_id')) {
    return ['user_id', 'announcement_id']
  }
  throw new Error(`Cannot guarantee stable pagination for ${table}; no known unique key is available.`)
}

function canonical(value, key = '') {
  if (value === undefined || value === null) return null
  if (value instanceof Date) return value.toISOString()
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString()
  if (key === 'id' || key.endsWith('_id')) return String(value)
  if (['date', 'created_at', 'updated_at', 'read_at', 'issue_date', 'expiry_date', 'last_maintenance_date'].includes(key) && typeof value === 'string') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()
  }
  if (Array.isArray(value)) return value.map(item => canonical(item))
  if (typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(childKey => [childKey, canonical(value[childKey], childKey)]))
  }
  return value
}

function compareRows(table, sourceRows, firebaseRows, fields) {
  const firebaseById = new Map(firebaseRows.map(row => [idOf(row, table), row]).filter(([id]) => id))
  const sourceIds = new Set()
  const fieldMismatchCounts = {}
  let duplicateSourceIds = 0
  let matchedIds = 0
  let sourceOnly = 0
  let rowsWithFieldDifferences = 0

  for (const sourceRow of sourceRows) {
    const id = idOf(sourceRow, table)
    if (!id) continue
    if (sourceIds.has(id)) duplicateSourceIds += 1
    sourceIds.add(id)
    const firebaseRow = firebaseById.get(id)
    if (!firebaseRow) {
      sourceOnly += 1
      continue
    }
    matchedIds += 1
    let rowHasDifferences = false
    for (const field of fields) {
      if (JSON.stringify(canonical(sourceRow[field], field)) === JSON.stringify(canonical(firebaseRow[field], field))) continue
      fieldMismatchCounts[field] = (fieldMismatchCounts[field] || 0) + 1
      rowHasDifferences = true
    }
    if (rowHasDifferences) rowsWithFieldDifferences += 1
  }

  const firebaseIds = new Set(firebaseRows.map(row => idOf(row, table)).filter(Boolean))
  const firebaseOnly = [...firebaseIds].filter(id => !sourceIds.has(id)).length
  return {
    sourceRows: sourceRows.length,
    firestoreRows: firebaseRows.length,
    matchedIds,
    sourceOnly,
    firestoreOnly: firebaseOnly,
    duplicateSourceIds,
    rowsWithFieldDifferences,
    mismatchedFields: fieldMismatchCounts
  }
}

async function readSourceRows(client, table, fields) {
  const select = fields?.length ? fields.join(',') : '*'
  const orderFields = stableOrderFields(table, fields)
  const rows = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    let request = client.from(table).select(select)
    for (const field of orderFields) request = request.order(field, { ascending: true })
    const { data, error } = await request.range(offset, offset + PAGE_SIZE - 1)
    if (error) throw Object.assign(new Error(`Supabase read failed for ${table}`), { sourceError: error })
    rows.push(...data)
    if (data.length < PAGE_SIZE) break
  }
  return rows
}

async function readFirestoreRows(db, table) {
  const collection = db.collection(table)
  const rows = []
  let request = collection.orderBy(FieldPath.documentId()).limit(PAGE_SIZE)
  while (true) {
    const snapshot = await request.get()
    rows.push(...snapshot.docs.map(document => ({ ...document.data(), id: document.data().id ?? document.id })))
    if (snapshot.size < PAGE_SIZE) break
    request = collection.orderBy(FieldPath.documentId()).startAfter(snapshot.docs[snapshot.size - 1]).limit(PAGE_SIZE)
  }
  return rows
}

async function inventoryUnmappedFirestoreCollections(db) {
  const knownCollections = new Set(FIRESTORE_TABLES)
  const collections = await db.listCollections()
  return Promise.all(collections
    .filter(collection => !knownCollections.has(collection.id))
    .map(async collection => {
      try {
        const result = await collection.count().get()
        return { collection: collection.id, count: result.data().count }
      } catch (error) {
        return { collection: collection.id, count: null, error: errorSummary(error) }
      }
    }))
}

async function countFirestoreCollectionGroup(db, collectionId) {
  try {
    const result = await db.collectionGroup(collectionId).count().get()
    return { collectionId, count: result.data().count }
  } catch (error) {
    return { collectionId, count: null, error: errorSummary(error) }
  }
}

async function countSourceRows(client, table) {
  const { count, error } = await client.from(table).select('*', { count: 'exact', head: true })
  if (error) throw Object.assign(new Error(`Supabase count failed for ${table}`), { sourceError: error })
  return count
}

async function inventoryUnmappedSourceTables(client, schema) {
  const definitions = schema.definitions || {}
  const tableNames = Object.keys(definitions).sort()
  const knownTables = new Set(FIRESTORE_TABLES)
  const unmappedSourceTables = await Promise.all(tableNames
    .filter(table => !knownTables.has(table))
    .map(async table => {
      try {
        return {
          table,
          count: await countSourceRows(client, table),
          fields: Object.keys(definitions[table].properties || {})
        }
      } catch (error) {
        return { table, count: null, fields: Object.keys(definitions[table].properties || {}), error: errorSummary(error.sourceError || error) }
      }
    }))

  return { sourceSchemaTableCount: tableNames.length, unmappedSourceTables }
}

function countAttachmentReferences(rows, fields) {
  const counts = Object.fromEntries(fields.map(field => [field, 0]))
  for (const row of rows) {
    for (const field of fields) {
      if (typeof row[field] === 'string' && row[field].trim()) counts[field] += 1
    }
  }
  return counts
}

function classifyAttachmentReferences(rows, fields) {
  const result = Object.fromEntries(fields.map(field => [field, {}]))
  for (const row of rows) {
    for (const field of fields) {
      const reference = row[field]
      if (typeof reference !== 'string' || !reference.trim()) continue
      let source = 'relative-or-non-url'
      try {
        const parsed = new URL(reference)
        source = parsed.protocol === 'data:' ? 'data-uri' : (parsed.hostname || parsed.protocol)
      } catch {
        // Keep only the reference type; never return the path or signed URL.
      }
      result[field][source] = (result[field][source] || 0) + 1
    }
  }
  return result
}

function summarizeOwnership(records, cars, profiles) {
  const carById = new Map(cars.map(car => [String(car.id), car]))
  const profileIds = new Set(profiles.map(profile => String(profile.user_id ?? profile.id)).filter(Boolean))
  const grouped = new Map()
  let missingCarId = 0
  let missingCarReference = 0
  let missingProfileReference = 0
  let carOwnerMismatch = 0

  for (const record of records) {
    const userId = record.user_id ? String(record.user_id) : null
    const carId = record.car_id ? String(record.car_id) : null
    if (!carId) missingCarId += 1
    const car = carId ? carById.get(carId) : null
    if (carId && !car) missingCarReference += 1
    if (userId && !profileIds.has(userId)) missingProfileReference += 1
    if (car && userId && String(car.user_id || '') !== userId) carOwnerMismatch += 1

    const key = `${userId || '(missing user_id)'}|${carId || '(missing car_id)'}`
    const current = grouped.get(key) || { records: 0 }
    current.records += 1
    grouped.set(key, current)
  }

  return {
    groupCount: grouped.size,
    uniqueUsers: new Set(records.map(record => record.user_id).filter(Boolean).map(String)).size,
    uniqueCars: new Set(records.map(record => record.car_id).filter(Boolean).map(String)).size,
    missingCarId,
    missingCarReference,
    missingProfileReference,
    carOwnerMismatch
  }
}

async function inventoryStorage(client) {
  const { data: buckets, error } = await client.storage.listBuckets()
  if (error) return { status: 'unavailable', error: errorSummary(error), buckets: [] }

  const result = []
  let totalFiles = 0
  let complete = true
  for (const bucket of buckets) {
    const pendingFolders = ['']
    const visited = new Set([''])
    let bucketFiles = 0
    let bucketComplete = true

    while (pendingFolders.length && totalFiles < STORAGE_OBJECT_SCAN_LIMIT) {
      const folder = pendingFolders.pop()
      for (let offset = 0; ; offset += PAGE_SIZE) {
        const { data, error: listError } = await client.storage.from(bucket.name).list(folder, {
          limit: PAGE_SIZE,
          offset,
          sortBy: { column: 'name', order: 'asc' }
        })
        if (listError) {
          result.push({ bucket: bucket.name, files: bucketFiles, status: 'partial', error: errorSummary(listError) })
          complete = false
          bucketComplete = false
          pendingFolders.length = 0
          break
        }
        for (const item of data) {
          if (item.id === null) {
            const child = `${folder}${item.name}/`
            if (!visited.has(child)) {
              visited.add(child)
              pendingFolders.push(child)
            }
            continue
          }
          bucketFiles += 1
          totalFiles += 1
          if (totalFiles >= STORAGE_OBJECT_SCAN_LIMIT) {
            complete = false
            bucketComplete = false
            break
          }
        }
        if (data.length < PAGE_SIZE || !bucketComplete || totalFiles >= STORAGE_OBJECT_SCAN_LIMIT) break
      }
    }

    if (!result.some(item => item.bucket === bucket.name)) {
      result.push({ bucket: bucket.name, files: bucketFiles, status: bucketComplete ? 'complete' : 'partial' })
    }
  }

  return { status: complete ? 'complete' : 'partial', complete, totalFiles, objectLimit: STORAGE_OBJECT_SCAN_LIMIT, buckets: result }
}

let activeFirestoreDb = null

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || ''
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  const credentialsPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || ''
  if (!supabaseUrl || !serviceRoleKey || !credentialsPath) {
    throw new Error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and FIREBASE_SERVICE_ACCOUNT_PATH are required.')
  }

  const normalizedSupabaseUrl = supabaseUrl.replace(/\/+$/, '')
  const supabaseEndpoint = new URL(normalizedSupabaseUrl)
  if (supabaseEndpoint.hostname !== `${EXPECTED_SUPABASE_REF}.supabase.co`) {
    throw new Error('Configured Supabase URL does not match the authorized legacy project reference.')
  }
  const credentials = JSON.parse(await readFile(resolve(credentialsPath), 'utf8'))
  assertReadOnlyTarget(credentials)

  const client = createClient(normalizedSupabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  const schemaResponse = await fetch(`${normalizedSupabaseUrl}/rest/v1/`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: 'application/openapi+json'
    }
  })
  if (!schemaResponse.ok) {
    throw Object.assign(new Error('Supabase schema read failed.'), { sourceError: { status: schemaResponse.status } })
  }
  const schema = await schemaResponse.json()
  const sourceInventory = await inventoryUnmappedSourceTables(client, schema)

  const app = initializeApp({ credential: cert(credentials), projectId: credentials.project_id }, 'legacy-source-read-only-audit')
  const db = getFirestore(app, process.env.FIREBASE_DATABASE_ID || '(default)')
  activeFirestoreDb = db
  const unmappedFirestoreCollections = await inventoryUnmappedFirestoreCollections(db)
  const firestoreMaintenanceRecordGroup = await countFirestoreCollectionGroup(db, 'maintenance_records')
  const sourceRows = {}
  const firestoreRows = {}
  const sourceCounts = {}
  const firestoreCounts = {}
  const sourceFields = {}

  for (const table of FIRESTORE_TABLES) {
    const definition = schema.definitions?.[table]
    if (!definition) {
      sourceRows[table] = []
      firestoreRows[table] = await readFirestoreRows(db, table)
      sourceCounts[table] = null
      firestoreCounts[table] = firestoreRows[table].length
      sourceFields[table] = []
      continue
    }
    sourceFields[table] = Object.keys(definition.properties || {})
    const [readRows, exactCount, firebaseData] = await Promise.all([
      readSourceRows(client, table, sourceFields[table]),
      countSourceRows(client, table),
      readFirestoreRows(db, table)
    ])
    if (!Number.isSafeInteger(exactCount) || readRows.length !== exactCount) {
      throw new Error(`Supabase source changed during ${table} audit or pagination was incomplete; expected ${exactCount}, read ${readRows.length}.`)
    }
    sourceRows[table] = readRows
    sourceCounts[table] = exactCount
    firestoreRows[table] = firebaseData
    firestoreCounts[table] = firestoreRows[table].length
  }

  const recordFields = sourceFields.maintenance_records
  const comparisons = Object.fromEntries(FIRESTORE_TABLES.map(table => [
    table,
    compareRows(
      table,
      sourceRows[table],
      firestoreRows[table],
      table === 'profiles' ? sourceFields[table].filter(field => field !== 'id') : sourceFields[table]
    )
  ]))

  const ownership = summarizeOwnership(sourceRows.maintenance_records, sourceRows.cars, sourceRows.profiles)
  const attachments = {
    maintenanceRecords: countAttachmentReferences(sourceRows.maintenance_records, ['invoice_image']),
    documents: countAttachmentReferences(sourceRows.documents, ['image']),
    cars: countAttachmentReferences(sourceRows.cars, ['image']),
    referenceHosts: {
      maintenanceRecords: classifyAttachmentReferences(sourceRows.maintenance_records, ['invoice_image']),
      documents: classifyAttachmentReferences(sourceRows.documents, ['image']),
      cars: classifyAttachmentReferences(sourceRows.cars, ['image'])
    }
  }
  const storage = await inventoryStorage(client)

  const report = {
    target: 'legacy-supabase-read-only',
    readOnly: true,
    supabaseProjectRef: EXPECTED_SUPABASE_REF,
    firestoreProjectId: credentials.project_id,
    sourceTableCounts: sourceCounts,
    firestoreTableCounts: firestoreCounts,
    sourceSchemaTableCount: sourceInventory.sourceSchemaTableCount,
    unmappedSourceTables: sourceInventory.unmappedSourceTables,
    unmappedFirestoreCollections,
    sourceTableFields: sourceFields,
    maintenanceRecordFields: recordFields,
    maintenanceRecords: {
      count: sourceRows.maintenance_records.length,
      firestoreCollectionGroupCount: firestoreMaintenanceRecordGroup.count,
      firestoreCollectionGroupError: firestoreMaintenanceRecordGroup.error || null,
      associations: {
        recordGroups: ownership.groupCount,
        uniqueUsers: ownership.uniqueUsers,
        uniqueCars: ownership.uniqueCars
      },
      invoiceNumbersPresent: countAttachmentReferences(sourceRows.maintenance_records, ['invoice_number']).invoice_number,
      integrity: {
        missingCarId: ownership.missingCarId,
        missingCarReference: ownership.missingCarReference,
        missingProfileReference: ownership.missingProfileReference,
        recordCarOwnerMismatch: ownership.carOwnerMismatch
      }
    },
    attachments,
    storage,
    conflictsWithFirestore: comparisons
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

main().catch(error => {
  const sourceError = error.sourceError
  process.stderr.write(`${JSON.stringify({
    auditStopped: true,
    message: error.message,
    sourceError: sourceError ? errorSummary(sourceError) : null
  })}\n`)
  process.exitCode = 1
}).finally(async () => {
  await activeFirestoreDb?.terminate().catch(() => {})
})
