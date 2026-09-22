export const FEATURE_FLAG_KEYS = Object.freeze([
  'v2Reads',
  'v2Writes',
  'maintenanceEngineV2',
  'dashboardV2',
  'secureSharingV2',
  'notificationsV2',
  'pushV1',
  'privateAttachmentsV2'
])

export function createSafeFeatureFlagConfig() {
  return {
    globalEnabled: false,
    flags: Object.fromEntries(FEATURE_FLAG_KEYS.map(key => [key, {
      enabled: false,
      killSwitch: false,
      allowUserIds: [],
      rolloutPercentage: 0
    }]))
  }
}

export const SAFE_FEATURE_FLAGS = Object.freeze(
  Object.fromEntries(FEATURE_FLAG_KEYS.map(key => [key, false]))
)

function normalizePercentage(value) {
  const percentage = Number(value)
  if (!Number.isFinite(percentage)) return 0
  return Math.max(0, Math.min(100, Math.floor(percentage)))
}

export function normalizeFeatureFlagConfig(value) {
  const source = value && typeof value === 'object' ? value : {}
  const sourceFlags = source.flags && typeof source.flags === 'object' ? source.flags : {}

  return {
    globalEnabled: source.globalEnabled === true,
    flags: Object.fromEntries(FEATURE_FLAG_KEYS.map(key => {
      const flag = sourceFlags[key] && typeof sourceFlags[key] === 'object' ? sourceFlags[key] : {}
      const allowUserIds = Array.isArray(flag.allowUserIds)
        ? [...new Set(flag.allowUserIds.filter(id => typeof id === 'string' && id.length > 0))]
        : []

      return [key, {
        enabled: flag.enabled === true,
        killSwitch: flag.killSwitch === true,
        allowUserIds,
        rolloutPercentage: normalizePercentage(flag.rolloutPercentage)
      }]
    }))
  }
}

export function stableUserBucket(flagKey, userId) {
  if (typeof flagKey !== 'string' || !flagKey || typeof userId !== 'string' || !userId) return null

  const input = `${flagKey}:${userId}`
  let hash = 0x811c9dc5
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  return (hash >>> 0) % 100
}

export function evaluateFeatureFlag(configValue, flagKey, userId) {
  if (!FEATURE_FLAG_KEYS.includes(flagKey)) return false

  const config = normalizeFeatureFlagConfig(configValue)
  const flag = config.flags[flagKey]

  // Evaluation order is intentional: a kill switch always wins.
  if (flag.killSwitch) return false
  if (!config.globalEnabled) return false
  if (userId && flag.allowUserIds.includes(userId)) return true
  if (!flag.enabled) return false

  const bucket = stableUserBucket(flagKey, userId)
  return bucket !== null && bucket < flag.rolloutPercentage
}

export function evaluateFeatureFlags(configValue, userId) {
  return Object.fromEntries(FEATURE_FLAG_KEYS.map(key => [
    key,
    evaluateFeatureFlag(configValue, key, userId)
  ]))
}
