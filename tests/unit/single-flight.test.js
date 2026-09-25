import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { runSingleFlight } from '../../src/lib/single-flight.js'

describe('single-flight maintenance submit guard', () => {
    it('does not run a second concurrent submit while the first is committing', async () => {
        const loading = ref(false)
        let calls = 0
        let release
        const blocked = new Promise(resolve => { release = resolve })

        const first = runSingleFlight(loading, async () => {
            calls += 1
            await blocked
            return 'committed'
        })
        const second = await runSingleFlight(loading, async () => {
            calls += 1
            return 'duplicate'
        })

        expect(second).toBeUndefined()
        expect(calls).toBe(1)
        release()
        await expect(first).resolves.toBe('committed')
        expect(loading.value).toBe(false)
    })
})
