function referencedPathMatches(documentData, fieldName, pathname) {
    const reference = documentData?.[fieldName]
    if (reference === pathname) return true
    if (typeof reference !== 'string') return false
    try {
        const parsed = new URL(reference, 'https://3yar.invalid')
        return parsed.pathname === '/api/blob' && parsed.searchParams.get('pathname') === pathname
    } catch {
        return false
    }
}

export function canReadBlobDocument(user, documentData, pathname, fieldName = 'image') {
    if (!user?.uid || !documentData || !referencedPathMatches(documentData, fieldName, pathname)) return false
    const ownerId = documentData.user_id
    const pathOwnerId = String(pathname).split('/')[1]
    if (!ownerId || ownerId !== pathOwnerId) return false
    return ownerId === user.uid || user.admin === true
}

export function canUploadForCar(user, ownerId, carData) {
    return typeof ownerId === 'string'
        && ownerId.length > 0
        && carData?.user_id === ownerId
        && carData?.deletion_requested !== true
        && (user?.uid === ownerId || user?.admin === true)
}
