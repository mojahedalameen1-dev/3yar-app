import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/firebase'
import { useDocumentsStore } from './documents'
import { useTasksStore } from './tasks'
import { buildActionRemindersV1 } from '@/lib/action-reminders-v1'

export const useNotificationsStore = defineStore('notifications', () => {
    const announcements = ref([])
    const readAnnouncements = ref([])
    const announcementsLoading = ref(false)
    const readHistoryLoading = ref(false)
    const markingAsRead = ref(false)
    const readHistoryReady = ref(false)
    const announcementError = ref(null)
    const readHistoryError = ref(null)
    const documentsStore = useDocumentsStore()
    const tasksStore = useTasksStore()

    const loading = computed(() => announcementsLoading.value || readHistoryLoading.value)

    const unreadCount = computed(() => {
        if (!readHistoryReady.value) return 0
        const readIds = new Set(readAnnouncements.value.map(r => r.announcement_id))
        return announcements.value.filter(a => !readIds.has(a.id)).length
    })

    const actionReminders = computed(() => buildActionRemindersV1({
        documents: documentsStore.documentsWithStatus,
        tasks: tasksStore.tasksWithStatus
    }))
    const actionReminderCount = computed(() => actionReminders.value.length)
    const totalNotificationCount = computed(() => actionReminderCount.value + unreadCount.value)

    async function fetchAnnouncements() {
        announcementsLoading.value = true
        announcementError.value = null
        try {
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            announcements.value = data || []
            return true
        } catch (e) {
            announcementError.value = e?.message || 'تعذر تحميل الإعلانات.'
            console.error('Error fetching announcements:', e)
            return false
        } finally {
            announcementsLoading.value = false
        }
    }

    async function fetchReadHistory() {
        readHistoryLoading.value = true
        readHistoryReady.value = false
        readHistoryError.value = null
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                readAnnouncements.value = []
                return false
            }

            const { data, error } = await supabase
                .from('announcement_reads')
                .select('announcement_id')
                .eq('user_id', user.id)

            if (error) throw error
            readAnnouncements.value = data || []
            readHistoryReady.value = true
            return true
        } catch (e) {
            readHistoryError.value = e?.message || 'تعذر تحميل حالة قراءة الإعلانات.'
            console.error('Error fetching read history:', e)
            return false
        } finally {
            readHistoryLoading.value = false
        }
    }

    async function markAllAsRead() {
        if (!readHistoryReady.value || markingAsRead.value) return
        markingAsRead.value = true
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const unread = announcements.value.filter(a =>
                !readAnnouncements.value.some(r => r.announcement_id === a.id)
            )

            if (unread.length === 0) return

            const newReads = unread.map(a => ({
                user_id: user.id,
                announcement_id: a.id
            }))

            const { error } = await supabase
                .from('announcement_reads')
                .insert(newReads)

            if (error) throw error

            // Update local state
            readAnnouncements.value = [...readAnnouncements.value, ...newReads]
        } catch (e) {
            readHistoryError.value = e?.message || 'تعذر حفظ حالة قراءة الإعلانات.'
            console.error('Error marking as read:', e)
        } finally {
            markingAsRead.value = false
        }
    }

    function subscribeToAnnouncements() {
        const channel = supabase
            .channel('announcements_changes')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'announcements' },
                (payload) => {
                    if (!announcements.value.some(item => item.id === payload.new?.id)) {
                        announcements.value = [payload.new, ...announcements.value]
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }

    return {
        announcements,
        readAnnouncements,
        loading,
        announcementsLoading,
        readHistoryLoading,
        readHistoryReady,
        announcementError,
        readHistoryError,
        unreadCount,
        actionReminders,
        actionReminderCount,
        totalNotificationCount,
        fetchAnnouncements,
        fetchReadHistory,
        markAllAsRead,
        subscribeToAnnouncements
    }
})
