import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
    findDeploymentCredentialFiles,
    hasRequiredIgnoreCoverage,
    isSensitiveCredentialPath
} from '../../scripts/guard-deployment-secrets.mjs'

test('credential filenames are identified without reading their contents', () => {
    assert.equal(isSensitiveCredentialPath('yar-firebase-adminsdk-test.json'), true)
    assert.equal(isSensitiveCredentialPath('service-account.json'), true)
    assert.equal(isSensitiveCredentialPath('.env.production'), true)
    assert.equal(isSensitiveCredentialPath('.env.example'), false)
})
test('ignore configuration requires the credential patterns in both deployment and git ignores', () => {
    const vercelIgnore = [
        '.env', '.env.*', '**/.env', '**/.env.*',
        'firebase-service-account.json', '**/firebase-service-account.json',
        '*-firebase-adminsdk-*.json', '**/*-firebase-adminsdk-*.json',
        '*service-account*.json', '**/*service-account*.json',
        '*credential*.json', '**/*credential*.json',
        '*.pem', '**/*.pem', '*.key', '**/*.key', '*.p12', '**/*.p12',
        '*.pfx', '**/*.pfx', '*.secret', '**/*.secret', '*.bak', '**/*.bak',
        '*.backup', '**/*.backup', '*.old', '**/*.old', '*.orig', '**/*.orig'
    ].join('\n')
    const gitIgnore = [
        '.env', '.env.*', '!.env.example', 'firebase-service-account.json',
        '*-firebase-adminsdk-*.json', '*service-account*.json', '*credential*.json',
        '*.pem', '*.key', '*.p12', '*.pfx', '*.secret', '*.bak', '*.backup', '*.old', '*.orig'
    ].join('\n')

    assert.equal(hasRequiredIgnoreCoverage(vercelIgnore, gitIgnore), true)
    assert.equal(hasRequiredIgnoreCoverage(vercelIgnore.replace('*.pem', ''), gitIgnore), false)
})

test('source scan flags credential payloads but never returns their contents', () => {
    const root = mkdtempSync(join(tmpdir(), '3yar-credential-guard-'))
    try {
        mkdirSync(join(root, 'safe'), { recursive: true })
        writeFileSync(join(root, 'safe', 'runtime.js'), 'export const ok = true')
        writeFileSync(join(root, 'safe', 'config.json'), JSON.stringify({
            type: 'service_account',
            private_key_id: 'fixture-key-id',
            private_key: 'never-print-this-test-value'
        }))
        assert.deepEqual(findDeploymentCredentialFiles(root), ['safe/config.json'])
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})
