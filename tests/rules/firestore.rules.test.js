import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, deleteDoc, deleteField, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore'

const PROJECT_ID = 'demo-3yar-v1-rules'
const PRIVATE_DOCUMENTS = [
    ['cars', 'car-owner'],
    ['maintenance_records', 'record-owner'],
    ['documents', 'document-owner'],
    ['odometer_readings', 'reading-owner'],
    ['maintenance_tasks', 'task-owner']
]
let environment

beforeAll(async () => {
    environment = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') }
    })
})

beforeEach(async () => {
    await environment.clearFirestore()
    await environment.withSecurityRulesDisabled(async context => {
        const db = context.firestore()
        const fixtures = [
            ['cars/car-owner', { user_id: 'owner-1', public_share_enabled: true, share_token: 'synthetic-legacy-token', deletion_requested: false }],
            ['cars/car-owner-disabled', { user_id: 'owner-1', public_share_enabled: false, share_token: null, deletion_requested: false }],
            ['cars/car-other', { user_id: 'other-1', deletion_requested: false }],
            ['profiles/profile-owner', { user_id: 'owner-1', role: 'user' }],
            ['app_config/maintenance', { enabled: true }],
            ['maintenance_tasks/task-owner', { user_id: 'owner-1', car_id: 'car-owner', name: 'زيت' }],
            ['maintenance_records/record-owner', { user_id: 'owner-1', car_id: 'car-owner' }],
            ['documents/document-owner', { user_id: 'owner-1', car_id: 'car-owner' }],
            ['odometer_readings/reading-owner', { user_id: 'owner-1', car_id: 'car-owner' }],
            ['announcement_reads/read-owner', { user_id: 'owner-1' }],
            ['announcements/announcement-1', { active: true }],
            ['default_maintenance_templates/template-1', { name: 'زيت المحرك' }]
        ]
        await Promise.all(fixtures.map(([path, data]) => setDoc(doc(db, path), data)))
    })
})

afterAll(async () => environment?.cleanup())

describe('anonymous access', () => {
    it.each(PRIVATE_DOCUMENTS)('cannot directly read %s even when legacy sharing is enabled', async (collectionName, documentId) => {
        const db = environment.unauthenticatedContext().firestore()
        await assertFails(getDoc(doc(db, collectionName, documentId)))
        await assertFails(getDocs(collection(db, collectionName)))
    })

    it('cannot create private cars', async () => {
        const db = environment.unauthenticatedContext().firestore()
        await assertFails(setDoc(doc(db, 'cars/anonymous-car'), { user_id: 'anonymous' }))
    })

    it('only reads explicitly public announcements and maintenance templates', async () => {
        const db = environment.unauthenticatedContext().firestore()
        await assertSucceeds(getDoc(doc(db, 'announcements/announcement-1')))
        await assertSucceeds(getDoc(doc(db, 'default_maintenance_templates/template-1')))
    })
})

describe('owner access', () => {
    it.each(PRIVATE_DOCUMENTS)('continues to read its own %s', async (collectionName, documentId) => {
        const db = environment.authenticatedContext('owner-1').firestore()
        await assertSucceeds(getDoc(doc(db, collectionName, documentId)))
    })

    it('reads own car and child records only when constrained by owner and car', async () => {
        const db = environment.authenticatedContext('owner-1').firestore()
        await assertSucceeds(getDoc(doc(db, 'cars/car-owner')))
        await assertSucceeds(getDocs(query(collection(db, 'maintenance_tasks'), where('user_id', '==', 'owner-1'), where('car_id', '==', 'car-owner'))))
        await assertFails(getDocs(collection(db, 'maintenance_tasks')))
    })

    it('may create/update its own active-car data, but cannot change car ownership', async () => {
        const db = environment.authenticatedContext('owner-1').firestore()
        await assertSucceeds(setDoc(doc(db, 'maintenance_tasks/new-task'), { user_id: 'owner-1', car_id: 'car-owner', name: 'فرامل' }))
        await assertSucceeds(setDoc(doc(db, 'maintenance_records/unknown-cost-record'), {
            user_id: 'owner-1', car_id: 'car-owner', cost: null
        }))
        await assertFails(setDoc(doc(db, 'maintenance_tasks/foreign-task'), { user_id: 'owner-1', car_id: 'car-other' }))
        await assertSucceeds(updateDoc(doc(db, 'cars/car-owner'), { make: 'Test' }))
        await assertFails(updateDoc(doc(db, 'cars/car-owner'), { user_id: 'other-1' }))
    })

    it('blocks new child writes after deletion is requested but permits cleanup deletes', async () => {
        const db = environment.authenticatedContext('owner-1').firestore()
        await assertSucceeds(updateDoc(doc(db, 'cars/car-owner'), { deletion_requested: true }))
        await assertFails(setDoc(doc(db, 'documents/blocked'), { user_id: 'owner-1', car_id: 'car-owner' }))
        await assertFails(updateDoc(doc(db, 'maintenance_tasks/task-owner'), { name: 'blocked' }))
        await assertSucceeds(deleteDoc(doc(db, 'maintenance_tasks/task-owner')))
        await assertSucceeds(updateDoc(doc(db, 'cars/car-owner'), { deletion_requested: false }))
    })
})

describe('other authenticated user', () => {
    it.each(PRIVATE_DOCUMENTS)('cannot read or change another owner %s', async (collectionName, documentId) => {
        const db = environment.authenticatedContext('other-1').firestore()
        const reference = doc(db, collectionName, documentId)
        await assertFails(getDoc(reference))
        await assertFails(updateDoc(reference, { notes: 'forged' }))
        await assertFails(deleteDoc(reference))
    })

    it('cannot read or mutate another owner car or children', async () => {
        const db = environment.authenticatedContext('other-1').firestore()
        await assertFails(getDoc(doc(db, 'cars/car-owner')))
        await assertFails(getDoc(doc(db, 'maintenance_records/record-owner')))
        await assertFails(updateDoc(doc(db, 'maintenance_records/record-owner'), { notes: 'forged' }))
        await assertFails(deleteDoc(doc(db, 'cars/car-owner')))
        await assertFails(setDoc(doc(db, 'maintenance_tasks/forged'), { user_id: 'owner-1', car_id: 'car-owner' }))
    })
})

describe('admin-only app configuration', () => {
    it('does not expose app_config to owners and preserves admin access', async () => {
        const ownerDb = environment.authenticatedContext('owner-1').firestore()
        const adminDb = environment.authenticatedContext('admin-1', { admin: true }).firestore()
        await assertFails(getDoc(doc(ownerDb, 'app_config/maintenance')))
        await assertSucceeds(getDoc(doc(adminDb, 'app_config/maintenance')))
        await assertSucceeds(updateDoc(doc(adminDb, 'app_config/maintenance'), { enabled: false }))
    })
})

describe('admin custom claim', () => {
    it.each(PRIVATE_DOCUMENTS)('continues to permit administrative reads of %s', async (collectionName, documentId) => {
        const db = environment.authenticatedContext('admin-1', { admin: true }).firestore()
        await assertSucceeds(getDoc(doc(db, collectionName, documentId)))
    })

    it('can still read and perform administrative writes', async () => {
        const db = environment.authenticatedContext('admin-1', { admin: true }).firestore()
        await assertSucceeds(getDocs(collection(db, 'maintenance_tasks')))
        await assertSucceeds(setDoc(doc(db, 'cars/admin-car'), { user_id: 'owner-1' }))
        await assertSucceeds(updateDoc(doc(db, 'maintenance_tasks/task-owner'), { user_id: 'other-1' }))
        await assertSucceeds(deleteDoc(doc(db, 'documents/document-owner')))
    })
})

describe('server-owned sharing fields', () => {
    const clientIdentities = [
        ['owner', 'owner-1', {}],
        ['admin', 'admin-1', { admin: true }]
    ]

    it.each(clientIdentities)('%s may create a car without active sharing', async (_name, uid, claims) => {
        const db = environment.authenticatedContext(uid, claims).firestore()
        const base = { user_id: 'owner-1', deletion_requested: false }
        await assertSucceeds(setDoc(doc(db, 'cars/new-car'), base))
        await assertSucceeds(setDoc(doc(db, 'cars/new-disabled-car'), { ...base, public_share_enabled: false, share_token: null }))
    })

    it.each(clientIdentities)('%s cannot issue a token or enable sharing during car creation', async (_name, uid, claims) => {
        const db = environment.authenticatedContext(uid, claims).firestore()
        const base = { user_id: 'owner-1', deletion_requested: false }
        await assertFails(setDoc(doc(db, 'cars/forged-enabled'), { ...base, public_share_enabled: true }))
        await assertFails(setDoc(doc(db, 'cars/forged-token'), { ...base, share_token: 'client-chosen-token' }))
        await assertFails(setDoc(doc(db, 'cars/forged-type'), { ...base, public_share_enabled: 'false', share_token: null }))
    })

    it.each(clientIdentities)('%s cannot change, enable, revoke, or remove stored sharing fields directly', async (_name, uid, claims) => {
        const db = environment.authenticatedContext(uid, claims).firestore()
        const sharedCar = doc(db, 'cars/car-owner')
        await assertFails(updateDoc(sharedCar, { share_token: 'replacement-token' }))
        await assertFails(updateDoc(sharedCar, { share_token: null }))
        await assertFails(updateDoc(sharedCar, { public_share_enabled: false }))
        await assertFails(updateDoc(sharedCar, { share_token: deleteField() }))
        await assertFails(updateDoc(sharedCar, { public_share_enabled: deleteField() }))
        await assertFails(updateDoc(doc(db, 'cars/car-owner-disabled'), { public_share_enabled: true }))
        await assertFails(updateDoc(doc(db, 'cars/car-owner-disabled'), { share_token: 'client-chosen-token' }))
    })

    it.each(clientIdentities)('%s preserves existing sharing fields during unrelated edits', async (_name, uid, claims) => {
        const db = environment.authenticatedContext(uid, claims).firestore()
        const sharedCar = doc(db, 'cars/car-owner')
        await assertSucceeds(updateDoc(sharedCar, { make: 'Synthetic', current_odometer: 1000 }))
        await assertSucceeds(updateDoc(sharedCar, { share_token: 'synthetic-legacy-token', public_share_enabled: true, color: 'Blue' }))
        await assertFails(setDoc(sharedCar, { user_id: 'owner-1', make: 'Replacement', deletion_requested: false }))
    })
})
