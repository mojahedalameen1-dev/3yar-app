import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore'

const PROJECT_ID = 'demo-3yar-v1-rules'
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
            ['cars/car-owner', { user_id: 'owner-1', public_share_enabled: true, deletion_requested: false }],
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
    it('cannot read cars, tasks, or other private data even when legacy sharing is enabled', async () => {
        const db = environment.unauthenticatedContext().firestore()
        await assertFails(getDoc(doc(db, 'cars/car-owner')))
        await assertFails(getDoc(doc(db, 'maintenance_tasks/task-owner')))
        await assertFails(getDocs(collection(db, 'cars')))
        await assertFails(setDoc(doc(db, 'cars/anonymous-car'), { user_id: 'anonymous' }))
    })

    it('only reads explicitly public announcements and maintenance templates', async () => {
        const db = environment.unauthenticatedContext().firestore()
        await assertSucceeds(getDoc(doc(db, 'announcements/announcement-1')))
        await assertSucceeds(getDoc(doc(db, 'default_maintenance_templates/template-1')))
    })
})

describe('owner access', () => {
    it('reads own car and child records only when constrained by owner and car', async () => {
        const db = environment.authenticatedContext('owner-1').firestore()
        await assertSucceeds(getDoc(doc(db, 'cars/car-owner')))
        await assertSucceeds(getDocs(query(collection(db, 'maintenance_tasks'), where('user_id', '==', 'owner-1'), where('car_id', '==', 'car-owner'))))
        await assertFails(getDocs(collection(db, 'maintenance_tasks')))
    })

    it('may create/update its own active-car data, but cannot change car ownership', async () => {
        const db = environment.authenticatedContext('owner-1').firestore()
        await assertSucceeds(setDoc(doc(db, 'maintenance_tasks/new-task'), { user_id: 'owner-1', car_id: 'car-owner', name: 'فرامل' }))
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
    it('can still read and perform administrative writes', async () => {
        const db = environment.authenticatedContext('admin-1', { admin: true }).firestore()
        await assertSucceeds(getDocs(collection(db, 'maintenance_tasks')))
        await assertSucceeds(setDoc(doc(db, 'cars/admin-car'), { user_id: 'owner-1' }))
        await assertSucceeds(updateDoc(doc(db, 'maintenance_tasks/task-owner'), { user_id: 'other-1' }))
        await assertSucceeds(deleteDoc(doc(db, 'documents/document-owner')))
    })
})
