import { describe, expect, it } from 'vitest'
import {
    DASHBOARD_ACTIONS_VISIBLE_LIMIT_V1,
    DASHBOARD_QUICK_ACTIONS_V1,
    buildDashboardActionsV1,
    getDashboardActionCenterStateV1,
    getDashboardCostSummaryV1,
    getDashboardDocumentsSummaryV1,
    getDashboardNextMaintenanceV1,
    getDashboardOdometerSummaryV1,
    getDashboardPrimaryStateV1,
    getDashboardSourceStateV1,
    getKnownRecordCostV1,
    getVisibleDashboardActionsV1
} from '../../src/lib/dashboard-actions-v1'

const task = (id, status, statusInfo = {}) => ({
    id,
    name: `مهمة ${id}`,
    statusInfo: { status, progress: 0, kmRemaining: null, isSnoozed: false, ...statusInfo }
})

const document = (id, status, daysLeft = null) => ({
    id,
    typeLabel: `وثيقة ${id}`,
    statusInfo: { status, daysLeft }
})

describe('V1 dashboard action derivation', () => {
    it('puts late maintenance above every other action', () => {
        const actions = buildDashboardActionsV1({
            tasks: [task('late', 'late', { progress: 120 }), task('due', 'due')],
            documents: [document('expired', 'expired', -2)]
        })

        expect(actions[0]).toMatchObject({ id: 'maintenance:late:action', sortPriority: 0 })
    })

    it('orders an expired document before due maintenance deterministically', () => {
        const first = buildDashboardActionsV1({
            tasks: [task('due', 'due')], documents: [document('expired', 'expired', -4)]
        })
        const second = buildDashboardActionsV1({
            tasks: [task('due', 'due')], documents: [document('expired', 'expired', -4)]
        })

        expect(first.map(action => action.id)).toEqual([
            'document:expired:expiry', 'maintenance:due:action'
        ])
        expect(second.map(action => action.id)).toEqual(first.map(action => action.id))
    })

    it('sorts due tasks by known remaining distance before missing distance', () => {
        const actions = buildDashboardActionsV1({ tasks: [
            task('unknown-distance', 'due', { progress: null, kmRemaining: null }),
            task('known-distance', 'due', { progress: null, kmRemaining: 420 })
        ] })

        expect(actions.map(action => action.sourceId)).toEqual(['known-distance', 'unknown-distance'])
    })

    it('creates a setup action for tasks that need a baseline', () => {
        expect(buildDashboardActionsV1({ tasks: [task('oil', 'needs_setup')] })[0]).toMatchObject({
            source: 'maintenance', actionLabel: 'إعداد الآن', actionRoute: { name: 'tasks', query: { filter: 'needs_setup' } }
        })
    })

    it('creates an action for a document with no expiry date', () => {
        expect(buildDashboardActionsV1({ documents: [document('insurance', 'needs_expiry')] })[0]).toMatchObject({
            source: 'document', actionLabel: 'إعداد الآن', sortPriority: 5
        })
    })

    it('deduplicates repeated source documents by stable source id', () => {
        const actions = buildDashboardActionsV1({
            documents: [document('insurance', 'expired', -3), document('insurance', 'expired', -3)]
        })

        expect(actions).toHaveLength(1)
        expect(actions[0].id).toBe('document:insurance:expiry')
    })

    it('limits the default visible list to three items and can reveal all', () => {
        const actions = buildDashboardActionsV1({
            tasks: [task('a', 'late'), task('b', 'late'), task('c', 'late'), task('d', 'late')]
        })

        expect(DASHBOARD_ACTIONS_VISIBLE_LIMIT_V1).toBe(3)
        expect(getVisibleDashboardActionsV1(actions)).toHaveLength(3)
        expect(getVisibleDashboardActionsV1(actions, true)).toHaveLength(4)
    })

    it('uses a safe no-action state instead of claiming the car is fully healthy', () => {
        expect(getDashboardActionCenterStateV1({ actions: [] })).toBe('empty')
    })

    it('does not invent a next due date when every task needs setup', () => {
        expect(getDashboardNextMaintenanceV1({ tasks: [task('a', 'needs_setup'), task('b', 'needs_setup')] }))
            .toEqual({ state: 'needs_setup', task: null, expectedDate: null })
    })

    it('uses an existing task forecast only when its source is present and valid', () => {
        const expectedDate = '2026-10-15T00:00:00.000Z'
        const result = getDashboardNextMaintenanceV1({
            tasks: [task('oil', 'soon', { estimatedDate: expectedDate, estimatedDateSource: 'distance' })]
        })

        expect(result).toMatchObject({ state: 'ready', expectedDate })
    })

    it('does not present a predicted date when the forecast is insufficient', () => {
        const result = getDashboardNextMaintenanceV1({
            tasks: [task('oil', 'good', { estimatedDate: null, estimatedDateSource: null })]
        })

        expect(result).toMatchObject({ state: 'ready', expectedDate: null })
    })

    it('keeps maintenance actions available when the documents source fails', () => {
        const actions = buildDashboardActionsV1({
            tasks: [task('oil', 'late')],
            documentsState: 'unavailable'
        })

        expect(actions.map(action => action.source)).toEqual(['maintenance'])
    })

    it('keeps document actions available when the maintenance source fails', () => {
        const actions = buildDashboardActionsV1({
            maintenanceState: 'unavailable',
            documents: [document('insurance', 'expired', -1)]
        })

        expect(actions.map(action => action.source)).toEqual(['document'])
    })

    it('does not turn a source failure into a no-action empty state', () => {
        expect(getDashboardSourceStateV1({ error: new Error('offline') })).toBe('unavailable')
        expect(getDashboardActionCenterStateV1({ actions: [], documentsState: 'unavailable' })).toBe('partial-empty')
    })

    it('shows the known current-year cost without coercing it to zero', () => {
        expect(getDashboardCostSummaryV1({
            insights: { knownCostRecords: 2, thisYearKnownCostRecords: 1, thisYearCost: 740 }
        })).toMatchObject({ state: 'available', yearTotal: 740 })
    })

    it('uses an explicit no-known-cost message instead of a fake zero', () => {
        expect(getDashboardCostSummaryV1({
            insights: { knownCostRecords: 0, thisYearKnownCostRecords: 0, thisYearCost: 0 }
        })).toMatchObject({ state: 'available', yearTotal: null, message: 'لم تُسجّل تكاليف صيانة بعد.' })
    })

    it('keeps the latest record cost unknown when no amount was entered', () => {
        expect(getKnownRecordCostV1({ cost: null })).toBeNull()
        expect(getKnownRecordCostV1({ cost: 0 })).toBe(0)
    })

    it('asks for more odometer readings without exposing technical confidence labels', () => {
        expect(getDashboardOdometerSummaryV1({ confidence: 'insufficient', averageDailyKm: null })).toEqual({
            state: 'needs_readings', message: 'أضف قراءات أخرى لتحسين توقعات الصيانة.'
        })
    })

    it('does not repeatedly nudge for an odometer reading until the latest reading is stale', () => {
        const now = new Date('2026-09-27T12:00:00.000Z')
        const odometerInsights = { confidence: 'insufficient', averageDailyKm: null }
        const recentActions = buildDashboardActionsV1({
            odometerInsights,
            latestOdometerDate: new Date('2026-08-29T12:00:00.000Z'),
            now
        })
        const staleActions = buildDashboardActionsV1({
            odometerInsights,
            latestOdometerDate: new Date('2026-08-28T12:00:00.000Z'),
            now
        })

        expect(recentActions).toEqual([])
        expect(staleActions).toMatchObject([{ id: 'odometer:stale-reading', source: 'odometer', actionKind: 'odometer' }])
        expect(staleActions[0].sortPriority).toBe(6)
    })

    it('preserves the existing no-car onboarding state', () => {
        expect(getDashboardPrimaryStateV1({ hasCar: false })).toBe('onboarding')
        expect(getDashboardPrimaryStateV1({ hasCar: false, error: new Error('failed') })).toBe('unavailable')
    })

    it('defines only the three actionable quick actions with valid route names', () => {
        expect(DASHBOARD_QUICK_ACTIONS_V1).toHaveLength(3)
        expect(DASHBOARD_QUICK_ACTIONS_V1.map(action => action.id)).toEqual(['odometer', 'maintenance', 'document'])
        expect(DASHBOARD_QUICK_ACTIONS_V1.filter(action => action.route).map(action => action.route.name))
            .toEqual(['tasks', 'documents'])
    })

    it('summarizes document attention by count without repeating the full alert list', () => {
        expect(getDashboardDocumentsSummaryV1({
            documents: [document('a', 'expired'), document('b', 'valid')]
        })).toMatchObject({ state: 'attention', attentionCount: 1 })
    })
})
