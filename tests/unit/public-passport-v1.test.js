import { describe, expect, it, vi } from 'vitest'
import { loadPublicPassportV1, publicPassportPayloadV1, publicPassportTokenV1 } from '../../src/lib/public-passport-v1.js'

const token = 'a'.repeat(43)
function payload() {
    return {
        car: { make: 'Test', model: 'Synthetic', year: 2026, color: 'White', currentOdometer: 1234 },
        maintenance: [{ name: 'Oil', date: '2026-09-30', odometerReading: 1234 }],
        documents: [{ type: 'registration', label: 'استمارة السيارة', status: 'needs_expiry' }],
        summary: { maintenanceCount: 1, lastMaintenanceDate: '2026-09-30' },
        truncated: false
    }
}

describe('public passport client privacy and availability', () => {
    it('reads only a well-shaped fragment and never accepts a legacy path token', () => {
        expect(publicPassportTokenV1(`#${token}`)).toBe(token)
        for (const hash of ['', token, '#short', `#${token}?extra`, '#%61'.repeat(43), null]) {
            expect(publicPassportTokenV1(hash)).toBe(null)
        }
        expect(publicPassportTokenV1(`#${token}`, { legacy: true })).toBe(null)
    })

    it('keeps the old /status/:token route unavailable without making an API request', async () => {
        const fetchImpl = vi.fn()
        expect(await loadPublicPassportV1({ hash: `#${token}`, legacy: true, fetchImpl })).toEqual({ state: 'unavailable', passport: null })
        expect(fetchImpl).not.toHaveBeenCalled()
    })

    it('posts only the token in a body, never a path/query/header, without caching or cookies', async () => {
        const data = payload()
        const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => data })
        expect(await loadPublicPassportV1({ hash: `#${token}`, fetchImpl })).toEqual({ state: 'ready', passport: data })
        const [url, request] = fetchImpl.mock.calls[0]
        expect(url).toBe('/api/public-passport')
        expect(url).not.toContain(token)
        expect(request).toMatchObject({ method: 'POST', cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error' })
        expect(request.headers).toEqual({ 'Content-Type': 'application/json' })
        expect(JSON.parse(request.body)).toEqual({ token })
    })

    it('uses the same generic invalid state for missing, malformed, revoked and disabled links', async () => {
        const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404 })
        for (const hash of ['', '#malformed', `#${token}`]) {
            expect(await loadPublicPassportV1({ hash, fetchImpl })).toEqual({ state: 'unavailable', passport: null })
        }
    })

    it('keeps backend failure distinct and never surfaces a raw error or body', async () => {
        const json = vi.fn().mockResolvedValue({ error: 'sensitive internal stack' })
        const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 503, json })
        expect(await loadPublicPassportV1({ hash: `#${token}`, fetchImpl })).toEqual({ state: 'error', passport: null })
        expect(json).not.toHaveBeenCalled()
        fetchImpl.mockRejectedValue(new Error('private internal error'))
        expect(await loadPublicPassportV1({ hash: `#${token}`, fetchImpl })).toEqual({ state: 'error', passport: null })
    })

    it('renders safe empty arrays without conflating no history and failed loading', () => {
        const data = payload()
        data.maintenance = []
        data.documents = []
        data.summary = { maintenanceCount: 0, lastMaintenanceDate: null }
        expect(publicPassportPayloadV1(data)).toEqual(data)
    })

    it('fails closed for every forbidden key anywhere in the actual UI payload', () => {
        const forbidden = ['user_id', 'car_id', 'plate_number', 'vin', 'notes', 'cost', 'costs', 'invoice_number', 'invoice_image', 'service_center', 'image', 'id', 'share_token', 'email', 'phone', 'attachments']
        for (const key of forbidden) {
            for (const target of ['root', 'car', 'maintenance', 'documents', 'summary']) {
                const data = payload()
                const object = target === 'root' ? data : ['maintenance', 'documents'].includes(target) ? data[target][0] : data[target]
                object[key] = 'private sentinel'
                expect(publicPassportPayloadV1(data), `${target}.${key}`).toBe(null)
            }
        }
    })

    it('rejects custom documents, personal license, private titles and unknown statuses', () => {
        for (const type of ['custom', 'license', 'other']) {
            const data = payload()
            data.documents[0].type = type
            expect(publicPassportPayloadV1(data)).toBe(null)
        }
        for (const patch of [{ label: 'private user-supplied name' }, { status: 'untrusted' }]) {
            const data = payload()
            Object.assign(data.documents[0], patch)
            expect(publicPassportPayloadV1(data)).toBe(null)
        }
    })

    it('rejects oversized history, malformed dates and malformed numeric values', () => {
        const data = payload()
        data.maintenance = Array.from({ length: 101 }, () => data.maintenance[0])
        data.summary.maintenanceCount = 101
        expect(publicPassportPayloadV1(data)).toBe(null)
        for (const date of ['2026-02-30', 'private information', '2026-09-30T00:00:00Z']) {
            const malformed = payload()
            malformed.maintenance[0].date = date
            expect(publicPassportPayloadV1(malformed)).toBe(null)
        }
        const malformed = payload()
        malformed.car.currentOdometer = -1
        expect(publicPassportPayloadV1(malformed)).toBe(null)
    })

    it('re-fetches the endpoint on every call, so a revoke never falls back to a delivered DTO', async () => {
        const fetchImpl = vi.fn()
            .mockResolvedValueOnce({ ok: true, status: 200, json: async () => payload() })
            .mockResolvedValueOnce({ ok: false, status: 404 })
        expect((await loadPublicPassportV1({ hash: `#${token}`, fetchImpl })).state).toBe('ready')
        expect(await loadPublicPassportV1({ hash: `#${token}`, fetchImpl })).toEqual({ state: 'unavailable', passport: null })
        expect(fetchImpl).toHaveBeenCalledTimes(2)
    })
})
