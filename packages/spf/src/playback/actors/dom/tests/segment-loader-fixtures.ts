import { vi } from 'vite-plus/test';

export function makeSourceBuffer(
  appendRanges: Array<[number, number]> = [],
  startingRanges: Array<[number, number]> = []
): SourceBuffer {
  const listeners: Record<string, EventListener[]> = {};
  let appendIndex = 0;
  let ranges: Array<[number, number]> = [...startingRanges];

  const clipRanges = (start: number, end: number) => {
    const next: Array<[number, number]> = [];

    for (const [s, e] of ranges) {
      if (e <= start || s >= end) {
        next.push([s, e]);
      } else {
        if (s < start) next.push([s, start]);

        if (e > end) next.push([end, e]);
      }
    }

    ranges = next;
  };

  return {
    get buffered() {
      return {
        get length() {
          return ranges.length;
        },
        start: (i: number) => ranges[i]![0],
        end: (i: number) => ranges[i]![1],
      } as TimeRanges;
    },
    updating: false,
    abort: vi.fn(),
    appendBuffer: vi.fn(() => {
      const range = appendRanges[appendIndex++];

      if (range) ranges.push(range);

      setTimeout(() => {
        for (const listener of listeners.updateend ?? []) {
          listener(new Event('updateend'));
        }
      }, 0);
    }),
    remove: vi.fn((start: number, end: number) => {
      clipRanges(start, end);
      setTimeout(() => {
        for (const listener of listeners.updateend ?? []) {
          listener(new Event('updateend'));
        }
      }, 0);
    }),
    addEventListener: vi.fn((type: string, listener: EventListener) => {
      listeners[type] ??= [];
      listeners[type].push(listener);
    }),
    removeEventListener: vi.fn((type: string, listener: EventListener) => {
      listeners[type] = (listeners[type] ?? []).filter((l) => l !== listener);
    }),
  } as unknown as SourceBuffer;
}

export function makeControllableFetch() {
  const resolvers = new Map<string, () => void>();
  const fetchedUrls: string[] = [];
  const signals = new Map<string, AbortSignal>();
  const fetch = vi.fn((request: Request) => {
    fetchedUrls.push(request.url);
    signals.set(request.url, request.signal);
    return new Promise<Response>((resolve, reject) => {
      request.signal.addEventListener('abort', () => reject(request.signal.reason), { once: true });
      resolvers.set(request.url, () => resolve(new Response(new ArrayBuffer(100))));
    });
  });

  return { fetch, fetchedUrls, signals, resolve: (url: string) => resolvers.get(url)?.() };
}
