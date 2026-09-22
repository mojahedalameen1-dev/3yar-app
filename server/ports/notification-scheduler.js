/** Adapter contract for running time-based notification transitions. */
export class NotificationScheduler {
  async runDueTransitions() {
    throw new Error('NotificationScheduler.runDueTransitions must be implemented by an adapter')
  }
}
