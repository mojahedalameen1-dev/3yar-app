import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import dayjs from 'dayjs'

const DOCUMENT_TYPES = {
    LICENSE: 'license',
    REGISTRATION: 'registration',
    INSURANCE: 'insurance'
}

const DOCUMENT_LABELS = {
    [DOCUMENT_TYPES.LICENSE]: 'رخصة القيادة',
    [DOCUMENT_TYPES.REGISTRATION]: 'استمارة السيارة',
    [DOCUMENT_TYPES.INSURANCE]: 'التأمين'
}

const DOCUMENT_ICONS = {
    [DOCUMENT_TYPES.LICENSE]: 'mdi-card-account-details',
    [DOCUMENT_TYPES.REGISTRATION]: 'mdi-file-document',
    [DOCUMENT_TYPES.INSURANCE]: 'mdi-shield-car'
}

const DOCUMENT_COLORS = {
    [DOCUMENT_TYPES.LICENSE]: 'primary',
    [DOCUMENT_TYPES.REGISTRATION]: 'info',
    [DOCUMENT_TYPES.INSURANCE]: 'success'
}

const STATUS = {
    EXPIRED: 'expired',
    EXPIRING_SOON: 'expiring_soon',
    VALID: 'valid'
}

const STATUS_LABELS = {
    [STATUS.EXPIRED]: 'منتهية',
    [STATUS.EXPIRING_SOON]: 'قاربت على الانتهاء',
    [STATUS.VALID]: 'سارية'
}

export const useDocumentsStore = defineStore('documents', () => {
    const documents = ref([])
    const loading = ref(false)
    const error = ref(null)

    // Reset store state
    function $reset() {
        documents.value = []
        loading.value = false
        error.value = null
    }

    // Get current user ID from session
    async function getUserId() {
        const { data: { session } } = await supabase.auth.getSession()
        return session?.user?.id || null
    }

    function getDocumentStatus(expiryDate) {
        if (!expiryDate) return { status: STATUS.VALID, daysLeft: null }

        const today = dayjs()
        const expiry = dayjs(expiryDate)
        const daysLeft = expiry.diff(today, 'day')

        if (daysLeft < 0) {
            return { status: STATUS.EXPIRED, daysLeft }
        } else if (daysLeft <= 30) {
            return { status: STATUS.EXPIRING_SOON, daysLeft }
        } else {
            return { status: STATUS.VALID, daysLeft }
        }
    }

    const documentsWithStatus = computed(() => {
        return documents.value.map(doc => ({
            ...doc,
            statusInfo: getDocumentStatus(doc.expiryDate),
            typeLabel: DOCUMENT_LABELS[doc.type] || doc.type,
            typeIcon: DOCUMENT_ICONS[doc.type] || 'mdi-file',
            typeColor: DOCUMENT_COLORS[doc.type] || 'grey'
        }))
    })

    const alertDocuments = computed(() => {
        return documentsWithStatus.value.filter(
            doc => doc.statusInfo.status !== STATUS.VALID
        ).sort((a, b) => (a.statusInfo.daysLeft || 0) - (b.statusInfo.daysLeft || 0))
    })

    const stats = computed(() => {
        const all = documentsWithStatus.value
        return {
            total: all.length,
            valid: all.filter(d => d.statusInfo.status === STATUS.VALID).length,
            expiringSoon: all.filter(d => d.statusInfo.status === STATUS.EXPIRING_SOON).length,
            expired: all.filter(d => d.statusInfo.status === STATUS.EXPIRED).length
        }
    })

    function mapFromDb(row) {
        return {
            id: row.id,
            type: row.type,
            documentNumber: row.document_number,
            issueDate: row.issue_date,
            expiryDate: row.expiry_date,
            image: row.image,
            notes: row.notes,
            reminderDays: row.reminder_days,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }
    }

    function mapToDb(doc) {
        return {
            type: doc.type,
            document_number: doc.documentNumber || '',
            issue_date: doc.issueDate || null,
            expiry_date: doc.expiryDate || null,
            image: doc.image || null,
            notes: doc.notes || '',
            reminder_days: doc.reminderDays || 30
        }
    }

    async function fetchDocuments() {
        loading.value = true
        error.value = null
        try {
            const userId = await getUserId()
            if (!userId) {
                documents.value = []
                return
            }

            const { data, error: err } = await supabase
                .from('documents')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: true })

            if (err) throw err

            documents.value = data ? data.map(mapFromDb) : []
        } catch (err) {
            error.value = err.message
            console.error('Error fetching documents:', err)
        } finally {
            loading.value = false
        }
    }

    function getDocumentByType(type) {
        return documentsWithStatus.value.find(d => d.type === type)
    }

    async function addDocument(docData) {
        try {
            // Remove existing document of same type
            const existing = documents.value.find(d => d.type === docData.type)
            if (existing) {
                await deleteDocument(existing.id)
            }

            const { data, error: err } = await supabase
                .from('documents')
                .insert([mapToDb(docData)])
                .select()
                .maybeSingle()

            if (err) throw err

            const newDoc = mapFromDb(data)
            documents.value.push(newDoc)
            return newDoc
        } catch (err) {
            error.value = err.message
            console.error('Error adding document:', err)
            throw err
        }
    }

    async function updateDocument(id, updates) {
        try {
            const dbUpdates = {}
            if (updates.type !== undefined) dbUpdates.type = updates.type
            if (updates.documentNumber !== undefined) dbUpdates.document_number = updates.documentNumber
            if (updates.issueDate !== undefined) dbUpdates.issue_date = updates.issueDate
            if (updates.expiryDate !== undefined) dbUpdates.expiry_date = updates.expiryDate
            if (updates.image !== undefined) dbUpdates.image = updates.image
            if (updates.notes !== undefined) dbUpdates.notes = updates.notes
            if (updates.reminderDays !== undefined) dbUpdates.reminder_days = updates.reminderDays

            const { data, error: err } = await supabase
                .from('documents')
                .update(dbUpdates)
                .eq('id', id)
                .select()
                .maybeSingle()

            if (err) throw err

            const index = documents.value.findIndex(d => d.id === id)
            if (index !== -1) {
                documents.value[index] = mapFromDb(data)
            }
        } catch (err) {
            error.value = err.message
            console.error('Error updating document:', err)
            throw err
        }
    }

    async function deleteDocument(id) {
        try {
            const { error: err } = await supabase
                .from('documents')
                .delete()
                .eq('id', id)

            if (err) throw err
            documents.value = documents.value.filter(d => d.id !== id)
        } catch (err) {
            error.value = err.message
            console.error('Error deleting document:', err)
            throw err
        }
    }

    async function clearAllDocuments() {
        try {
            const { error: err } = await supabase
                .from('documents')
                .delete()
                .neq('id', 0)

            if (err) throw err
            documents.value = []
        } catch (err) {
            error.value = err.message
            console.error('Error clearing documents:', err)
            throw err
        }
    }

    return {
        documents,
        loading,
        error,
        $reset,
        documentsWithStatus,
        alertDocuments,
        stats,
        DOCUMENT_TYPES,
        DOCUMENT_LABELS,
        DOCUMENT_ICONS,
        DOCUMENT_COLORS,
        STATUS,
        STATUS_LABELS,
        fetchDocuments,
        getDocumentByType,
        getDocumentStatus,
        addDocument,
        updateDocument,
        deleteDocument,
        clearAllDocuments
    }
})
