import { afterEach, describe, expect, it, vi } from 'vitest';
import { delayedReschedule } from '../../../core/tasks/delayed-reschedule';
import { RecurringRunner, Task } from '../../../core/tasks/task';
import { mediaPlaylistReloadDelay } from '../../../media/hls/reload-policy';
import { MEDIA_PLAYLIST_METADATA_KEY, type ResolvedTrack } from '../../../media/types';

// Integration of the three pieces the engine composes for live reload:
// `RecurringRunner` (the loop) + `delayedReschedule` (start-anchored timer) +
// `mediaPlaylistReloadDelay` (the §6.3.4 cadence policy). The existing
// resolve-track "live reload" tests stub the reschedule, so they never assert
// the *interval*. These do — they pin the question that the manual live drive
// couldn't answer: does a real sliding window reload at the full target
// duration, and is the half-target the hard floor?

afterEach(() => {
  vi.useRealTimers();
});

const TARGET_DURATION = 2;

/** A live (unended → infinite-duration) resolved-track snapshot carrying only what the policy reads. */
function liveSnapshot(mediaSequence: number, segmentCount: number): ResolvedTrack {
  return {
    duration: Number.POSITIVE_INFINITY,
    segments: Array.from({ length: segmentCount }),
    metadata: {
      [MEDIA_PLAYLIST_METADATA_KEY]: {
        targetDuration: TARGET_DURATION,
        mediaSequence,
        endList: false,
      },
    },
  } as unknown as ResolvedTrack;
}

/**
 * Run the real reload loop under fake timers, recording the fake-clock time at
 * which each cycle's run begins. `nextSnapshot(cycle)` supplies the snapshot the
 * reload "fetched" on cycle N (0-based) — the lever for sliding vs. stale.
 */
async function recordReloadStarts(nextSnapshot: (cycle: number) => ResolvedTrack, runForMs: number): Promise<number[]> {
  vi.useFakeTimers();
  const starts: number[] = [];
  let cycle = 0;
  const runner = new RecurringRunner<ResolvedTrack>(delayedReschedule(mediaPlaylistReloadDelay));
  // One run fn, shared across the runner's internal clones (clone reuses it),
  // so `task.previous` threads the prior cycle's snapshot exactly as in prod.
  const task = new Task<ResolvedTrack>(
    async () => {
      starts.push(Date.now());
      return nextSnapshot(cycle++);
    },
    { id: 'reload' }
  );
  const done = runner.schedule(task);
  await vi.advanceTimersByTimeAsync(runForMs);
  runner.abortAll(); // settles quietly (own-cancellation isn't a failure)
  await done;
  return starts;
}

function intervals(starts: number[]): number[] {
  return starts.slice(1).map((t, i) => t - (starts[i] as number));
}

describe('live reload cadence (RecurringRunner + delayedReschedule + mediaPlaylistReloadDelay)', () => {
  it('reloads at the full target duration as the window slides (changed every cycle)', async () => {
    // mediaSequence advances each reload, segment count constant — a textbook
    // sliding live window. Every cycle's snapshot differs from the prior, so the
    // policy returns the full target duration each time.
    const starts = await recordReloadStarts((cycle) => liveSnapshot(30 + cycle, 5), TARGET_DURATION * 1000 * 4);

    expect(starts.length).toBeGreaterThanOrEqual(5);
    expect(intervals(starts)).toEqual(intervals(starts).map(() => TARGET_DURATION * 1000));
  });

  it('polls at half the target when the window is stale, never faster (the floor)', async () => {
    // The origin never advances the playlist — every reload sees the same
    // window. After the first (no `previous` → treated as changed), each cycle
    // is "unchanged" → half target. This is the fastest the loop can ever go.
    const starts = await recordReloadStarts(() => liveSnapshot(30, 5), TARGET_DURATION * 1000 * 4);

    const all = intervals(starts);
    expect(all.length).toBeGreaterThanOrEqual(4);
    // First gap follows the first run (previous undefined → full target).
    expect(all[0]).toBe(TARGET_DURATION * 1000);
    // Steady state on a stale window is exactly half target…
    expect(all.slice(1)).toEqual(all.slice(1).map(() => (TARGET_DURATION / 2) * 1000));
    // …and nothing is ever faster than the half-target floor.
    expect(Math.min(...all)).toBeGreaterThanOrEqual((TARGET_DURATION / 2) * 1000);
  });

  it('stops the recurrence once the playlist completes (finite duration → null)', async () => {
    vi.useFakeTimers();
    const starts: number[] = [];
    const runner = new RecurringRunner<ResolvedTrack>(delayedReschedule(mediaPlaylistReloadDelay));
    const complete = {
      duration: 30,
      segments: Array.from({ length: 5 }),
      metadata: {
        [MEDIA_PLAYLIST_METADATA_KEY]: { targetDuration: TARGET_DURATION, mediaSequence: 30, endList: true },
      },
    } as unknown as ResolvedTrack;
    const done = runner.schedule(
      new Task<ResolvedTrack>(
        async () => {
          starts.push(Date.now());
          return complete;
        },
        { id: 'reload' }
      )
    );
    await vi.advanceTimersByTimeAsync(TARGET_DURATION * 1000 * 4);
    await done; // resolves on its own (no abort needed) — the recurrence stopped
    expect(starts).toHaveLength(1); // ran exactly once
  });
});
