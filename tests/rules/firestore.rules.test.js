import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore'

const PROJECT_ID = 'demo-3yar-rules'
const PRIVATE_DOCUMENTS = [
  ['profiles', 'profile-owner'],
  ['cars', 'car-owner'],
  ['maintenance_tasks', 'task-owner'],
  ['maintenance_records', 'record-owner'],
  ['documents', 'document-owner'],
  ['odometer_readings', 'reading-owner'],
  ['announcement_reads', 'announcement-read-owner']
]

let testEnvironment

beforeAll(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: readFileSync('firestore.rules', 'utf8')
    }
  })
})

beforeEach(async () => {
  await testEnvironment.clearFirestore()
  await testEnvironment.withSecurityRulesDisabled(async context => {
    const db = context.firestore()
    const documents = [
      ['profiles/profile-owner', { user_id: 'owner-1', role: 'user' }],
      ['cars/car-owner', { user_id: 'owner-1', public_share_enabled: true }],
      ['maintenance_tasks/task-owner', { user_id: 'owner-1', car_id: 'car-owner' }],
      ['maintenance_records/record-owner', { user_id: 'owner-1', car_id: 'car-owner' }],
      ['documents/document-owner', { user_id: 'owner-1', car_id: 'car-owner' }],
      ['odometer_readings/reading-owner', { user_id: 'owner-1', car_id: 'car-owner' }],
      ['announcement_reads/announcement-read-owner', { user_id: 'owner-1', announcement_id: 'announcement-1' }],
      ['announcements/announcement-1', { active: true }],
      ['default_maintenance_templates/template-1', { name: 'زيت المحرك' }],
      ['app_config/feature_flags', { globalEnabled: false }]
    ]
    await Promise.all(documents.map(([path, data]) => setDoc(doc(db, path), data)))
  })
})

afterAll(async () => {
  await testEnvironment?.cleanup()
})

describe('Firestore access matrix: Anonymous', () => {
  it('cannot read or create private user data, including legacy-public cars and tasks', async () => {
    const db = testEnvironment.unauthenticatedContext().firestore()
    for (const [collectionName, documentId] of PRIVATE_DOCUMENTS) {
      await assertFails(getDoc(doc(db, collectionName, documentId)))
    }
    await assertFails(setDoc(doc(db, 'cars', 'anonymous-car'), { user_id: 'anonymous' }))
    await assertFails(setDoc(doc(db, 'maintenance_tasks', 'anonymous-task'), { user_id: 'anonymous' }))
  })

  it('can read only intentionally public announcements and maintenance templates', async () => {
    const db = testEnvironment.unauthenticatedContext().firestore()
    await assertSucceeds(getDoc(doc(db, 'announcements', 'announcement-1')))
    await assertSucceeds(getDoc(doc(db, 'default_maintenance_templates', 'template-1')))
    await assertFails(getDoc(doc(db, 'app_config', 'feature_flags')))
  })
})

describe('Firestore access matrix: Owner', () => {
  it('can read all of their own documents', async () => {
    const db = testEnvironment.authenticatedContext('owner-1').firestore()
    for (const [collectionName, documentId] of PRIVATE_DOCUMENTS) {
      await assertSucceeds(getDoc(doc(db, collectionName, documentId)))
    }
  })

  it('can query owned tasks only when the query is constrained to their user ID', async () => {
    const db = testEnvironment.authenticatedContext('owner-1').firestore()
    await assertSucceeds(getDocs(query(collection(db, 'maintenance_tasks'), where('user_id', '==', 'owner-1'))))
    await assertFails(getDocs(collection(db, 'maintenance_tasks')))
  })

  it('can update owned data but cannot change ownership or write central configuration', async () => {
    const db = testEnvironment.authenticatedContext('owner-1').firestore()
    await assertSucceeds(updateDoc(doc(db, 'cars', 'car-owner'), { make: 'Test Make' }))
    await assertFails(updateDoc(doc(db, 'cars', 'car-owner'), { user_id: 'other-1' }))
    await assertFails(setDoc(doc(db, 'app_config', 'feature_flags'), { globalEnabled: true }))
  })
})

describe('Firestore access matrix: Other authenticated user', () => {
  it('cannot read another owner’s documents even when a car has a legacy public flag', async () => {
    const db = testEnvironment.authenticatedContext('other-1').firestore()
    for (const [collectionName, documentId] of PRIVATE_DOCUMENTS) {
      await assertFails(getDoc(doc(db, collectionName, documentId)))
    }
  })

  it('cannot update or delete another owner’s records or create data for that owner', async () => {
    const db = testEnvironment.authenticatedContext('other-1').firestore()
    await assertFails(updateDoc(doc(db, 'maintenance_records', 'record-owner'), { notes: 'forged' }))
    await assertFails(deleteDoc(doc(db, 'cars', 'car-owner')))
    await assertFails(setDoc(doc(db, 'maintenance_tasks', 'forged-task'), { user_id: 'owner-1' }))
    await assertFails(getDoc(doc(db, 'app_config', 'feature_flags')))
  })
})

describe('Firestore access matrix: Admin custom claim', () => {
  it('can read private user documents and centrally managed feature configuration', async () => {
    const db = testEnvironment.authenticatedContext('admin-1', { admin: true }).firestore()
    for (const [collectionName, documentId] of PRIVATE_DOCUMENTS) {
      await assertSucceeds(getDoc(doc(db, collectionName, documentId)))
    }
    await assertSucceeds(getDoc(doc(db, 'app_config', 'feature_flags')))
  })

  it('can perform administrative writes', async () => {
    const db = testEnvironment.authenticatedContext('admin-1', { admin: true }).firestore()
    await assertSucceeds(setDoc(doc(db, 'cars', 'admin-created-car'), { user_id: 'owner-1' }))
    await assertSucceeds(updateDoc(doc(db, 'maintenance_tasks', 'task-owner'), { user_id: 'other-1' }))
    await assertSucceeds(deleteDoc(doc(db, 'documents', 'document-owner')))
    await assertSucceeds(setDoc(doc(db, 'app_config', 'feature_flags'), { globalEnabled: false }))
  })
})
