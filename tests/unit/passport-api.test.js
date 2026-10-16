import { describe, expect, it, vi } from 'vitest'

vi.mock('../../api/_firebase-admin.js', () => ({
    adminDb: () => { throw new Error('No real Firebase connection allowed in unit tests') },
    requireUser: () => { throw new Error('No real Firebase Auth connection allowed in unit tests') }
}))

import { createPassportShareHandler } from '../../api/passport-share.js'
import { createPublicPassportHandler } from '../../api/public-passport.js'
import { buildPublicPassport } from '../../api/_passport-projection.js'
import { createPassportToken, isPassportToken } from '../../api/_passport-security.js'

const token = Buffer.alloc(32, 7).toString('base64url')
const ownerId = 'synthetic-owner'
const carId = 'synthetic-car'

function fakeDb(seed = {}, { beforeFinalRead, injectUnscopedChildren = false } = {}) {
    const data = new Map(Object.entries(seed).map(([collection, rows]) => [collection,
        new Map(rows.map(row => [row.id, { ...row.data }]))]))
    const queries = []
    let transactionTail = Promise.resolve()
    let carQueryDone = false
    function reference(collection, id) {
        return {
            id,
            async get() {
                if (collection === 'cars' && carQueryDone && beforeFinalRead) await beforeFinalRead(data)
                return snapshot(collection, id)
            }
        }
    }
    function snapshot(collection, id) {
        const value = data.get(collection)?.get(id)
        return { id, exists: Boolean(value), data: () => value ? { ...value } : undefined, ref: reference(collection, id) }
    }
    const db = {
        data,
        queries,
        collection(collection) {
            function query(filters = [], ordering = null, limit = null) {
                return {
                    doc: id => reference(collection, id),
                    where: (field, op, value) => query([...filters, { field, op, value }], ordering, limit),
                    orderBy: (field, direction) => query(filters, { field, direction }, limit),
                    limit: value => query(filters, ordering, value),
                    async get() {
                        queries.push({ collection, filters, ordering, limit })
                        let rows = [...(data.get(collection) || [])]
                        if (!(injectUnscopedChildren && collection !== 'cars')) {
                            rows = rows.filter(([, row]) => filters.every(filter => filter.op === '==' && row[filter.field] === filter.value))
                        }
                        if (ordering) rows.sort(([, left], [, right]) => String(left[ordering.field]).localeCompare(String(right[ordering.field]))
                            * (ordering.direction === 'desc' ? -1 : 1))
                        if (limit !== null) rows = rows.slice(0, limit)
                        if (collection === 'cars') carQueryDone = true
                        return { docs: rows.map(([id]) => snapshot(collection, id)) }
                    }
                }
            }
            return query()
        },
        async runTransaction(callback) {
            const previous = transactionTail
            let release
            transactionTail = new Promise(resolve => { release = resolve })
            await previous
            try {
                const updates = []
                const result = await callback({
                    get: async ref => snapshot('cars', ref.id),
                    update: (ref, patch) => updates.push({ id: ref.id, patch })
                })
                updates.forEach(({ id, patch }) => data.get('cars').set(id, { ...data.get('cars').get(id), ...patch }))
                return result
            } finally { release() }
        }
    }
    return db
}

function seed(carOverrides = {}, extra = {}) {
    return {
        cars: [{ id: carId, data: {
            user_id: ownerId, public_share_enabled: true, share_token: token,
            make: 'QA Make', model: 'QA Model', year: 2020, color: 'white', current_odometer: 2000,
            vin: 'PRIVATE-VIN', plate_number: 'PRIVATE-PLATE', notes: 'PRIVATE-CAR-NOTES',
            image: 'PRIVATE-CAR-IMAGE', ...carOverrides
        } }],
        maintenance_records: [{ id: 'PRIVATE-RECORD-ID', data: {
            user_id: ownerId, car_id: carId, task_name: 'Oil change', date: '2026-09-15', odometer_reading: 1900,
            cost: 125, invoice_number: 'PRIVATE-INVOICE', invoice_image: 'PRIVATE-INVOICE-IMAGE',
            service_center: 'PRIVATE-CENTER', notes: 'PRIVATE-MAINTENANCE-NOTES'
        } }],
        documents: [{ id: 'PRIVATE-DOCUMENT-ID', data: {
            user_id: ownerId, car_id: carId, type: 'registration', expiry_date: '2026-12-31',
            image: 'PRIVATE-DOCUMENT-IMAGE', title: 'PRIVATE-TITLE', notes: 'PRIVATE-DOCUMENT-NOTES'
        } }],
        ...extra
    }
}

function responseRecorder() {
    return {
        headers: {}, statusCode: null, body: null,
        setHeader(name, value) { this.headers[name] = value },
        status(code) { this.statusCode = code; return this },
        json(body) { this.body = body; return this }
    }
}

async function call(handler, body, uid = ownerId, options = {}) {
    const response = responseRecorder()
    await handler({ method: options.method || 'POST', body, headers: uid ? { authorization: `Bearer ${uid}` } : {} }, response)
    return response
}

function shareHandler(db, userOverrides = {}) {
    return createPassportShareHandler({
        getDb: () => db,
        authenticate: async request => {
            const uid = request.headers.authorization?.slice(7)
            if (!uid) throw Object.assign(new Error('Authentication required'), { status: 401 })
            return { uid, ...userOverrides }
        }
    })
}

function publicHandler(db) {
    return createPublicPassportHandler({ getDb: () => db, now: () => new Date('2026-09-30T12:00:00Z') })
}

describe('passport token and owner lifecycle APIs', () => {
    it('generates canonical cryptographically random 256-bit tokens without collisions in the sample', () => {
        const tokens = Array.from({ length: 64 }, createPassportToken)
        expect(new Set(tokens).size).toBe(64)
        tokens.forEach(value => {
            expect(isPassportToken(value)).toBe(true)
            expect(value).toMatch(/^[A-Za-z0-9_-]{43}$/)
            expect(Buffer.from(value, 'base64url')).toHaveLength(32)
            expect(value).not.toContain(ownerId)
            expect(value).not.toContain(carId)
        })
    })

    it('enables, redisplays only to the owner, rotates, and disables with old tokens immediately unavailable', async () => {
        const db = fakeDb(seed({ public_share_enabled: false, share_token: null }))
        const manage = shareHandler(db)
        const read = publicHandler(db)
        const enable = await call(manage, { carId, operation: 'enable', token: 'caller-selected-token' })
        expect(enable.statusCode).toBe(200)
        expect(isPassportToken(enable.body.token)).toBe(true)
        expect(enable.body.token).not.toBe('caller-selected-token')
        expect((await call(manage, { carId, operation: 'getStatus' })).body).toEqual(enable.body)
        expect((await call(read, { token: enable.body.token }, null)).statusCode).toBe(200)

        const rotate = await call(manage, { carId, operation: 'rotate' })
        expect(rotate.body.token).not.toBe(enable.body.token)
        expect((await call(read, { token: enable.body.token }, null)).statusCode).toBe(404)
        expect((await call(read, { token: rotate.body.token }, null)).statusCode).toBe(200)
        const disable = await call(manage, { carId, operation: 'disable' })
        expect(disable.body).toEqual({ enabled: false, token: null })
        expect(db.data.get('cars').get(carId).share_token).toBe(null)
        expect((await call(read, { token: rotate.body.token }, null)).statusCode).toBe(404)
        expect((await call(manage, { carId, operation: 'getStatus' })).body).toEqual(disable.body)
    })

    it('every enable issues a new token and changes only existing V1 share fields', async () => {
        const db = fakeDb(seed())
        const original = { ...db.data.get('cars').get(carId) }
        const response = await call(shareHandler(db), { carId, operation: 'enable' })
        expect(response.body.token).not.toBe(token)
        expect(db.data.get('cars').get(carId)).toEqual({ ...original, public_share_enabled: true, share_token: response.body.token })
    })

    it.each(['getStatus', 'enable', 'disable', 'rotate'])('rejects anonymous and other owner for %s even with spoofed userId or admin claim', async operation => {
        const db = fakeDb(seed())
        const handler = shareHandler(db, { admin: true })
        const body = { carId, operation, userId: ownerId, user_id: ownerId }
        expect((await call(handler, body, null)).statusCode).toBe(401)
        expect((await call(handler, body, 'synthetic-other-owner')).statusCode).toBe(403)
        expect(db.data.get('cars').get(carId).share_token).toBe(token)
    })

    it('rejects expired/invalid ID tokens without exposing Firebase error messages', async () => {
        const handler = createPassportShareHandler({ authenticate: async () => {
            throw Object.assign(new Error('PRIVATE-ID-TOKEN-MESSAGE'), { code: 'auth/id-token-expired' })
        } })
        const response = await call(handler, { carId, operation: 'enable' })
        expect(response.statusCode).toBe(401)
        expect(JSON.stringify(response.body)).not.toContain('PRIVATE-ID-TOKEN-MESSAGE')
    })

    it('rejects deleting/missing cars and malformed requests without writes', async () => {
        const db = fakeDb(seed({ deletion_requested: true }))
        const handler = shareHandler(db)
        expect((await call(handler, { carId, operation: 'enable' })).statusCode).toBe(409)
        expect((await call(handler, { carId: 'missing-car', operation: 'enable' })).statusCode).toBe(403)
        for (const body of [null, [], { carId: '../other', operation: 'enable' }, { carId, operation: 'unknown' }]) {
            expect((await call(handler, body)).statusCode).toBe(400)
        }
        expect(db.data.get('cars').get(carId).share_token).toBe(token)
    })

    it('does not redisplay or accept legacy weak bearer tokens', async () => {
        const db = fakeDb(seed({ share_token: 'legacy-car-id-or-short-token' }))
        expect((await call(shareHandler(db), { carId, operation: 'getStatus' })).body).toEqual({ enabled: false, token: null })
        expect((await call(publicHandler(db), { token: 'legacy-car-id-or-short-token' }, null)).statusCode).toBe(404)
    })

    it('serializes concurrent rotation with exactly one current token and no lost unrelated fields', async () => {
        const db = fakeDb(seed())
        const handler = shareHandler(db)
        const [first, second] = await Promise.all([
            call(handler, { carId, operation: 'rotate' }), call(handler, { carId, operation: 'rotate' })
        ])
        expect(first.statusCode).toBe(200)
        expect(second.statusCode).toBe(200)
        expect(first.body.token).not.toBe(second.body.token)
        expect((await call(publicHandler(db), { token: first.body.token }, null)).statusCode).toBe(404)
        expect((await call(publicHandler(db), { token: second.body.token }, null)).statusCode).toBe(200)
        expect(db.data.get('cars').get(carId).current_odometer).toBe(2000)
    })
})

describe('public passport authorization and bounded private projection', () => {
    it('returns an exact allowlisted payload without authentication or any forbidden field/value', async () => {
        const response = await call(publicHandler(fakeDb(seed())), { token }, null)
        expect(response.statusCode).toBe(200)
        expect(response.body).toEqual({
            car: { make: 'QA Make', model: 'QA Model', year: 2020, color: 'white', currentOdometer: 2000 },
            maintenance: [{ name: 'Oil change', date: '2026-09-15', odometerReading: 1900 }],
            documents: [{ type: 'registration', label: 'استمارة السيارة', status: 'valid' }],
            summary: { maintenanceCount: 1, lastMaintenanceDate: '2026-09-15' }, truncated: false
        })
        const forbiddenKeys = new Set([
            'id', 'user_id', 'userId', 'car_id', 'carId', 'uid', 'plate_number', 'plateNumber', 'vin',
            'notes', 'cost', 'costs', 'invoice_number', 'invoiceNumber', 'invoice_image', 'invoiceImage',
            'service_center', 'serviceCenter', 'image', 'files', 'title', 'expiry_date', 'issue_date',
            'share_token', 'shareToken', 'token', 'email', 'phone', 'profile', 'admin'
        ])
        function inspect(value) {
            if (!value || typeof value !== 'object') return
            Object.entries(value).forEach(([key, child]) => { expect(forbiddenKeys.has(key), key).toBe(false); inspect(child) })
        }
        inspect(response.body)
        expect(JSON.stringify(response.body)).not.toContain('PRIVATE-')
        expect(JSON.stringify(response.body)).not.toContain(token)
    })

    it('scopes all child queries to owner AND car, excluding other cars/owners and custom/personal documents', async () => {
        const original = seed()
        const db = fakeDb(seed({}, {
            maintenance_records: [...original.maintenance_records,
                { id: 'other-car-record', data: { ...original.maintenance_records[0].data, car_id: 'other-car' } },
                { id: 'other-owner-record', data: { ...original.maintenance_records[0].data, user_id: 'other-owner' } }],
            documents: [...original.documents,
                { id: 'custom', data: { ...original.documents[0].data, type: 'custom' } },
                { id: 'driver-license', data: { ...original.documents[0].data, type: 'license' } },
                { id: 'other-doc', data: { ...original.documents[0].data, type: 'insurance', user_id: 'other-owner' } }]
        }))
        const response = await call(publicHandler(db), { token }, null)
        expect(response.body.maintenance).toHaveLength(1)
        expect(response.body.documents).toHaveLength(1)
        db.queries.filter(query => query.collection !== 'cars').forEach(query => {
            expect(query.filters).toContainEqual({ field: 'user_id', op: '==', value: ownerId })
            expect(query.filters).toContainEqual({ field: 'car_id', op: '==', value: carId })
            expect(query.limit).toBeLessThanOrEqual(101)
        })
    })

    it('also filters unscoped/corrupt child rows defensively before projection', async () => {
        const db = fakeDb(seed({}, {
            maintenance_records: [
                { id: 'alien', data: { user_id: 'other-owner', car_id: carId, task_name: 'Forbidden' } },
                { id: 'alien-car', data: { user_id: ownerId, car_id: 'other-car', task_name: 'Forbidden' } }
            ],
            documents: [{ id: 'alien-doc', data: { user_id: 'other-owner', car_id: carId, type: 'registration' } }]
        }), { injectUnscopedChildren: true })
        const response = await call(publicHandler(db), { token }, null)
        expect(response.body.maintenance).toEqual([])
        expect(response.body.documents).toEqual([])
    })

    it.each([null, '', 'short', 'a'.repeat(42), 'a'.repeat(44), 'x'.repeat(43), '../token', {}, 123, ['token']])('returns uniform unavailable for malformed token %j without a database call', async value => {
        const getDb = vi.fn(() => { throw new Error('Must never initialize Firebase for malformed token') })
        const handler = createPublicPassportHandler({ getDb })
        const response = await call(handler, { token: value }, null)
        expect(response.statusCode).toBe(404)
        expect(response.body).toEqual({ error: 'Passport unavailable' })
        expect(getDb).not.toHaveBeenCalled()
    })

    it.each([
        { public_share_enabled: false }, { deletion_requested: true }, { user_id: null }, { share_token: createPassportToken() }
    ])('makes disabled/deleting/unowned/revoked links uniformly unavailable', async overrides => {
        const response = await call(publicHandler(fakeDb(seed(overrides))), { token }, null)
        expect(response.statusCode).toBe(404)
        expect(response.body).toEqual({ error: 'Passport unavailable' })
    })

    it('fails closed when a corrupt duplicate token matches more than one car', async () => {
        const original = seed()
        const db = fakeDb(seed({}, { cars: [...original.cars, { id: 'other-car', data: { ...original.cars[0].data, user_id: 'other-owner' } }] }))
        expect((await call(publicHandler(db), { token }, null)).statusCode).toBe(404)
        expect(db.queries).toHaveLength(1)
    })

    it.each(['disable', 'rotate', 'delete', 'changeOwner', 'tombstone'])('rechecks the car after child reads and rejects concurrent %s', async change => {
        const db = fakeDb(seed(), { beforeFinalRead(data) {
            const car = data.get('cars').get(carId)
            if (change === 'disable') car.public_share_enabled = false
            if (change === 'rotate') car.share_token = createPassportToken()
            if (change === 'delete') data.get('cars').delete(carId)
            if (change === 'changeOwner') car.user_id = 'other-owner'
            if (change === 'tombstone') car.deletion_requested = true
        } })
        expect((await call(publicHandler(db), { token }, null)).statusCode).toBe(404)
    })

    it('bounds maintenance reads to 101, returns latest 100, and marks truncation', async () => {
        const db = fakeDb(seed({}, { maintenance_records: Array.from({ length: 140 }, (_, index) => ({
            id: `record-${index}`, data: { user_id: ownerId, car_id: carId, task_name: `service-${index}`, date: `2026-09-${String(index % 28 + 1).padStart(2, '0')}`, odometer_reading: index }
        })) }))
        const response = await call(publicHandler(db), { token }, null)
        expect(response.body.maintenance).toHaveLength(100)
        expect(response.body.summary.maintenanceCount).toBe(100)
        expect(response.body.truncated).toBe(true)
        const recordQuery = db.queries.find(query => query.collection === 'maintenance_records')
        expect(recordQuery.limit).toBe(101)
        expect(recordQuery.ordering).toEqual({ field: 'date', direction: 'desc' })
        expect(response.body.maintenance[0].date >= response.body.maintenance.at(-1).date).toBe(true)
    })

    it('bounds standard document duplicates and publishes one fixed-label status per vehicle type', async () => {
        const original = seed()
        const documents = Array.from({ length: 20 }, (_, index) => ({ id: `registration-${index}`, data: original.documents[0].data }))
        documents.push({ id: 'insurance', data: { user_id: ownerId, car_id: carId, type: 'insurance', expiry_date: '2026-10-01' } })
        documents.push({ id: 'fahas', data: { user_id: ownerId, car_id: carId, type: 'fahas', expiry_date: null } })
        const db = fakeDb(seed({}, { documents }))
        const response = await call(publicHandler(db), { token }, null)
        expect(response.body.documents).toEqual([
            { type: 'registration', label: 'استمارة السيارة', status: 'valid' },
            { type: 'fahas', label: 'الفحص الدوري', status: 'needs_expiry' },
            { type: 'insurance', label: 'التأمين', status: 'expiring_soon' }
        ])
        expect(response.body.truncated).toBe(true)
        db.queries.filter(query => query.collection === 'documents').forEach(query => expect(query.limit).toBe(2))
    })

    it('returns safe empty states and null rather than fabricated numbers/dates for legacy values', () => {
        const result = buildPublicPassport({ year: {}, current_odometer: NaN, make: { token: 'private' } }, [], [])
        expect(result.car).toEqual({ make: '', model: '', year: null, color: '', currentOdometer: null })
        expect(result.maintenance).toEqual([])
        expect(result.documents).toEqual([])
        expect(result.summary).toEqual({ maintenanceCount: 0, lastMaintenanceDate: null })
        const record = buildPublicPassport({}, [{ task_name: null, date: 'invalid', odometer_reading: -5 }], []).maintenance[0]
        expect(record).toEqual({ name: 'صيانة', date: null, odometerReading: null })
    })

    it('preserves ordinary service names while stripping control characters and bounding public text', () => {
        const result = buildPublicPassport({ make: 'QA\u0000 Make' }, [
            { task_name: 'Engine oil', date: '2026-09-20', odometer_reading: 2000 },
            { task_name: 'Brake\nservice\u007f', date: '2026-09-19', odometer_reading: 1800 },
            { task_name: 'x'.repeat(500), date: '2026-09-18', odometer_reading: 1600 }
        ], [])
        expect(result.car.make).toBe('QA  Make')
        expect(result.maintenance[0].name).toBe('Engine oil')
        expect(result.maintenance[1].name).toBe('Brake service')
        expect(result.maintenance[2].name).toHaveLength(160)
    })

    it('recomputes expiry status with the existing custom reminder threshold and never exposes dates', async () => {
        const db = fakeDb(seed({}, { documents: [
            { id: 'expired', data: { user_id: ownerId, car_id: carId, type: 'registration', expiry_date: '2026-09-01' } },
            { id: 'custom-threshold', data: { user_id: ownerId, car_id: carId, type: 'insurance', expiry_date: '2026-10-15', reminder_days: 10 } }
        ] }))
        const response = await call(publicHandler(db), { token }, null)
        expect(response.body.documents).toEqual([
            { type: 'registration', label: 'استمارة السيارة', status: 'expired' },
            { type: 'insurance', label: 'التأمين', status: 'valid' }
        ])
    })

    it('distinguishes backend failure safely without returning/logging raw errors or secrets', async () => {
        const logs = vi.spyOn(console, 'error').mockImplementation(() => {})
        try {
            const handler = createPublicPassportHandler({ getDb: () => { throw new Error('PRIVATE-TOKEN-AND-FIREBASE-STACK') } })
            const response = await call(handler, { token }, null)
            expect(response.statusCode).toBe(500)
            expect(response.body).toEqual({ error: 'Passport temporarily unavailable' })
            expect(JSON.stringify(response.body)).not.toContain('PRIVATE-')
            expect(logs).not.toHaveBeenCalled()
        } finally { logs.mockRestore() }
    })

    it('keeps APIs POST-only and sends no-store/noindex/no-referrer on success and every failure', async () => {
        const db = fakeDb(seed())
        for (const handler of [publicHandler(db), shareHandler(db)]) {
            const response = await call(handler, { token, carId, operation: 'getStatus' }, null, { method: 'GET' })
            expect(response.statusCode).toBe(405)
            expect(response.headers.Allow).toBe('POST')
            expect(response.headers['Cache-Control']).toBe('no-store')
            expect(response.headers['X-Robots-Tag']).toBe('noindex, nofollow')
            expect(response.headers['Referrer-Policy']).toBe('no-referrer')
        }
        for (const response of [
            await call(publicHandler(db), { token }, null),
            await call(publicHandler(db), { token: 'invalid' }, null),
            await call(shareHandler(db), { carId, operation: 'getStatus' }, null)
        ]) expect(response.headers['Cache-Control']).toBe('no-store')
    })
})
