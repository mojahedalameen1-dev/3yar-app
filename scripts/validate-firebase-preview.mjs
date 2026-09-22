import { resolvePreviewFirebaseIsolation } from '../server/config/runtime-config.js'

const result = resolvePreviewFirebaseIsolation(process.env)

if (!result.allowed) {
  process.stderr.write('Vercel Preview build blocked: configure an isolated Firebase Staging project for the browser and server credentials.\n')
  process.exitCode = 1
}
