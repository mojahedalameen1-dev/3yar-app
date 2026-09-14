import { config } from 'dotenv'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { GoogleAuth } from 'google-auth-library'

config({ path: '.env.local', quiet: true })

const domain = process.argv[2]
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
