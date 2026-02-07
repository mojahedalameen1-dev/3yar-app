import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

export const useNotificationsStore = defineStore('notifications', () => {
    const announcements = ref([])
    const readAnnouncements = ref([])
    const loading = ref(false)

    const unreadCount = computed(() => {
        const readIds = new Set(readAnnouncements.value.map(r => r.announcement_id))
        return announcements.value.filter(a => !readIds.has(a.id)).length
    })

    async function fetchAnnouncements() {
        loading.value = true
        try {
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            announcements.value = data
        } catch (e) {
            console.error('Error fetching announcements:', e)
        } finally {
            loading.value = false
        }
    }

    async function fetchReadHistory() {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from('announcement_reads')
                .select('announcement_id')
                .eq('user_id', user.id)

            if (error) throw error
            readAnnouncements.value = data
        } catch (e) {
            console.error('Error fetching read history:', e)
        }
    }

    async function markAllAsRead() {
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
            console.error('Error marking as read:', e)
        }
    }

    function subscribeToAnnouncements() {
        const channel = supabase
            .channel('announcements_changes')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'announcements' },
                (payload) => {
                    announcements.value = [payload.new, ...announcements.value]
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
        unreadCount,
        fetchAnnouncements,
        fetchReadHistory,
        markAllAsRead,
        subscribeToAnnouncements
    }
})
