import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useProfileStore } from '@/stores/profile'

const routes = [
    // Public routes (no auth required)
    {
        path: '/',
        name: 'landing',
        component: () => import('@/views/LandingView.vue'),
        meta: { title: 'عيار - رفيق سيارتك الذكي', public: true }
    },
    {
        path: '/login',
        name: 'login',
        component: () => import('@/views/LoginView.vue'),
        meta: { title: 'تسجيل الدخول', public: true }
    },
    {
        path: '/register',
        name: 'register',
        component: () => import('@/views/RegisterView.vue'),
        meta: { title: 'إنشاء حساب', public: true }
    },
    {
        path: '/status/:token',
        name: 'status',
        component: () => import('@/views/StatusView.vue'),
        meta: { title: 'حالة السيارة', public: true }
    },

    // Onboarding route (auth required, no car required)
    {
        path: '/setup-car',
        name: 'setup-car',
        component: () => import('@/views/SetupCarView.vue'),
        meta: { title: 'إعداد السيارة', requiresAuth: true, isOnboarding: true }
    },

    // Protected routes (auth required + car required)
    {
        path: '/dashboard',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: { title: 'لوحة التحكم', requiresAuth: true, requiresCar: true }
    },
    {
        path: '/tasks',
        name: 'tasks',
        component: () => import('@/views/TasksView.vue'),
        meta: { title: 'مهام الصيانة', requiresAuth: true, requiresCar: true }
    },
    {
        path: '/records',
        name: 'records',
        component: () => import('@/views/RecordsView.vue'),
        meta: { title: 'سجل الصيانة', requiresAuth: true, requiresCar: true }
    },
    {
        path: '/documents',
        name: 'documents',
        component: () => import('@/views/DocumentsView.vue'),
        meta: { title: 'وثائق السيارة', requiresAuth: true, requiresCar: true }
    },
    {
        path: '/settings',
        name: 'settings',
        component: () => import('@/views/SettingsView.vue'),
        meta: { title: 'الإعدادات', requiresAuth: true, requiresCar: true }
    },

    // Admin-only route (hidden from navigation)
    {
        path: '/control-tower-iyar',
        name: 'control-tower',
        component: () => import('@/views/ControlTowerView.vue'),
        meta: { title: 'مركز التحكم', requiresAuth: true, requiresAdmin: true }
    },

    // Catch-all redirect
    {
        path: '/:pathMatch(.*)*',
        redirect: '/'
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior(to, from, savedPosition) {
        if (savedPosition) return savedPosition
        if (to.hash) return { el: to.hash, behavior: 'smooth' }
        return { top: 0 }
    }
})

// Navigation guard for authentication and onboarding
router.beforeEach(async (to, from, next) => {
    // Update page title
    document.title = to.meta.title ? `${to.meta.title} | عيار` : 'عيار'

    // Check if user is authenticated using Supabase
    const { data: { session } } = await supabase.auth.getSession()

    // If user is logged in and trying to access landing/login/register
    if (session && (to.name === 'landing' || to.name === 'login' || to.name === 'register')) {
        // Check if user has a car
        const { data: cars } = await supabase
            .from('cars')
            .select('id')
            .eq('user_id', session.user.id)
            .limit(1)

        if (cars && cars.length > 0) {
            next({ name: 'dashboard' })
        } else {
            next({ name: 'setup-car' })
        }
        return
    }

    // If route doesn't require auth, proceed
    if (to.meta.public || !to.meta.requiresAuth) {
        next()
        return
    }

    // Check auth for protected routes
    if (!session) {
        next({ name: 'login', query: { redirect: to.fullPath } })
        return
    }

    // If route requires a car, check if user has one
    if (to.meta.requiresCar) {
        const { data: cars } = await supabase
            .from('cars')
            .select('id')
            .eq('user_id', session.user.id)
            .limit(1)

        if (!cars || cars.length === 0) {
            next({ name: 'setup-car' })
            return
        }
    }

    // If user is on setup-car but already has a car, redirect to dashboard
    if (to.meta.isOnboarding) {
        const { data: cars } = await supabase
            .from('cars')
            .select('id')
            .eq('user_id', session.user.id)
            .limit(1)

        if (cars && cars.length > 0) {
            next({ name: 'dashboard' })
            return
        }
    }

    // Check admin requirement for control tower
    if (to.meta.requiresAdmin) {
        console.log('[Router Guard] Checking admin access for user:', session.user.id)

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', session.user.id)
            .maybeSingle()

        // Debug log the result
        console.log('[Router Guard] Profile fetch result:', { profile, error: profileError })
        console.log('[Router Guard] Current User Role:', profile?.role)

        if (profileError) {
            console.error('[Router Guard] Error fetching profile:', profileError)
            next({ name: 'dashboard' })
            return
        }

        if (!profile || profile.role !== 'admin') {
            console.log('[Router Guard] Access denied - user is not admin, redirecting to dashboard')
            next({ name: 'dashboard' })
            return
        }

        // Sync role to profile store for UI updates
        try {
            const profileStore = useProfileStore()
            profileStore.setRole(profile.role)
            console.log('[Router Guard] Admin access granted, role synced to store')
        } catch (e) {
            console.log('[Router Guard] Could not sync to store (might be fine):', e)
        }
    }

    next()
})

export default router

