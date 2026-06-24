import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';

export type LogKind = 'event' | 'action' | 'getter';

export interface LogEntry {
  id: number;
  time: string;
  label: string;
  kind: LogKind;
}

export interface MediaLog {
  entries: LogEntry[];
  log: (kind: LogKind, label: string) => void;
  clear: () => void;
}

const MediaLogContext = createContext<MediaLog | null>(null);

export function useMediaLog(): MediaLog {
  const ctx = useContext(MediaLogContext);
  if (!ctx) throw new Error('useMediaLog must be used within a MediaLogProvider');
  return ctx;
}

export function MediaLogProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const nextId = useRef(0);

  const log = useCallback((kind: LogKind, label: string) => {
    const time = new Date().toLocaleTimeString(undefined, { hour12: false });
    setEntries((prev) => {
      const next = [...prev, { id: nextId.current++, time, label, kind }];
      // Keep the log bounded so long sessions don't grow unbounded.
      return next.length > 100 ? next.slice(-100) : next;
    });
  }, []);

  const clear = useCallback(() => setEntries([]), []);

  const value = useMemo<MediaLog>(() => ({ entries, log, clear }), [entries, log, clear]);

  return <MediaLogContext.Provider value={value}>{children}</MediaLogContext.Provider>;
}

export function entryColorClass(kind: LogKind): string {
  if (kind === 'action') return 'text-orange';
  if (kind === 'getter') return 'text-magenta';
  return 'text-bright-yellow';
}
