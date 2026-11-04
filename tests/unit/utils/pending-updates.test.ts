import { PendingUpdates, TimerApi } from "src/utils/pending-updates";

/** Manual timers: `fire()` runs the scheduled callback. */
function fakeTimers() {
    let next = 1;
    const scheduled = new Map<number, () => void>();
    const api: TimerApi = {
        set: (callback) => {
            const id = next++;
            scheduled.set(id, callback);
            return id;
        },
        clear: (id) => {
            scheduled.delete(id);
        },
    };
    return {
        api,
        get count() {
            return scheduled.size;
        },
        fire() {
            const all = [...scheduled.values()];
            scheduled.clear();
            all.forEach((f) => f());
        },
    };
}

describe("PendingUpdates", () => {
    test("several changes: all run, in order, after the delay", async () => {
        const timers = fakeTimers();
        const log: string[] = [];
        const done = jest.fn();
        const q = new PendingUpdates(500, done, timers.api);
        q.add(() => log.push("field A"));
        q.add(() => log.push("field B = 1"));
        q.add(() => log.push("field B = 12"));
        expect(log).toEqual([]);
        expect(timers.count).toBe(1);
        timers.fire();
        await q.flush();
        expect(log).toEqual(["field A", "field B = 1", "field B = 12"]);
        expect(done).toHaveBeenCalledTimes(1);
        expect(q.pending).toBe(0);
    });

    test("flush runs the waiting changes at once (window closed right after typing)", async () => {
        const timers = fakeTimers();
        const log: string[] = [];
        const q = new PendingUpdates(500, () => {}, timers.api);
        q.add(async () => {
            await Promise.resolve();
            log.push("saved");
        });
        await q.flush();
        expect(log).toEqual(["saved"]);
        expect(timers.count).toBe(0);
    });

    test("an error in one change does not stop the others", async () => {
        const timers = fakeTimers();
        const log: string[] = [];
        const spy = jest.spyOn(console, "error").mockImplementation(() => {});
        const q = new PendingUpdates(500, () => {}, timers.api);
        q.add(() => {
            throw new Error("boom");
        });
        q.add(() => log.push("second"));
        await q.flush();
        expect(log).toEqual(["second"]);
        spy.mockRestore();
    });

    test("flush with nothing waiting does nothing", async () => {
        const done = jest.fn();
        const q = new PendingUpdates(500, done, fakeTimers().api);
        await q.flush();
        expect(done).not.toHaveBeenCalled();
    });

    test("batches run one after another", async () => {
        const timers = fakeTimers();
        const log: string[] = [];
        const q = new PendingUpdates(500, () => {}, timers.api);
        const gate: { release?: () => void } = {};
        q.add(
            () =>
                new Promise<void>((resolve) => {
                    gate.release = () => {
                        log.push("first");
                        resolve();
                    };
                }),
        );
        const first = q.flush();
        q.add(() => log.push("second"));
        const second = q.flush();
        while (!gate.release) await Promise.resolve();
        expect(log).toEqual([]);
        gate.release();
        await first;
        await second;
        expect(log).toEqual(["first", "second"]);
    });
});
