import { createHmac, timingSafeEqual } from 'node:crypto'

const MAX_SIGNATURE_TTL_SECONDS = 15 * 60

function signPayload(payload) {
    return createHmac('sha256', process.env.BLOB_READ_WRITE_TOKEN).update(payload).digest('base64url')
}

export function signPath(pathname, expiresAt = Math.floor(Date.now() / 1000) + MAX_SIGNATURE_TTL_SECONDS) {
    return { signature: signPayload(`${pathname}\n${expiresAt}`), expiresAt }
}

export function validSignature(pathname, signature, expiresAt, now = Math.floor(Date.now() / 1000)) {
    if (!Number.isSafeInteger(Number(expiresAt)) || Number(expiresAt) <= now || Number(expiresAt) > now + MAX_SIGNATURE_TTL_SECONDS) return false
    return constantTimeEqual(signPayload(`${pathname}\n${Number(expiresAt)}`), signature)
}

/** Only for URLs issued before the expiring-signature format; never use for new links. */
export function validLegacySignature(pathname, signature) {
    return constantTimeEqual(signPayload(pathname), signature)
}

function constantTimeEqual(expectedValue, signature) {
    if (!signature) return false
    const expected = Buffer.from(expectedValue)
    const actual = Buffer.from(signature)
    return expected.length === actual.length && timingSafeEqual(expected, actual)
}
