const DEFAULT_IMAGE_BYTES = 512 * 1024
const configuredImageBytes = Number(import.meta.env.VITE_DATA_URL_IMAGE_MAX_BYTES)

export const V1_UPLOAD_LIMITS = Object.freeze({
    imageBytes: Number.isSafeInteger(configuredImageBytes) && configuredImageBytes > 0
        ? configuredImageBytes
        : DEFAULT_IMAGE_BYTES
})
