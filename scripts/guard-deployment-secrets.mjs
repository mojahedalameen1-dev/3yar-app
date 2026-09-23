import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const sensitiveNamePatterns = [
    /^\.env(?:\.(?!example$).+)?$/i,
    /firebase-adminsdk.*\.json$/i,
    /service[-_]?account.*\.json$/i,
    /credential.*\.json$/i,
    /\.(?:pem|key|p12|pfx|secret|bak|backup|old|orig)$/i
]

const requiredVercelIgnorePatterns = [
    '.env', '.env.*', '**/.env', '**/.env.*',
    'firebase-service-account.json', '**/firebase-service-account.json',
    '*-firebase-adminsdk-*.json', '**/*-firebase-adminsdk-*.json',
    '*service-account*.json', '**/*service-account*.json',
    '*credential*.json', '**/*credential*.json',
    '*.pem', '**/*.pem', '*.key', '**/*.key',
    '*.p12', '**/*.p12', '*.pfx', '**/*.pfx',
    '*.secret', '**/*.secret', '*.bak', '**/*.bak',
    '*.backup', '**/*.backup', '*.old', '**/*.old', '*.orig', '**/*.orig'
]

const requiredGitIgnorePatterns = [
    '.env', '.env.*', '!.env.example',
    'firebase-service-account.json', '*-firebase-adminsdk-*.json',
    '*service-account*.json', '*credential*.json',
    '*.pem', '*.key', '*.p12', '*.pfx', '*.secret',
    '*.bak', '*.backup', '*.old', '*.orig'
]

const excludedDirectories = new Set(['.git', 'node_modules', '.vercel'])
const textFileExtensions = new Set(['.json', '.js', '.mjs', '.cjs', '.map', '.html', '.txt', '.env', '.yaml', '.yml'])

export function isSensitiveCredentialPath(path) {
    const basename = String(path).replaceAll('\\', '/').split('/').at(-1) || ''
    if (/^\.env\.example$/i.test(basename)) return false
    return sensitiveNamePatterns.some(pattern => pattern.test(basename))
}

function hasIgnoreCoverage(contents, requiredPatterns) {
    const entries = new Set(String(contents).split(/\r?\n/).map(line => line.trim()).filter(Boolean))
    return requiredPatterns.every(pattern => entries.has(pattern))
}

export function hasRequiredIgnoreCoverage(vercelContents, gitContents) {
    return hasIgnoreCoverage(vercelContents, requiredVercelIgnorePatterns)
        && hasIgnoreCoverage(gitContents, requiredGitIgnorePatterns)
}

function hasCredentialPayload(filePath) {
    if (!textFileExtensions.has(filePath.slice(filePath.lastIndexOf('.')).toLowerCase())) return false
    if (statSync(filePath).size > 20 * 1024 * 1024) return false
    const content = readFileSync(filePath, 'utf8')
    const hasPrivateKeyMaterial = /-----BEGIN (?:RSA )?PRIVATE KEY-----/.test(content)
    const hasPrivateKeyField = /["']private_key["']\s*:\s*["']\s*\S+/i.test(content)
    const hasServiceAccountIdentity = /["']type["']\s*:\s*["']service_account["']/i.test(content)
        && /["']private_key_id["']\s*:/i.test(content)
    return hasPrivateKeyMaterial || hasPrivateKeyField || hasServiceAccountIdentity
}

export function findDeploymentCredentialFiles(rootDirectory) {
    const root = resolve(rootDirectory)
    const found = new Set()
    const visit = directory => {
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
            if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue
            const absolutePath = join(directory, entry.name)
            if (entry.isDirectory()) {
                visit(absolutePath)
            } else if (isSensitiveCredentialPath(entry.name) || hasCredentialPayload(absolutePath)) {
                found.add(relative(root, absolutePath).replaceAll('\\', '/'))
            }
        }
    }
    visit(root)
    return [...found].sort()
}

function reportFailure(message) {
    process.stderr.write(`Credential guard failed: ${message}\n`)
    process.exitCode = 1
}

function runGuard() {
    const root = process.cwd()
    if (process.argv.includes('--artifact')) {
        const artifactDirectory = join(root, 'dist')
        if (!existsSync(artifactDirectory)) {
            reportFailure('build artifact directory is missing.')
            return
        }
        const files = findDeploymentCredentialFiles(artifactDirectory)
        if (files.length) reportFailure(`credentials were emitted to build artifacts (${files.join(', ')}).`)
        return
    }

    let vercelIgnore = ''
    let gitIgnore = ''
    try {
        vercelIgnore = readFileSync(join(root, '.vercelignore'), 'utf8')
        gitIgnore = readFileSync(join(root, '.gitignore'), 'utf8')
    } catch {
        reportFailure('required deployment ignore files are missing.')
        return
    }

    if (!hasRequiredIgnoreCoverage(vercelIgnore, gitIgnore)) {
        reportFailure('credential filename patterns are not covered by both .gitignore and .vercelignore.')
        return
    }

    const files = findDeploymentCredentialFiles(root)
    if (files.length) reportFailure(`sensitive credential files or payloads are present in deployment source (${files.join(', ')}).`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runGuard()
