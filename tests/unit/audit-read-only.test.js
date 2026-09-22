import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('V2 readiness audit is read-only by construction', () => {
  it('contains no Firestore mutation APIs or write-capable imports', async () => {
    const source = await readFile(new URL('../../scripts/audit-v2-readiness.mjs', import.meta.url), 'utf8')

    expect(source).not.toMatch(/\b(?:writeBatch|BulkWriter|runTransaction|batch)\b/)
    expect(source).not.toMatch(/\.(?:set|add|update|delete|create|recursiveDelete)\s*\(/)
    expect(source).toContain("query.get()")
  })

  it('requires explicit production read-only target and project match', async () => {
    const source = await readFile(new URL('../../scripts/audit-v2-readiness.mjs', import.meta.url), 'utf8')
    expect(source).toContain("target !== 'production-read-only'")
    expect(source).toContain('credentials.project_id !== expectedProjectId')
  })
})
