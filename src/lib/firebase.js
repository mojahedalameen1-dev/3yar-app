import { initializeApp } from 'firebase/app'
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    sendPasswordResetEmail,
    onAuthStateChanged
} from 'firebase/auth'
import {
    getFirestore,
    collection,
    doc,
    getDocs,
    setDoc,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    documentId,
    onSnapshot,
    writeBatch
} from 'firebase/firestore'

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
}

const missingConfig = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key)

if (missingConfig.length) {
    console.warn(`Firebase configuration is incomplete: ${missingConfig.join(', ')}`)
}

const app = initializeApp(firebaseConfig)
export const firebaseAuth = getAuth(app)
export const firestore = getFirestore(app, import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)')

const USER_OWNED_COLLECTIONS = new Set([
    'cars',
    'maintenance_tasks',
    'maintenance_records',
    'documents',
    'odometer_readings',
    'profiles',
    'announcement_reads'
])

function publicUser(user) {
    return user ? { ...user, id: user.uid, uid: user.uid, email: user.email } : null
}

function sessionFor(user) {
    return user ? { user: publicUser(user) } : null
}

async function waitForInitialAuth() {
    if (firebaseAuth.currentUser) return firebaseAuth.currentUser
    await firebaseAuth.authStateReady()
    return firebaseAuth.currentUser
}

function normalizeValue(value) {
    if (value && typeof value.toDate === 'function') return value.toDate().toISOString()
    return value
}

function rowFromSnapshot(snapshot) {
    const values = Object.fromEntries(
        Object.entries(snapshot.data()).map(([key, value]) => [key, normalizeValue(value)])
    )
    return { ...values, id: values.id ?? snapshot.id }
}

class FirestoreQueryBuilder {
    constructor(collectionName) {
        this.collectionName = collectionName
        this.operation = 'select'
        this.payload = null
        this.filters = []
        this.sort = null
        this.maxRows = null
        this.resultMode = 'many'
    }

    select() { return this }
    insert(payload) { this.operation = 'insert'; this.payload = payload; return this }
    update(payload) { this.operation = 'update'; this.payload = payload; return this }
    delete() { this.operation = 'delete'; return this }
    upsert(payload) { this.operation = 'upsert'; this.payload = payload; return this }
    eq(field, value) { this.filters.push({ field, operator: '==', value }); return this }
    neq(field, value) { this.filters.push({ field, operator: '!=', value }); return this }
    order(field, options = {}) { this.sort = { field, direction: options.ascending === false ? 'desc' : 'asc' }; return this }
    limit(count) { this.maxRows = count; return this }
    single() { this.resultMode = 'single'; return this }
    maybeSingle() { this.resultMode = 'maybeSingle'; return this }

    then(resolve, reject) {
        return this.execute().then(resolve, reject)
    }

    async buildQuery() {
        const constraints = this.filters.map(({ field, operator, value }) =>
            where(field === 'id' ? documentId() : field, operator, field === 'id' ? String(value) : value)
        )
        if (this.sort) constraints.push(orderBy(this.sort.field, this.sort.direction))
        if (this.maxRows) constraints.push(limit(this.maxRows))
        return query(collection(firestore, this.collectionName), ...constraints)
    }

    format(rows) {
        if (this.resultMode === 'many') return rows
        if (rows.length > 1) throw new Error('Expected one document, but multiple documents were returned')
        if (this.resultMode === 'single' && rows.length === 0) throw new Error('Document not found')
        return rows[0] ?? null
    }

    async prepareRow(input) {
        const now = new Date().toISOString()
        const row = { ...input }
        if (USER_OWNED_COLLECTIONS.has(this.collectionName) && !row.user_id) {
            const user = await waitForInitialAuth()
            if (!user) throw new Error('يجب تسجيل الدخول أولاً')
            row.user_id = user.uid
        }
        if (this.collectionName === 'profiles' && !row.role) row.role = 'user'
        if (['maintenance_tasks', 'maintenance_records', 'documents', 'odometer_readings'].includes(this.collectionName) && !row.car_id) {
            const ownerId = row.user_id || (await waitForInitialAuth())?.uid
            const cars = await getDocs(query(collection(firestore, 'cars'), where('user_id', '==', ownerId), limit(1)))
            if (!cars.empty) row.car_id = cars.docs[0].id
        }
        if (!row.created_at) row.created_at = now
        if (['cars', 'documents', 'profiles'].includes(this.collectionName)) row.updated_at = now
        return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined))
    }

    async findSnapshots() {
        const snapshot = await getDocs(await this.buildQuery())
        return snapshot.docs
    }

    async executeInsert() {
        const inputs = Array.isArray(this.payload) ? this.payload : [this.payload]
        const rows = []
        for (const input of inputs) {
            const row = await this.prepareRow(input)
            const ref = doc(collection(firestore, this.collectionName))
            const stored = { ...row, id: ref.id }
            await setDoc(ref, stored)
            rows.push(stored)
        }
        return this.format(rows)
    }

    async executeUpsert() {
        const row = await this.prepareRow(this.payload)
        const identity = row.user_id || row.id
        if (!identity) return this.executeInsert()
        const ref = doc(firestore, this.collectionName, String(identity))
        const stored = { ...row, id: ref.id, updated_at: new Date().toISOString() }
        await setDoc(ref, stored, { merge: true })
        return this.format([stored])
    }

    async executeUpdate() {
        const snapshots = await this.findSnapshots()
        const updated = []
        for (const snapshot of snapshots) {
            const changes = { ...this.payload, updated_at: new Date().toISOString() }
            await updateDoc(snapshot.ref, changes)
            updated.push({ ...rowFromSnapshot(snapshot), ...changes })
        }
        return this.format(updated)
    }

    async executeDelete() {
        const snapshots = await this.findSnapshots()
        const refs = snapshots.map(snapshot => snapshot.ref)
        for (let offset = 0; offset < refs.length; offset += 450) {
            const batch = writeBatch(firestore)
            refs.slice(offset, offset + 450).forEach(ref => batch.delete(ref))
            await batch.commit()
        }
        return null
    }

    async execute() {
        try {
            let data
            if (this.operation === 'insert') data = await this.executeInsert()
            else if (this.operation === 'upsert') data = await this.executeUpsert()
            else if (this.operation === 'update') data = await this.executeUpdate()
            else if (this.operation === 'delete') data = await this.executeDelete()
            else data = this.format((await this.findSnapshots()).map(rowFromSnapshot))
            return { data, error: null }
        } catch (error) {
            return { data: null, error }
        }
    }
}

function createRealtimeChannel() {
    let listener = null
    let config = null
    let callback = null
    return {
        on(_type, nextConfig, nextCallback) { config = nextConfig; callback = nextCallback; return this },
        subscribe() {
            let initialized = false
            listener = onSnapshot(collection(firestore, config.table), snapshot => {
                if (!initialized) { initialized = true; return }
                snapshot.docChanges().filter(change => change.type === 'added').forEach(change => {
                    callback({ new: rowFromSnapshot(change.doc) })
                })
            })
            return this
        },
        unsubscribe() { if (listener) listener() }
    }
}

export async function isFirebaseAdmin() {
    const user = await waitForInitialAuth()
    if (!user) return false
    const token = await user.getIdTokenResult(true)
    return token.claims.admin === true
}

export const backend = {
    auth: {
        async getSession() {
            const user = await waitForInitialAuth()
            return { data: { session: sessionFor(user) }, error: null }
        },
        async getUser() {
            const user = await waitForInitialAuth()
            return { data: { user: publicUser(user) }, error: null }
        },
        onAuthStateChange(callback) {
            let previousUid = firebaseAuth.currentUser?.uid
            const unsubscribe = onAuthStateChanged(firebaseAuth, user => {
                const event = user ? (previousUid ? 'TOKEN_REFRESHED' : 'SIGNED_IN') : 'SIGNED_OUT'
                previousUid = user?.uid
                callback(event, sessionFor(user))
            })
            return { data: { subscription: { unsubscribe } } }
        },
        async signUp({ email, password }) {
            try {
                const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password)
                return { data: { user: publicUser(credential.user), session: sessionFor(credential.user) }, error: null }
            } catch (error) { return { data: null, error } }
        },
        async signInWithPassword({ email, password }) {
            try {
                const credential = await signInWithEmailAndPassword(firebaseAuth, email, password)
                return { data: { user: publicUser(credential.user), session: sessionFor(credential.user) }, error: null }
            } catch (error) { return { data: null, error } }
        },
        async signInWithOAuth({ provider }) {
            try {
                if (provider !== 'google') throw new Error(`Unsupported provider: ${provider}`)
                const credential = await signInWithPopup(firebaseAuth, new GoogleAuthProvider())
                return { data: { user: publicUser(credential.user), session: sessionFor(credential.user) }, error: null }
            } catch (error) { return { data: null, error } }
        },
        async signOut() {
            try { await firebaseSignOut(firebaseAuth); return { error: null } }
            catch (error) { return { error } }
        },
        async resetPasswordForEmail(email) {
            try { await sendPasswordResetEmail(firebaseAuth, email); return { error: null } }
            catch (error) { return { error } }
        }
    },
    from(collectionName) { return new FirestoreQueryBuilder(collectionName) },
    channel() { return createRealtimeChannel() },
    removeChannel(channel) { channel?.unsubscribe() },
    storage: {
        from(bucket) {
            return {
                async upload(path, file) {
                    try {
                        const user = await waitForInitialAuth()
                        if (!user) throw new Error('يجب تسجيل الدخول أولاً')
                        const token = await user.getIdToken()
                        const response = await fetch(`/api/blob-upload?pathname=${encodeURIComponent(`${bucket}/${path}`)}`, {
                            method: 'POST',
                            headers: {
                                Authorization: `Bearer ${token}`,
                                'Content-Type': file.type || 'application/octet-stream'
                            },
                            body: file
                        })
                        const data = await response.json()
                        if (!response.ok) throw new Error(data.error || 'فشل رفع الملف')
                        return { data: { path: data.pathname, publicUrl: data.url }, error: null }
                    } catch (error) { return { data: null, error } }
                },
                async getPublicUrl(path) {
                    return { data: { publicUrl: path.startsWith('/api/blob?') ? path : `/api/blob?pathname=${encodeURIComponent(path)}` }, error: null }
                }
            }
        }
    },
    async rpc(name, args) {
        if (name === 'get_public_maintenance_tasks') {
            try {
                const cars = await getDocs(query(
                    collection(firestore, 'cars'),
                    where('share_token', '==', args.p_token),
                    where('public_share_enabled', '==', true),
                    limit(1)
                ))
                if (cars.empty) return { data: [], error: null }
                const carId = cars.docs[0].id
                const tasks = await getDocs(query(collection(firestore, 'maintenance_tasks'), where('car_id', '==', carId)))
                return { data: tasks.docs.map(rowFromSnapshot), error: null }
            } catch (error) { return { data: null, error } }
        }
        const functionNames = {
            create_user_profile_admin: 'createUserProfileAdmin',
            delete_user_by_admin: 'deleteUserByAdmin'
        }
        if (functionNames[name]) {
            try {
                const user = await waitForInitialAuth()
                if (!user) throw new Error('يجب تسجيل الدخول أولاً')
                const token = await user.getIdToken()
                const response = await fetch('/api/admin-rpc', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ operation: functionNames[name], args })
                })
                const data = await response.json()
                if (!response.ok) throw new Error(data.error || 'فشلت العملية الإدارية')
                return { data, error: null }
            } catch (error) { return { data: null, error } }
        }
        return { data: null, error: new Error(`Unsupported Firebase operation: ${name}`) }
    }
}

// Temporary alias keeps the existing stores stable while the backend is migrated.
export const supabase = backend
