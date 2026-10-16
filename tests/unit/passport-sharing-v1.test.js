import { describe, expect, it, vi } from 'vitest'
import {
    buildPassportShareUrlV1,
    copyPassportLinkV1,
    getPassportShareConfirmationV1,
    PASSPORT_SHARE_MESSAGES_V1,
    requestPassportShareV1,
    sharePassportLinkV1
} from '../../src/lib/passport-sharing-v1'

const token = 'a'.repeat(43)
const response = (status, data) => ({ ok: status >= 200 && status < 300, status, json: async () => data })

describe('V1 Passport link privacy and owner sharing client', () => {
    it('builds only current-origin /status#TOKEN links for Production or internal Preview', () => {
        expect(buildPassportShareUrlV1('https://3yar-app-lpha.vercel.app/passport', token)).toBe(`https://3yar-app-lpha.vercel.app/status#${token}`)
        expect(buildPassportShareUrlV1('https://internal-preview.vercel.app', token)).toBe(`https://internal-preview.vercel.app/status#${token}`)
        expect(buildPassportShareUrlV1('javascript:invalid', token)).toBeNull()
        expect(buildPassportShareUrlV1('https://example.test', 'bad/token')).toBeNull()
        expect(buildPassportShareUrlV1('https://example.test', null)).toBeNull()
    })

    it('authenticates owner operations without trusting or sending a userId', async () => {
        const fetchImpl = vi.fn(async () => response(200, { enabled: true, token, ignored: 'not copied' }))
        expect(await requestPassportShareV1({ carId: 'car-a', operation: 'enable', getIdToken: async () => 'synthetic-id-token', fetchImpl })).toEqual({ enabled: true, token })
        const [url, options] = fetchImpl.mock.calls[0]
        expect(url).toBe('/api/passport-share')
        expect(options.method).toBe('POST')
        expect(options.cache).toBe('no-store')
        expect(JSON.parse(options.body)).toEqual({ carId: 'car-a', operation: 'enable' })
        expect(options.headers.Authorization).toBe('Bearer synthetic-id-token')
    })

    it('supports only getStatus, enable, disable, rotate operations', async () => {
        const fetchImpl = vi.fn(async () => response(200, { enabled: false, token: null }))
        for (const operation of ['getStatus', 'enable', 'disable', 'rotate']) {
            await requestPassportShareV1({ carId: 'car-a', operation, getIdToken: async () => 'synthetic', fetchImpl })
        }
        await expect(requestPassportShareV1({ carId: 'car-a', operation: 'arbitrary', getIdToken: async () => 'synthetic', fetchImpl })).rejects.toThrow(PASSPORT_SHARE_MESSAGES_V1.malformed)
        expect(fetchImpl).toHaveBeenCalledTimes(4)
    })

    it('never requests the owner API without a current ID token', async () => {
        const fetchImpl = vi.fn()
        await expect(requestPassportShareV1({ carId: 'car-a', operation: 'enable', getIdToken: async () => null, fetchImpl })).rejects.toThrow(PASSPORT_SHARE_MESSAGES_V1.auth)
        await expect(requestPassportShareV1({ carId: 'car-a', operation: 'enable', getIdToken: async () => { throw new Error('private raw failure') }, fetchImpl })).rejects.toThrow(PASSPORT_SHARE_MESSAGES_V1.auth)
        expect(fetchImpl).not.toHaveBeenCalled()
    })

    it('turns unavailable/auth errors into safe distinct messages, never returning raw backend errors', async () => {
        const request = status => requestPassportShareV1({ carId: 'car-a', operation: 'getStatus', getIdToken: async () => 'synthetic', fetchImpl: async () => response(status, { error: 'RAW_PRIVATE_ERROR' }) })
        await expect(request(401)).rejects.toThrow(PASSPORT_SHARE_MESSAGES_V1.auth)
        await expect(request(403)).rejects.toThrow(PASSPORT_SHARE_MESSAGES_V1.denied)
        await expect(request(500)).rejects.toThrow(PASSPORT_SHARE_MESSAGES_V1.unavailable)
    })

    it('rejects malformed successful responses and removes leftover token when disabled', async () => {
        const request = data => requestPassportShareV1({ carId: 'car-a', operation: 'getStatus', getIdToken: async () => 'synthetic', fetchImpl: async () => response(200, data) })
        await expect(request({ enabled: true, token: 'weak' })).rejects.toThrow(PASSPORT_SHARE_MESSAGES_V1.malformed)
        await expect(request({ enabled: 'true', token })).rejects.toThrow(PASSPORT_SHARE_MESSAGES_V1.malformed)
        expect(await request({ enabled: false, token })).toEqual({ enabled: false, token: null })
    })

    it('requires clear confirmations for replacement and disabling', () => {
        expect(getPassportShareConfirmationV1('rotate').message).toContain('الرابط الحالي سيتوقف عن العمل')
        expect(getPassportShareConfirmationV1('disable').message).toContain('الرابط الحالي سيتوقف عن العمل')
        expect(getPassportShareConfirmationV1('enable')).toBeNull()
    })

    it('copies via clipboard if available', async () => {
        const writeText = vi.fn(async () => {})
        const manualSelect = vi.fn()
        expect(await copyPassportLinkV1('https://example.test/status#test', { navigatorObject: { clipboard: { writeText } }, manualSelect })).toBe('copied')
        expect(writeText).toHaveBeenCalledWith('https://example.test/status#test')
        expect(manualSelect).not.toHaveBeenCalled()
    })

    it('offers manual selection when clipboard is absent or denied', async () => {
        const manualSelect = vi.fn()
        expect(await copyPassportLinkV1('link', { navigatorObject: {}, manualSelect })).toBe('manual')
        expect(await copyPassportLinkV1('link', { navigatorObject: { clipboard: { writeText: async () => { throw new Error('denied') } } }, manualSelect })).toBe('manual')
        expect(manualSelect).toHaveBeenCalledTimes(2)
    })

    it('uses Web Share with clipboard fallback and respects cancellation', async () => {
        const share = vi.fn(async () => {})
        expect(await sharePassportLinkV1('link', { navigatorObject: { share } })).toBe('shared')
        expect(share).toHaveBeenCalledWith({ title: 'جواز السيارة — عيار', url: 'link' })
        const writeText = vi.fn(async () => {})
        expect(await sharePassportLinkV1('link', { navigatorObject: { share: async () => { throw new Error('unsupported') }, clipboard: { writeText } } })).toBe('copied')
        expect(await sharePassportLinkV1('link', { navigatorObject: { share: async () => { const error = new Error(); error.name = 'AbortError'; throw error } } })).toBe('cancelled')
    })
})
