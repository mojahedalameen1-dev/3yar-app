/** Adapter contract for retrieving centrally managed feature flag configuration. */
export class FeatureFlagProvider {
  async getConfig() {
    throw new Error('FeatureFlagProvider.getConfig must be implemented by an adapter')
  }
}
