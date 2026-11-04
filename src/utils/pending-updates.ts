/**
 * Settings changes waiting to be saved (typing in a text field saves once the typing stops).
 *
 * Every change waits in the queue; after `delayMs` without a new one they all run in order,
 * so each field ends with its last value. Before, one shared timer kept only the newest
 * change: editing two fields within half a second lost the first one, and closing the
 * "Options" window right after typing threw the change away. `flush()` runs them at once.
 *
 * No Obsidian or DOM: the timer functions can be swapped in tests.
 */

export interface TimerApi {
    set(callback: () => void, ms: number): number;
    clear(handle: number): void;
}

const windowTimers: TimerApi = {
    set: (callback, ms) => window.setTimeout(callback, ms),
    clear: (handle) => window.clearTimeout(handle),
};

export class PendingUpdates {
    private queue: Array<() => unknown> = [];
    private handle: number | null = null;
    private running: Promise<void> = Promise.resolve();

    constructor(
        private delayMs: number,
        private onDone: () => void = () => {},
        private timers: TimerApi = windowTimers,
    ) {}

    get pending(): number {
        return this.queue.length;
    }

    /** Queues a change; the queue runs `delayMs` after the last call. */
    add(callback: () => unknown): void {
        this.queue.push(callback);
        if (this.handle !== null) this.timers.clear(this.handle);
        this.handle = this.timers.set(() => {
            this.handle = null;
            void this.flush();
        }, this.delayMs);
    }

    /** Runs every waiting change now, one after another (each may save). */
    flush(): Promise<void> {
        if (this.handle !== null) {
            this.timers.clear(this.handle);
            this.handle = null;
        }
        const batch = this.queue;
        this.queue = [];
        if (batch.length === 0) return this.running;
        this.running = this.running.then(async () => {
            for (const callback of batch) {
                try {
                    await callback();
                } catch (e) {
                    console.error("[Settings] could not apply a change", e);
                }
            }
            this.onDone();
        });
        return this.running;
    }
}
