import { describe, expect, it } from 'vitest'
import {
  createSafeFeatureFlagConfig,
  evaluateFeatureFlag,
  evaluateFeatureFlags,
  FEATURE_FLAG_KEYS,
  normalizeFeatureFlagConfig,
  stableUserBucket
} from '../../shared/contracts/feature-flags.js'

function enabledConfig(flagOverrides = {}, globalEnabled = true) {
  const safe = createSafeFeatureFlagConfig()
  return {
    ...safe,
    globalEnabled,
    flags: {
      ...safe.flags,
      dashboardV2: { ...safe.flags.dashboardV2, enabled: true, ...flagOverrides }
    }
  }
}

describe('feature flag evaluation', () => {
  it('starts every new feature disabled by default', () => {
    expect(evaluateFeatureFlags(createSafeFeatureFlagConfig(), 'user-1')).toEqual(
      Object.fromEntries(FEATURE_FLAG_KEYS.map(key => [key, false]))
    )
    expect(evaluateFeatureFlag(createSafeFeatureFlagConfig(), 'privateAttachmentsV2', 'user-1')).toBe(false)
  })

  it('applies kill switch before allowlist and rollout', () => {
    const config = enabledConfig({
      killSwitch: true,
      allowUserIds: ['pilot-user'],
      rolloutPercentage: 100
    })

    expect(evaluateFeatureFlag(config, 'dashboardV2', 'pilot-user')).toBe(false)
  })

  it('turns off globally before checking allowlist', () => {
    const config = enabledConfig({ allowUserIds: ['pilot-user'] }, false)
    expect(evaluateFeatureFlag(config, 'dashboardV2', 'pilot-user')).toBe(false)
  })

  it('honors allowlist after global enable but before rollout gating', () => {
    const config = enabledConfig({ enabled: false, allowUserIds: ['pilot-user'] })
    expect(evaluateFeatureFlag(config, 'dashboardV2', 'pilot-user')).toBe(true)
    expect(evaluateFeatureFlag(config, 'dashboardV2', 'other-user')).toBe(false)
  })

  it('turns on allowlisted users before percentage rollout', () => {
    const config = enabledConfig({ allowUserIds: ['pilot-user'], rolloutPercentage: 0 })
    expect(evaluateFeatureFlag(config, 'dashboardV2', 'pilot-user')).toBe(true)
  })

  it('uses a deterministic user and flag bucket for percentage rollout', () => {
    const bucket = stableUserBucket('dashboardV2', 'user-42')
    const config = enabledConfig({ rolloutPercentage: bucket + 1 })

    expect(stableUserBucket('dashboardV2', 'user-42')).toBe(bucket)
    expect(evaluateFeatureFlag(config, 'dashboardV2', 'user-42')).toBe(true)
    expect(evaluateFeatureFlag(config, 'dashboardV2', 'user-43')).toBe(
      stableUserBucket('dashboardV2', 'user-43') < bucket + 1
    )
  })

  it('keeps users outside a zero percent rollout off', () => {
    expect(evaluateFeatureFlag(enabledConfig({ rolloutPercentage: 0 }), 'dashboardV2', 'user-1')).toBe(false)
  })

  it('turns on every eligible user at one hundred percent', () => {
    expect(evaluateFeatureFlag(enabledConfig({ rolloutPercentage: 100 }), 'dashboardV2', 'user-1')).toBe(true)
  })

  it('keeps unidentified and unknown flags off', () => {
    expect(evaluateFeatureFlag(enabledConfig({ rolloutPercentage: 100 }), 'dashboardV2', null)).toBe(false)
    expect(evaluateFeatureFlag(enabledConfig({ rolloutPercentage: 100 }), 'notAFeature', 'user-1')).toBe(false)
  })

  it('normalizes malformed values to restrictive defaults', () => {
    const normalized = normalizeFeatureFlagConfig({
      globalEnabled: true,
      flags: { dashboardV2: { enabled: true, rolloutPercentage: 180, allowUserIds: ['u1', 3, 'u1'] } }
    })

    expect(normalized.flags.dashboardV2.rolloutPercentage).toBe(100)
    expect(normalized.flags.dashboardV2.allowUserIds).toEqual(['u1'])
    expect(normalized.flags.secureSharingV2.enabled).toBe(false)
  })
})
