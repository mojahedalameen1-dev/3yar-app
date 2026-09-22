export async function authenticatedGet(path, idToken, { signal } = {}) {
  const response = await fetch(path, {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}`, Accept: 'application/json' },
    cache: 'no-store',
    signal
  })

  if (!response.ok) throw new Error(`Request failed with status ${response.status}`)
  return response.json()
}
