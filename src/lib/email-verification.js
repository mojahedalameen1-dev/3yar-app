export async function createAccountAndSendVerification(createAccount, sendVerification) {
    const user = await createAccount()
    try {
        await sendVerification(user)
        return { user, verificationSent: true, verificationError: null }
    } catch (verificationError) {
        return { user, verificationSent: false, verificationError }
    }
}
