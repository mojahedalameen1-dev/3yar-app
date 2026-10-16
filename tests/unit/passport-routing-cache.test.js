import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'

const captured = vi.hoisted(() => ({ options: null, guard: null, getSession: vi.fn() }))
vi.mock('vue-router', () => ({
    createWebHistory: () => ({}),
    createRouter: options => {
        captured.options = options
        return { beforeEach: guard => { captured.guard = guard } }
    }
}))
vi.mock('../../src/lib/firebase.js', () => ({ supabase: { auth: { getSession: captured.getSession } }, isFirebaseAdmin: vi.fn() }))

import '../../src/router/index.js'

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks() })

describe('passport route and caching regression', () => {
    it('protects the owner route and keeps the two status routes public and distinct', () => {
        const routes = captured.options.routes
        expect(routes.find(route => route.path === '/passport').meta).toMatchObject({ requiresAuth: true, requiresCar: true })
        expect(routes.find(route => route.path === '/status').meta).toMatchObject({ public: true, publicPassport: true })
        expect(routes.find(route => route.path === '/status/:token').meta).toMatchObject({ public: true, legacyShare: true })
    })

    it('does not request a Firebase session or Firestore when visiting either public route', async () => {
        vi.stubGlobal('document', { title: '' })
        for (const name of ['status', 'legacy-status']) {
            const route = captured.options.routes.find(route => route.name === name)
            const next = vi.fn()
            await captured.guard(route, {}, next)
            expect(next).toHaveBeenCalledWith()
        }
        expect(captured.getSession).not.toHaveBeenCalled()
    })

    // Exercise the real bootstrap body with controlled dependencies, without a
    // DOM/browser or Firebase. This catches the cold lazy-route/cached-auth race.
    function appBootstrap(dependencies) {
        const source = readFileSync('src/App.vue', 'utf8')
        const body = source.match(/async function initialize\(\) \{[\s\S]*?\n\}/)?.[0]
        expect(body).toBeTruthy()
        const names = Object.keys(dependencies)
        return new Function(...names, `${body}; return initialize`)(...names.map(name => dependencies[name]))
    }

    it.each([true, false])('waits for initial route before cached auth/private reads (public=%s)', async publicPassport => {
        let resolveRoute
        const ready = new Promise(resolve => { resolveRoute = resolve })
        const route = { meta: {} }
        const authStore = { isAuthenticated: true, initialize: vi.fn(async () => {}) }
        const initializeData = vi.fn(async () => {})
        const appLoading = { value: true }
        const initialize = appBootstrap({ route, authStore, initializeData, appLoading,
            themeStore: { initialize: vi.fn() }, router: { isReady: () => ready } })
        const pending = initialize()
        await Promise.resolve()
        expect(authStore.initialize).not.toHaveBeenCalled()
        expect(initializeData).not.toHaveBeenCalled()
        route.meta.publicPassport = publicPassport
        resolveRoute()
        await pending
        expect(authStore.initialize).toHaveBeenCalledTimes(1)
        expect(initializeData).toHaveBeenCalledTimes(publicPassport ? 0 : 1)
        if (publicPassport) expect(appLoading.value).toBe(false)
    })

    it('never passes a bearer fragment to selector-based hash scrolling', () => {
        expect(captured.options.scrollBehavior({ meta: { publicPassport: true }, hash: '#secret' }, {}, { top: 15 })).toEqual({ top: 0 })
        expect(captured.options.scrollBehavior({ meta: {}, hash: '#features' }, {}, null)).toEqual({ el: '#features', behavior: 'smooth' })
    })

    it('sets public page privacy headers without altering existing canonical rewrites', () => {
        const config = JSON.parse(readFileSync('vercel.json', 'utf8'))
        expect(config.rewrites).toEqual([{ source: '/(.*)', destination: '/index.html' }])
        for (const source of ['/status', '/status/:path*']) {
            expect(config.headers.find(rule => rule.source === source).headers).toEqual(expect.arrayContaining([
                { key: 'Cache-Control', value: 'no-store' },
                { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
                { key: 'Referrer-Policy', value: 'no-referrer' }
            ]))
        }
    })

    it('explicitly routes POST public passport through NetworkOnly and clears UI on history restore', () => {
        const config = readFileSync('vite.config.js', 'utf8')
        expect(config).toContain("method: 'POST'")
        expect(config).toContain("handler: 'NetworkOnly'")
        expect(config).toContain('public-passport')
        const view = readFileSync('src/views/StatusView.vue', 'utf8')
        expect(view).toContain("window.addEventListener('pagehide', pageHidden)")
        expect(view).toContain("window.addEventListener('pageshow', pageShown)")
        expect(view).toContain("document.addEventListener('visibilitychange', visibilityChanged)")
        expect(view).not.toContain("@/lib/firebase")
        expect(view).not.toContain('v-html')
    })
})
