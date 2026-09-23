export async function runSingleFlight(loadingRef, operation) {
    if (loadingRef.value) return
    loadingRef.value = true
    try {
        return await operation()
    } finally {
        loadingRef.value = false
    }
}
