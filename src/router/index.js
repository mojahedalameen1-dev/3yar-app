import { createRouter, createWebHistory } from 'vue-router'

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

    // Protected routes (auth required)
    {
        path: '/dashboard',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: { title: 'لوحة التحكم', requiresAuth: true }
    },
    {
        path: '/tasks',
        name: 'tasks',
        component: () => import('@/views/TasksView.vue'),
        meta: { title: 'مهام الصيانة', requiresAuth: true }
    },
    {
        path: '/records',
        name: 'records',
        component: () => import('@/views/RecordsView.vue'),
        meta: { title: 'سجل الصيانة', requiresAuth: true }
    },
    {
        path: '/documents',
        name: 'documents',
        component: () => import('@/views/DocumentsView.vue'),
        meta: { title: 'وثائق السيارة', requiresAuth: true }
    },
    {
        path: '/settings',
        name: 'settings',
        component: () => import('@/views/SettingsView.vue'),
        meta: { title: 'الإعدادات', requiresAuth: true }
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

// Navigation guard for authentication
router.beforeEach(async (to, from, next) => {
    // Update page title
    document.title = to.meta.title ? `${to.meta.title} | عيار` : 'عيار'

    // Check if user is authenticated using Supabase
    const { supabase } = await import('@/lib/supabase')
    const { data: { session } } = await supabase.auth.getSession()

    // If user is logged in and trying to access landing/login/register, redirect to dashboard
    if (session && (to.name === 'landing' || to.name === 'login' || to.name === 'register')) {
        next({ name: 'dashboard' })
        return
    }

    // If route doesn't require auth, proceed
    if (to.meta.public || !to.meta.requiresAuth) {
        next()
        return
    }

    // Check auth for protected routes
    if (session) {
        next()
    } else {
        next({ name: 'login', query: { redirect: to.fullPath } })
    }
})

export default router
