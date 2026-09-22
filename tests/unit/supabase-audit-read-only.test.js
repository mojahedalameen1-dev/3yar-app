import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const auditScript = readFileSync('scripts/audit-supabase-legacy-readiness.mjs', 'utf8')
const packageJson = readFileSync('package.json', 'utf8')

describe('legacy Supabase audit safety', () => {
  it('requires explicit legacy Supabase and Firestore project IDs', () => {
    expect(auditScript).toContain("argumentValue('target') !== 'legacy-supabase-read-only'")
    expect(auditScript).toContain("argumentValue('expected-supabase-ref') !== EXPECTED_SUPABASE_REF")
    expect(auditScript).toContain("argumentValue('expected-firebase-project') !== credentials.project_id")
    expect(packageJson).toContain('--target=legacy-supabase-read-only')
    expect(packageJson).toContain('--expected-supabase-ref=koljxracpdgiqbxaiapc')
    expect(packageJson).toContain('--expected-firebase-project=yar-3yar-free')
    expect(auditScript).toContain("hostname !== `${EXPECTED_SUPABASE_REF}.supabase.co`")
  })

  it('uses migration identities, stable pagination, and redacted association summaries', () => {
    expect(auditScript).toContain('(row.id ?? fallbackId)')
    expect(auditScript).toContain('stableOrderFields(table, fields)')
    expect(auditScript).toContain("request.order(field, { ascending: true })")
    expect(auditScript).toContain('FieldPath.documentId()')
    expect(auditScript).toContain('readRows.length !== exactCount')
    expect(auditScript).toContain('recordGroups: ownership.groupCount')
    expect(auditScript).not.toContain('recordGroups: [...grouped.values()]')
    expect(auditScript).toContain("countAttachmentReferences(sourceRows.maintenance_records, ['invoice_image'])")
    expect(auditScript).toContain('inventoryUnmappedSourceTables(client, schema)')
    expect(auditScript).toContain('inventoryUnmappedFirestoreCollections(db)')
    expect(auditScript).toContain("countFirestoreCollectionGroup(db, 'maintenance_records')")
  })

  it('contains only database and storage list/read operations', () => {
    expect(auditScript).toContain('.select(')
    expect(auditScript).toContain('.listBuckets()')
    expect(auditScript).toContain('.list(folder,')
    expect(auditScript).toContain('collection.orderBy(FieldPath.documentId()).limit(PAGE_SIZE)')
    expect(auditScript).toContain('await request.get()')
    expect(auditScript).not.toMatch(/\.from\([^)]*\)\.(?:insert|upsert|update|delete)\(/)
    expect(auditScript).not.toMatch(/\.storage\.from\([^)]*\)\.(?:upload|update|remove|createBucket|deleteBucket|emptyBucket)\(/)
    expect(auditScript).not.toMatch(/\.collection\([^)]*\)\.(?:set|update|delete|add)\(/)
  })
})
