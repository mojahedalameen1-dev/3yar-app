import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const state = vi.hoisted(() => ({
    announcementsResult: { data: [], error: null },
    readsResult: { data: [], error: null },
    user: { id: 'user-1' },
    documentsWithStatus: [],
    tasksWithStatus: [],
    documentsError: null,
    tasksError: null
}))

function queryFor(collectionName) {
    const query = {
        select() { return this },
        order() { return this },
        eq() { return this },
        insert() { return this },
        then(resolve, reject) {
            const result = collectionName === 'announcements' ? state.announcementsResult : state.readsResult
            return Promise.resolve(result).then(resolve, reject)
        }
    }
    return query
}

vi.mock('../../src/lib/firebase.js', () => ({
    supabase: {
        auth: { getUser: async () => ({ data: { user: state.user } }) },
        from: (collectionName) => queryFor(collectionName)
    }
}))

vi.mock('../../src/stores/documents.js', () => ({
    useDocumentsStore: () => ({
        get documentsWithStatus() { return state.documentsWithStatus },
        loading: false,
        get error() { return state.documentsError },
        fetchDocuments: async () => {}
    })
}))

vi.mock('../../src/stores/tasks.js', () => ({
    useTasksStore: () => ({
        get tasksWithStatus() { return state.tasksWithStatus },
        loading: false,
        get error() { return state.tasksError },
        fetchTasks: async () => {}
    })
}))

import { useNotificationsStore } from '../../src/stores/notifications.js'

describe('V1 notifications source isolation', () => {
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        setActivePinia(createPinia())
        state.announcementsResult = { data: [], error: null }
        state.readsResult = { data: [], error: null }
        state.user = { id: 'user-1' }
        state.documentsWithStatus = []
        state.tasksWithStatus = []
        state.documentsError = null
        state.tasksError = null
    })

    afterEach(() => vi.restoreAllMocks())

    it('keeps document reminders available when announcements fail to load', async () => {
        state.documentsWithStatus = [{
            id: 'doc-1', typeLabel: 'التأمين', statusInfo: { status: 'expired', daysLeft: -1 }
        }]
        state.announcementsResult = { data: null, error: new Error('network') }
        const store = useNotificationsStore()

        expect(await store.fetchAnnouncements()).toBe(false)
        expect(store.announcementError).toBeTruthy()
        expect(store.actionReminders.map(item => item.id)).toEqual(['document:doc-1:expiry'])
    })

    it('keeps announcements visible when document reminders are unavailable', async () => {
        state.documentsError = 'offline'
        state.announcementsResult = { data: [{ id: 'announcement-1', title: 'تحديث' }], error: null }
        const store = useNotificationsStore()

        expect(await store.fetchAnnouncements()).toBe(true)
        expect(store.announcements.map(item => item.id)).toEqual(['announcement-1'])
        expect(store.actionReminders).toEqual([])
    })

    it('does not treat reminders as unread announcements or read receipts', async () => {
        state.documentsWithStatus = [{
            id: 'doc-2', typeLabel: 'استمارة السيارة', statusInfo: { status: 'needs_expiry', daysLeft: null }
        }]
        const store = useNotificationsStore()

        expect(store.actionReminderCount).toBe(1)
        expect(store.unreadCount).toBe(0)
        expect(store.totalNotificationCount).toBe(1)
        await store.markAllAsRead()
        expect(store.actionReminders).toHaveLength(1)
    })
})
