import { createHmac, timingSafeEqual } from 'node:crypto'

export function signPath(pathname) {
    return createHmac('sha256', process.env.BLOB_READ_WRITE_TOKEN).update(pathname).digest('base64url')
}

export function validSignature(pathname, signature) {
    if (!signature) return false
    const expected = Buffer.from(signPath(pathname))
    const actual = Buffer.from(signature)
    return expected.length === actual.length && timingSafeEqual(expected, actual)
}
