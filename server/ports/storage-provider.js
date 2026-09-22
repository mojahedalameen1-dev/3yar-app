/** Adapter contract for private object storage. */
export class StorageProvider {
  async createUploadGrant() {
    throw new Error('StorageProvider.createUploadGrant must be implemented by an adapter')
  }

  async createReadGrant() {
    throw new Error('StorageProvider.createReadGrant must be implemented by an adapter')
  }

  async removeObject() {
    throw new Error('StorageProvider.removeObject must be implemented by an adapter')
  }
}
