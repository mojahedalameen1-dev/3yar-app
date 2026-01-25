import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import dayjs from 'dayjs'

const STORAGE_KEY = 'documents-store'

// Document types
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

// Status calculation
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

function loadFromStorage() {
    try {
        const data = localStorage.getItem(STORAGE_KEY)
        return data ? JSON.parse(data) : []
    } catch {
        return []
    }
}

export const useDocumentsStore = defineStore('documents', () => {
    const documents = ref(loadFromStorage())

    function saveToStorage() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(documents.value))
    }

    // Calculate document status
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

    // Documents with status
    const documentsWithStatus = computed(() => {
        return documents.value.map(doc => ({
            ...doc,
            statusInfo: getDocumentStatus(doc.expiryDate),
            typeLabel: DOCUMENT_LABELS[doc.type] || doc.type,
            typeIcon: DOCUMENT_ICONS[doc.type] || 'mdi-file',
            typeColor: DOCUMENT_COLORS[doc.type] || 'grey'
        }))
    })

    // Alerts (expired or expiring soon)
    const alertDocuments = computed(() => {
        return documentsWithStatus.value.filter(
            doc => doc.statusInfo.status !== STATUS.VALID
        ).sort((a, b) => (a.statusInfo.daysLeft || 0) - (b.statusInfo.daysLeft || 0))
    })

    // Stats
    const stats = computed(() => {
        const all = documentsWithStatus.value
        return {
            total: all.length,
            valid: all.filter(d => d.statusInfo.status === STATUS.VALID).length,
            expiringSoon: all.filter(d => d.statusInfo.status === STATUS.EXPIRING_SOON).length,
            expired: all.filter(d => d.statusInfo.status === STATUS.EXPIRED).length
        }
    })

    // Get document by type
    function getDocumentByType(type) {
        return documentsWithStatus.value.find(d => d.type === type)
    }

    // Add document
    function addDocument(docData) {
        // Remove existing document of same type
        documents.value = documents.value.filter(d => d.type !== docData.type)

        const newDoc = {
            id: Date.now(),
            type: docData.type,
            documentNumber: docData.documentNumber || '',
            issueDate: docData.issueDate || null,
            expiryDate: docData.expiryDate || null,
            image: docData.image || null,
            notes: docData.notes || '',
            reminderDays: docData.reminderDays || 30,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }

        documents.value.push(newDoc)
        saveToStorage()
        return newDoc
    }

    // Update document
    function updateDocument(id, updates) {
        const index = documents.value.findIndex(d => d.id === id)
        if (index !== -1) {
            documents.value[index] = {
                ...documents.value[index],
                ...updates,
                updatedAt: new Date().toISOString()
            }
            saveToStorage()
        }
    }

    // Delete document
    function deleteDocument(id) {
        documents.value = documents.value.filter(d => d.id !== id)
        saveToStorage()
    }

    // Clear all
    function clearAllDocuments() {
        documents.value = []
        saveToStorage()
    }

    return {
        documents,
        documentsWithStatus,
        alertDocuments,
        stats,
        DOCUMENT_TYPES,
        DOCUMENT_LABELS,
        DOCUMENT_ICONS,
        DOCUMENT_COLORS,
        STATUS,
        STATUS_LABELS,
        getDocumentByType,
        getDocumentStatus,
        addDocument,
        updateDocument,
        deleteDocument,
        clearAllDocuments
    }
})
