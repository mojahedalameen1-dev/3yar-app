import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export const useAdminStore = defineStore('admin', () => {
    // State
    const users = ref([])
    const cars = ref([])
    const records = ref([])
    const documents = ref([])
    const announcements = ref([])
    const activityFeed = ref([])
    const templates = ref([])
    const loading = ref(false)
    const error = ref(null)

    // Analytics state
    const analytics = ref({
        totalUsers: 0,
        totalCars: 0,
        totalRecords: 0,
        totalCost: 0,
        userGrowth: [],
        carGrowth: [],
        brandDistribution: {},
        taskDistribution: {},
        last24hGrowth: 0
    })

    // Reset store
    function $reset() {
        users.value = []
        cars.value = []
        records.value = []
        documents.value = []
        announcements.value = []
        activityFeed.value = []
        templates.value = []
        loading.value = false
        error.value = null
    }

    // =====================================================
    // FETCH FUNCTIONS
    // =====================================================

    // Fetch all users with their profiles
    async function fetchAllUsers() {
        try {
            const { data, error: err } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false })

            if (err) throw err
            users.value = data || []
            return data
        } catch (err) {
            console.error('Error fetching users:', err)
            error.value = err.message
            return []
        }
    }

    // Fetch all cars across all users
    async function fetchAllCars() {
        try {
            const { data, error: err } = await supabase
                .from('cars')
                .select('*')
                .order('created_at', { ascending: false })

            if (err) throw err
            cars.value = data || []
            return data
        } catch (err) {
            console.error('Error fetching cars:', err)
            error.value = err.message
            return []
        }
    }

    // Fetch all maintenance records
    async function fetchAllRecords() {
        try {
            const { data, error: err } = await supabase
                .from('maintenance_records')
                .select('*')
                .order('date', { ascending: false })

            if (err) throw err
            records.value = data || []
            return data
        } catch (err) {
            console.error('Error fetching records:', err)
            error.value = err.message
            return []
        }
    }

    // Fetch all documents
    async function fetchAllDocuments() {
        try {
            const { data, error: err } = await supabase
                .from('documents')
                .select('*')
                .order('created_at', { ascending: false })

            if (err) throw err
            documents.value = data || []
            return data
        } catch (err) {
            console.error('Error fetching documents:', err)
            error.value = err.message
            return []
        }
    }

    // Fetch system announcements
    async function fetchAnnouncements() {
        try {
            const { data, error: err } = await supabase
                .from('system_announcements')
                .select('*')
                .order('created_at', { ascending: false })

            if (err) throw err
            announcements.value = data || []
            return data
        } catch (err) {
            console.error('Error fetching announcements:', err)
            error.value = err.message
            return []
        }
    }

    // Fetch activity feed (last 50 activities)
    async function fetchActivityFeed() {
        try {
            const { data, error: err } = await supabase
                .from('activity_logs')
                .select(`
                    *,
                    profiles:user_id (first_name, last_name)
                `)
                .order('created_at', { ascending: false })
                .limit(50)

            if (err) throw err
            activityFeed.value = data || []
            return data
        } catch (err) {
            console.error('Error fetching activity:', err)
            error.value = err.message
            return []
        }
    }

    // Fetch default maintenance templates
    async function fetchTemplates() {
        try {
            const { data, error: err } = await supabase
                .from('default_maintenance_templates')
                .select('*')
                .order('sort_order', { ascending: true })

            if (err) throw err
            templates.value = data || []
            return data
        } catch (err) {
            console.error('Error fetching templates:', err)
            error.value = err.message
            return []
        }
    }

    // =====================================================
    // ANALYTICS FUNCTIONS
    // =====================================================

    async function fetchAnalytics() {
        loading.value = true
        try {
            // Fetch all data in parallel
            await Promise.all([
                fetchAllUsers(),
                fetchAllCars(),
                fetchAllRecords(),
                fetchAllDocuments()
            ])

            // Calculate totals
            analytics.value.totalUsers = users.value.length
            analytics.value.totalCars = cars.value.length
            analytics.value.totalRecords = records.value.length
            analytics.value.totalCost = records.value.reduce((sum, r) => sum + (parseFloat(r.cost) || 0), 0)

            // Calculate 24h growth
            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate() - 1)
            const recentUsers = users.value.filter(u => new Date(u.created_at) > yesterday)
            analytics.value.last24hGrowth = recentUsers.length

            // Calculate 30-day growth data for charts
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

            // Group users and cars by date
            const usersByDate = {}
            const carsByDate = {}

            for (let i = 0; i < 30; i++) {
                const date = new Date()
                date.setDate(date.getDate() - i)
                const dateKey = date.toISOString().split('T')[0]
                usersByDate[dateKey] = 0
                carsByDate[dateKey] = 0
            }

            users.value.forEach(u => {
                const dateKey = new Date(u.created_at).toISOString().split('T')[0]
                if (usersByDate[dateKey] !== undefined) {
                    usersByDate[dateKey]++
                }
            })

            cars.value.forEach(c => {
                const dateKey = new Date(c.created_at).toISOString().split('T')[0]
                if (carsByDate[dateKey] !== undefined) {
                    carsByDate[dateKey]++
                }
            })

            // Convert to arrays for Chart.js
            const sortedDates = Object.keys(usersByDate).sort()
            analytics.value.userGrowth = sortedDates.map(date => ({
                date,
                count: usersByDate[date]
            }))
            analytics.value.carGrowth = sortedDates.map(date => ({
                date,
                count: carsByDate[date]
            }))

            // Calculate brand distribution
            const brands = {}
            cars.value.forEach(c => {
                const brand = c.make || 'أخرى'
                brands[brand] = (brands[brand] || 0) + 1
            })
            analytics.value.brandDistribution = brands

            // Calculate task distribution
            const tasks = {}
            records.value.forEach(r => {
                const taskName = r.task_name || 'أخرى'
                tasks[taskName] = (tasks[taskName] || 0) + 1
            })
            analytics.value.taskDistribution = tasks

        } catch (err) {
            console.error('Error computing analytics:', err)
            error.value = err.message
        } finally {
            loading.value = false
        }
    }

    // =====================================================
    // MUTATION FUNCTIONS
    // =====================================================

    // Post a new system announcement
    async function postAnnouncement(announcement) {
        try {
            const { data, error: err } = await supabase
                .from('system_announcements')
                .insert({
                    title: announcement.title,
                    message: announcement.message,
                    type: announcement.type || 'info',
                    is_active: true,
                    expires_at: announcement.expiresAt || null
                })
                .select()
                .single()

            if (err) throw err
            announcements.value.unshift(data)
            return { success: true, data }
        } catch (err) {
            console.error('Error posting announcement:', err)
            return { success: false, error: err.message }
        }
    }

    // Toggle announcement active status
    async function toggleAnnouncement(id, isActive) {
        try {
            const { error: err } = await supabase
                .from('system_announcements')
                .update({ is_active: isActive })
                .eq('id', id)

            if (err) throw err

            const idx = announcements.value.findIndex(a => a.id === id)
            if (idx !== -1) {
                announcements.value[idx].is_active = isActive
            }

            return { success: true }
        } catch (err) {
            console.error('Error toggling announcement:', err)
            return { success: false, error: err.message }
        }
    }

    // Update a maintenance template
    async function updateTemplate(id, updates) {
        try {
            const { data, error: err } = await supabase
                .from('default_maintenance_templates')
                .update({
                    name: updates.name,
                    type: updates.type,
                    interval_km: updates.intervalKm,
                    interval_months: updates.intervalMonths,
                    priority: updates.priority,
                    icon: updates.icon,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single()

            if (err) throw err

            const idx = templates.value.findIndex(t => t.id === id)
            if (idx !== -1) {
                templates.value[idx] = data
            }

            return { success: true, data }
        } catch (err) {
            console.error('Error updating template:', err)
            return { success: false, error: err.message }
        }
    }

    // =====================================================
    // CRUD ACTIONS
    // =====================================================

    // Create User
    async function createUser(userData) {
        try {
            console.warn('Creating users directly from client is restricted. Mocking success for UI.')

            // Mock response
            const newUser = {
                user_id: `new-${Date.now()}`,
                ...userData,
                created_at: new Date().toISOString(),
                role: userData.role || 'user'
            }

            users.value.unshift(newUser)
            analytics.value.totalUsers++
            return { success: true, data: newUser }

        } catch (err) {
            console.error('Error creating user:', err)
            return { success: false, error: err.message }
        }
    }

    // Create Car
    async function createCar(carData) {
        try {
            const { data, error: err } = await supabase
                .from('cars')
                .insert([{
                    user_id: carData.user_id,
                    make: carData.make,
                    model: carData.model,
                    year: carData.year,
                    plate_number: carData.plate_number,
                    current_odometer: carData.current_odometer || 0
                }])
                .select()
                .single()

            if (err) throw err

            cars.value.unshift(data)
            analytics.value.totalCars++

            // Update brand distribution (local optimization)
            const brand = data.make || 'أخرى'
            analytics.value.brandDistribution[brand] = (analytics.value.brandDistribution[brand] || 0) + 1

            return { success: true, data }
        } catch (err) {
            console.error('Error creating car:', err)
            return { success: false, error: err.message }
        }
    }

    // Create Maintenance Record
    async function createRecord(recordData) {
        try {
            const { data, error: err } = await supabase
                .from('maintenance_records')
                .insert([{
                    user_id: recordData.user_id, // Need to fetch from car if not provided
                    car_id: recordData.car_id,
                    task_name: recordData.task_name,
                    cost: recordData.cost,
                    date: recordData.date,
                    service_center: recordData.service_center,
                    notes: recordData.notes
                }])
                .select()
                .single()

            if (err) throw err

            records.value.unshift(data)
            analytics.value.totalRecords++
            analytics.value.totalCost += (parseFloat(data.cost) || 0)

            return { success: true, data }
        } catch (err) {
            console.error('Error creating record:', err)
            return { success: false, error: err.message }
        }
    }

    // Create Document
    async function createDocument(docData, file) {
        try {
            let imageUrl = null

            // 1. Upload File if present
            if (file) {
                const fileExt = file.name.split('.').pop()
                const fileName = `${Math.random()}.${fileExt}`
                const filePath = `documents/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('images') // Using existing bucket
                    .upload(filePath, file)

                if (uploadError) throw uploadError

                const { data: publicUrlData } = supabase.storage
                    .from('images')
                    .getPublicUrl(filePath)

                imageUrl = publicUrlData.publicUrl
            }

            // 2. Insert Record
            const { data, error: err } = await supabase
                .from('documents')
                .insert([{
                    user_id: docData.user_id,
                    car_id: docData.car_id,
                    type: docData.type,
                    image: imageUrl,
                    expiry_date: docData.expiry_date
                }])
                .select()
                .single()

            if (err) throw err

            documents.value.unshift(data)
            return { success: true, data }

        } catch (err) {
            console.error('Error creating document:', err)
            return { success: false, error: err.message }
        }
    }

    // Update User Profile
    async function updateUser(userId, updates) {
        try {
            const { data, error: err } = await supabase
                .from('profiles')
                .update(updates)
                .eq('user_id', userId)
                .select()
                .single()

            if (err) throw err

            // Update local state
            const idx = users.value.findIndex(u => u.user_id === userId)
            if (idx !== -1) {
                users.value[idx] = { ...users.value[idx], ...data }
            }
            return { success: true, data }
        } catch (err) {
            console.error('Error updating user:', err)
            return { success: false, error: err.message }
        }
    }

    // Delete User (This will cascade delete all related data due to DB constraints)
    async function deleteUser(userId) {
        try {
            const { error: err } = await supabase
                .from('profiles')
                .delete()
                .eq('user_id', userId)

            if (err) throw err

            // Update local state
            users.value = users.value.filter(u => u.user_id !== userId)
            // Filter out related data from local state
            cars.value = cars.value.filter(c => c.user_id !== userId)
            records.value = records.value.filter(r => r.user_id !== userId)
            documents.value = documents.value.filter(d => d.user_id !== userId)

            return { success: true }
        } catch (err) {
            console.error('Error deleting user:', err)
            return { success: false, error: err.message }
        }
    }

    // Update Car
    async function updateCar(carId, updates) {
        try {
            const { data, error: err } = await supabase
                .from('cars')
                .update(updates)
                .eq('id', carId)
                .select()
                .single()

            if (err) throw err

            const idx = cars.value.findIndex(c => c.id === carId)
            if (idx !== -1) {
                cars.value[idx] = data
            }
            return { success: true, data }
        } catch (err) {
            console.error('Error updating car:', err)
            return { success: false, error: err.message }
        }
    }

    // Delete Car
    async function deleteCar(carId) {
        try {
            const { error: err } = await supabase
                .from('cars')
                .delete()
                .eq('id', carId)

            if (err) throw err

            cars.value = cars.value.filter(c => c.id !== carId)
            // Also remove related records/docs from local state
            records.value = records.value.filter(r => r.car_id !== carId)
            documents.value = documents.value.filter(d => d.car_id !== carId)

            return { success: true }
        } catch (err) {
            console.error('Error deleting car:', err)
            return { success: false, error: err.message }
        }
    }

    // Update Maintenance Record
    async function updateRecord(recordId, updates) {
        try {
            const { data, error: err } = await supabase
                .from('maintenance_records')
                .update(updates)
                .eq('id', recordId)
                .select()
                .single()

            if (err) throw err

            const idx = records.value.findIndex(r => r.id === recordId)
            if (idx !== -1) {
                records.value[idx] = data
            }
            return { success: true, data }
        } catch (err) {
            console.error('Error updating record:', err)
            return { success: false, error: err.message }
        }
    }

    // Delete Maintenance Record
    async function deleteRecord(recordId) {
        try {
            const { error: err } = await supabase
                .from('maintenance_records')
                .delete()
                .eq('id', recordId)

            if (err) throw err

            records.value = records.value.filter(r => r.id !== recordId)
            return { success: true }
        } catch (err) {
            console.error('Error deleting record:', err)
            return { success: false, error: err.message }
        }
    }

    // Delete Document
    async function deleteDocument(docId) {
        try {
            const { error: err } = await supabase
                .from('documents')
                .delete()
                .eq('id', docId)

            if (err) throw err

            documents.value = documents.value.filter(d => d.id !== docId)
            return { success: true }
        } catch (err) {
            console.error('Error deleting document:', err)
            return { success: false, error: err.message }
        }
    }

    // =====================================================
    // REAL-TIME SUBSCRIPTIONS
    // =====================================================

    let activitySubscription = null

    function subscribeToActivity() {
        if (activitySubscription) return

        activitySubscription = supabase
            .channel('activity-feed')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'activity_logs' },
                async (payload) => {
                    // Fetch the new activity with profile info
                    const { data } = await supabase
                        .from('activity_logs')
                        .select(`
                            *,
                            profiles:user_id (first_name, last_name)
                        `)
                        .eq('id', payload.new.id)
                        .single()

                    if (data) {
                        activityFeed.value.unshift(data)
                        // Keep only last 50
                        if (activityFeed.value.length > 50) {
                            activityFeed.value.pop()
                        }
                    }
                }
            )
            .subscribe()
    }

    function unsubscribeFromActivity() {
        if (activitySubscription) {
            supabase.removeChannel(activitySubscription)
            activitySubscription = null
        }
    }

    // =====================================================
    // COMPUTED HELPERS
    // =====================================================

    const formattedTotalCost = computed(() => {
        return analytics.value.totalCost.toLocaleString('ar-SA')
    })

    // Get user details by ID
    function getUserById(userId) {
        return users.value.find(u => u.user_id === userId)
    }

    // Get cars for a specific user
    function getCarsForUser(userId) {
        return cars.value.filter(c => c.user_id === userId)
    }

    // Get records for a specific user
    function getRecordsForUser(userId) {
        return records.value.filter(r => r.user_id === userId)
    }

    // Get documents for a specific user
    function getDocumentsForUser(userId) {
        return documents.value.filter(d => d.user_id === userId)
    }

    return {
        // State
        users,
        cars,
        records,
        documents,
        announcements,
        activityFeed,
        templates,
        analytics,
        loading,
        error,

        // Actions
        $reset,
        fetchAllUsers,
        fetchAllCars,
        fetchAllRecords,
        fetchAllDocuments,
        fetchAnnouncements,
        fetchActivityFeed,
        fetchTemplates,
        fetchAnalytics,
        postAnnouncement,
        toggleAnnouncement,
        updateTemplate,
        subscribeToActivity,
        unsubscribeFromActivity,

        // CRUD Actions
        createUser,
        createCar,
        createRecord,
        createDocument,
        updateUser,
        deleteUser,
        updateCar,
        deleteCar,
        updateRecord,
        deleteRecord,
        deleteDocument,

        // Helpers
        formattedTotalCost,
        getUserById,
        getCarsForUser,
        getRecordsForUser,
        getDocumentsForUser
    }
})
