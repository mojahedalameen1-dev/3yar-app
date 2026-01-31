import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import dayjs from 'dayjs'

const DOCUMENT_TYPES = {
    LICENSE: 'license',
    REGISTRATION: 'registration',
    FAHAS: 'fahas',
    INSURANCE: 'insurance',
    CUSTOM: 'custom'
}

const DOCUMENT_LABELS = {
    [DOCUMENT_TYPES.LICENSE]: 'رخصة القيادة',
    [DOCUMENT_TYPES.REGISTRATION]: 'استمارة السيارة',
    [DOCUMENT_TYPES.FAHAS]: 'الفحص الدوري',
    [DOCUMENT_TYPES.INSURANCE]: 'التأمين',
    [DOCUMENT_TYPES.CUSTOM]: 'وثيقة مخصصة'
}

const DOCUMENT_ICONS = {
    [DOCUMENT_TYPES.LICENSE]: 'mdi-card-account-details',
    [DOCUMENT_TYPES.REGISTRATION]: 'mdi-file-document',
    [DOCUMENT_TYPES.FAHAS]: 'mdi-car-wrench',
    [DOCUMENT_TYPES.INSURANCE]: 'mdi-shield-car',
    [DOCUMENT_TYPES.CUSTOM]: 'mdi-file-edit'
}

const DOCUMENT_COLORS = {
    [DOCUMENT_TYPES.LICENSE]: 'primary',
    [DOCUMENT_TYPES.REGISTRATION]: 'info',
    [DOCUMENT_TYPES.FAHAS]: 'purple',
    [DOCUMENT_TYPES.INSURANCE]: 'success',
    [DOCUMENT_TYPES.CUSTOM]: 'grey-darken-1'
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
            typeLabel: doc.type === DOCUMENT_TYPES.CUSTOM ? (doc.title || 'وثيقة مخصصة') : (DOCUMENT_LABELS[doc.type] || doc.type),
            typeIcon: DOCUMENT_ICONS[doc.type] || 'mdi-file',
            typeColor: DOCUMENT_COLORS[doc.type] || 'grey'
        }))
    })

    const alertDocuments = computed(() => {
        return documentsWithStatus.value.filter(
            doc => doc.statusInfo.status !== STATUS.VALID
        ).sort((a, b) => (a.statusInfo.daysLeft || 0) - (b.statusInfo.daysLeft || 0))
    })

    // Smart Regulatory Logic
    const regulatoryStatus = computed(() => {
        const istimara = documentsWithStatus.value.find(d => d.type === DOCUMENT_TYPES.REGISTRATION)
        const fahas = documentsWithStatus.value.find(d => d.type === DOCUMENT_TYPES.FAHAS)

        // Default safe state
        const result = {
            isTechnicalViolation: false,
            isRenewalBlocked: false,
            hasAlert: false,
            message: '',
            color: 'success',
            icon: 'mdi-check-circle'
        }

        if (!istimara) return result // Need Istimara to make judgements

        const istimaraExpired = istimara.statusInfo.status === STATUS.EXPIRED || istimara.statusInfo.status === STATUS.EXPIRING_SOON
        const fahasExpired = !fahas || fahas.statusInfo.status === STATUS.EXPIRED

        // Case 2: Istimara Expired/Expiring AND Fahas Expired/Missing -> CRITICAL
        if (istimaraExpired && fahasExpired) {
            return {
                isTechnicalViolation: false,
                isRenewalBlocked: true,
                hasAlert: true,
                message: 'يجب إجراء الفحص الدوري أولاً لتجديد الاستمارة!',
                description: 'لا يمكنك تجديد الاستمارة المنتهية حالياً إلا بعد صدور نتيجة فحص دوري سارية المفعول.',
                color: 'error',
                icon: 'mdi-alert-octagon'
            }
        }

        // Case 1: Istimara Valid AND Fahas Expired/Missing -> WARNING
        if (!istimaraExpired && fahasExpired) {
            return {
                isTechnicalViolation: true,
                isRenewalBlocked: false,
                hasAlert: true,
                message: 'تنبيه: الفحص الدوري منتهٍ - مخالفة فنية',
                description: 'المركبة تُعد مخالفة فنياً وقد تسجل ضدك مخالفة مرورية، كما لن تتمكن من تجديد الاستمارة لاحقاً.',
                color: 'warning',
                icon: 'mdi-alert'
            }
        }

        return result
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
            title: row.title, // New field
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
            title: doc.title || DOCUMENT_LABELS[doc.type] || '', // Save default title if not custom
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
            if (updates.title !== undefined) dbUpdates.title = updates.title
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
        regulatoryStatus,
        addDocument,
        updateDocument,
        deleteDocument,
        clearAllDocuments
    }
})
