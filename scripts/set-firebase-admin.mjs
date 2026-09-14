import { config } from 'dotenv'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { cert, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

config({ path: '.env.local' })
config()

const email = process.argv[2]
if (!email) throw new Error('Usage: npm run firebase:set-admin -- admin@example.com')
if (!process.env.FIREBASE_SERVICE_ACCOUNT_PATH) throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH is required')

const serviceAccount = JSON.parse(await readFile(resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH), 'utf8'))
const app = initializeApp({ credential: cert(serviceAccount) })
const auth = getAuth(app)
const user = await auth.getUserByEmail(email)
await auth.setCustomUserClaims(user.uid, { ...(user.customClaims || {}), admin: true })
console.log(`Admin claim granted to ${email}. The user must sign out and sign in again.`)
