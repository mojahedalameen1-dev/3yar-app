import { describe, expect, it, vi } from 'vitest'
import { createAccountAndSendVerification } from '../../src/lib/email-verification.js'

describe('email account verification', () => {
    it('sends verification after the account exists', async () => {
        const user = { uid: 'synthetic-user' }
        const send = vi.fn(async () => {})
        const result = await createAccountAndSendVerification(async () => user, send)
        expect(send).toHaveBeenCalledWith(user)
        expect(result).toEqual({ user, verificationSent: true, verificationError: null })
    })

    it('preserves account success and surfaces a retryable send failure', async () => {
        const user = { uid: 'synthetic-user' }
        const result = await createAccountAndSendVerification(async () => user, async () => { throw new Error('offline') })
        expect(result.user).toBe(user)
        expect(result.verificationSent).toBe(false)
        expect(result.verificationError.message).toBe('offline')
    })

    it('does not send verification if account creation fails', async () => {
        const send = vi.fn()
        await expect(createAccountAndSendVerification(async () => { throw new Error('create-failed') }, send)).rejects.toThrow('create-failed')
        expect(send).not.toHaveBeenCalled()
    })
})
