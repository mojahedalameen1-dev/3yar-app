import { config } from 'dotenv'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { GoogleAuth } from 'google-auth-library'

config({ path: '.env.local', quiet: true })

const domain = process.argv[2]
const enableGoogle = process.argv.includes('--enable-google')
if (!domain) throw new Error('Usage: node scripts/configure-firebase-auth.mjs <authorized-domain>')

const credentials = JSON.parse(
    await readFile(resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH), 'utf8')
)
const projectId = credentials.project_id
const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
})
const client = await auth.getClient()
const endpoint = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`
const current = await client.request({ url: endpoint })
const authorizedDomains = [...new Set([...(current.data.authorizedDomains || []), domain])]

await client.request({
    url: `${endpoint}?updateMask=authorizedDomains`,
    method: 'PATCH',
    data: { authorizedDomains }
})

console.log(`Authorized Firebase domain ensured: ${domain}`)

try {
    const providerUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/defaultSupportedIdpConfigs/google.com`
    let googleProvider = await client.request({ url: providerUrl })
    if (enableGoogle && googleProvider.data.enabled !== true) {
        googleProvider = await client.request({
            url: `${providerUrl}?updateMask=enabled`,
            method: 'PATCH',
            data: { enabled: true }
        })
    }
    console.log(`Google sign-in enabled: ${googleProvider.data.enabled === true}`)
} catch (error) {
    if (error.response?.status === 404) console.log('Google sign-in enabled: false')
    else throw error
}
