import { randomUUID } from 'node:crypto'
import { deleteApp, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

export async function createEmulatorDatabase() {
  const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_CONFIG?.projectId || 'demo-3yar-phase0b'
  if (!process.env.FIRESTORE_EMULATOR_HOST || !projectId.startsWith('demo-')) {
    throw new Error('Phase 0B emulator tests require FIRESTORE_EMULATOR_HOST and an isolated demo-* Firebase project')
  }
  const app = initializeApp({ projectId }, `phase0b-${randomUUID()}`)
  return { db: getFirestore(app), close: () => deleteApp(app) }
}

export function testNamespace() {
  return `v2_test_${randomUUID().replaceAll('-', '')}`
}
