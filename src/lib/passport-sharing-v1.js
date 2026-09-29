const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/
const SHARE_OPERATIONS = new Set(['getStatus', 'enable', 'disable', 'rotate'])

export const PASSPORT_SHARE_MESSAGES_V1 = Object.freeze({
    auth: 'انتهت جلسة الدخول. سجّل الدخول ثم أعد المحاولة.',
    denied: 'تعذر إدارة مشاركة هذه السيارة.',
    unavailable: 'تعذر تحديث المشاركة الآن. أعد المحاولة.',
    malformed: 'تعذر التحقق من حالة المشاركة. أعد المحاولة.'
})

export function buildPassportShareUrlV1(origin, token) {
    if (typeof token !== 'string' || !TOKEN_PATTERN.test(token)) return null
    try {
        const base = new URL(origin)
        if (!['https:', 'http:'].includes(base.protocol)) return null
        return `${base.origin}/status#${token}`
    } catch {
        return null
    }
}

export function getPassportShareConfirmationV1(operation) {
    if (operation === 'rotate') return { title: 'إنشاء رابط جديد؟', message: 'الرابط الحالي سيتوقف عن العمل. شارك الرابط الجديد مع من تريد.', confirm: 'إنشاء رابط جديد' }
    if (operation === 'disable') return { title: 'إيقاف مشاركة جواز السيارة؟', message: 'الرابط الحالي سيتوقف عن العمل ولن يتمكن الآخرون من عرض الجواز.', confirm: 'إيقاف المشاركة' }
    return null
}

/** Inject auth/fetch for tests; the token and credential never leave request memory. */
export async function requestPassportShareV1({ carId, operation, getIdToken, fetchImpl = fetch, signal } = {}) {
    if (!carId || !SHARE_OPERATIONS.has(operation) || typeof getIdToken !== 'function') throw new Error(PASSPORT_SHARE_MESSAGES_V1.malformed)
    let idToken
    try { idToken = await getIdToken() } catch { throw new Error(PASSPORT_SHARE_MESSAGES_V1.auth) }
    if (!idToken) throw new Error(PASSPORT_SHARE_MESSAGES_V1.auth)

    let response
    try {
        response = await fetchImpl('/api/passport-share', {
            method: 'POST',
            headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ carId, operation }),
            cache: 'no-store',
            ...(signal ? { signal } : {})
        })
    } catch { throw new Error(PASSPORT_SHARE_MESSAGES_V1.unavailable) }
    if (!response.ok) {
        if (response.status === 401) throw new Error(PASSPORT_SHARE_MESSAGES_V1.auth)
        if ([403, 404].includes(response.status)) throw new Error(PASSPORT_SHARE_MESSAGES_V1.denied)
        throw new Error(PASSPORT_SHARE_MESSAGES_V1.unavailable)
    }

    let data
    try { data = await response.json() } catch { throw new Error(PASSPORT_SHARE_MESSAGES_V1.malformed) }
    if (typeof data?.enabled !== 'boolean' || (data.enabled && (typeof data.token !== 'string' || !TOKEN_PATTERN.test(data.token)))) {
        throw new Error(PASSPORT_SHARE_MESSAGES_V1.malformed)
    }
    return { enabled: data.enabled, token: data.enabled ? data.token : null }
}

/** Return a manual-copy state instead of falsely reporting success if clipboard is unavailable. */
export async function copyPassportLinkV1(url, { navigatorObject = globalThis.navigator, manualSelect } = {}) {
    if (typeof navigatorObject?.clipboard?.writeText === 'function') {
        try {
            await navigatorObject.clipboard.writeText(url)
            return 'copied'
        } catch { /* Fall through to a selectable, labelled field. */ }
    }
    if (typeof manualSelect === 'function') manualSelect()
    return 'manual'
}

export async function sharePassportLinkV1(url, { navigatorObject = globalThis.navigator, manualSelect } = {}) {
    if (typeof navigatorObject?.share === 'function') {
        try {
            await navigatorObject.share({ title: 'جواز السيارة — عيار', url })
            return 'shared'
        } catch (error) {
            if (error?.name === 'AbortError') return 'cancelled'
        }
    }
    return copyPassportLinkV1(url, { navigatorObject, manualSelect })
}
