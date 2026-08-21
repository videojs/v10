import { describe, expect, it } from 'vitest';
import { effect } from '../effect';
import { computed, signal } from '../primitives';

// Drain microtasks so signal-driven re-runs land before assertions.
const flush = () => Promise.resolve().then(() => Promise.resolve());

describe('effect', () => {
  describe('self-write through an intermediate computed (lost-wakeup regression)', () => {
    // An effect that writes a signal one of its own dependency computeds
    // reads used to end its run *clean but stale*: the write marked the
    // intermediate dirty while the effect was the in-flight consumer, so no
    // watcher notification fired — and every later external change routed
    // through that intermediate was deduped against its standing dirty flag,
    // leaving the effect permanently deaf on that path. The
    // `revalidateSources` pass in `effect.ts` closes the hole; these tests
    // pin it for both places a run can happen. The concrete SPF shape: a
    // track-selection effect writing `selected*TrackId`, which the
    // candidate-set computed's `stickToSelectedCodecs` constraint reads.
    //
    // The guarantee is *liveness*, not immediacy: the effect is not re-run
    // just because it wrote into its own graph (deliberately — that would
    // double-run every writing effect); it catches up on the next genuine
    // change through the path, which is what used to be lost.
    it('recovers when the self-write happens during the initial run', async () => {
      const external = signal(1);
      const own = signal<string | undefined>(undefined);
      const inter = computed(() => `${external.get()}:${own.get() ?? 'none'}`);
      const runs: string[] = [];
      const stop = effect(() => {
        runs.push(inter.get());
        if (own.get() === undefined) own.set('locked');
      });
      await flush();
      external.set(2);
      await flush();
      // The change through the intermediate is heard — before the fix the
      // effect stayed on '1:none' forever.
      expect(runs.at(-1)).toBe('2:locked');
      stop();
    });

    it('recovers when the self-write happens during a flush run', async () => {
      const external = signal(1);
      const trigger = signal(0);
      const own = signal<string | undefined>(undefined);
      const inter = computed(() => `${external.get()}:${own.get() ?? 'none'}`);
      const runs: string[] = [];
      const stop = effect(() => {
        const shouldWrite = trigger.get() === 1;
        runs.push(inter.get());
        if (shouldWrite && own.get() === undefined) own.set('locked');
      });
      await flush();
      trigger.set(1); // this flush run performs the self-write
      await flush();
      external.set(2);
      await flush();
      expect(runs.at(-1)).toBe('2:locked');
      stop();
    });

    it('converges — a settled self-write causes no further re-runs', async () => {
      const own = signal<string | undefined>(undefined);
      const inter = computed(() => own.get() ?? 'none');
      let runCount = 0;
      const stop = effect(() => {
        inter.get();
        runCount++;
        if (own.get() === undefined) own.set('locked');
      });
      await flush();
      await flush();
      const settled = runCount;
      await flush();
      // No dirty dependency left behind → no phantom re-runs.
      expect(runCount).toBe(settled);
      stop();
    });
  });
});
