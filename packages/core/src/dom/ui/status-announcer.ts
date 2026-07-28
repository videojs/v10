import type { StatusAnnouncerCore } from '../../core/ui/input-feedback/status-announcer-core';
import { getMediaSnapshot, type MediaSnapshotStore } from './input-action';

export interface StatusAnnouncerStore extends MediaSnapshotStore {
  readonly target: unknown | null;
  subscribe(callback: () => void): () => void;
}

export function subscribeToStatusAnnouncer(store: StatusAnnouncerStore, core: StatusAnnouncerCore): () => void {
  let active = true;
  let pending = false;
  let target = store.target;
  let revision = 0;

  const baseline = () => {
    pending = true;
    const current = ++revision;

    queueMicrotask(() => {
      if (!active || current !== revision) return;

      pending = false;
      target = store.target;
      core.resetSnapshot();
      if (target) core.processSnapshot(getMediaSnapshot(store));
    });
  };

  const unsubscribe = store.subscribe(() => {
    const nextTarget = store.target;

    if (nextTarget !== target) {
      target = nextTarget;
      core.resetSnapshot();
      baseline();
      return;
    }

    if (!nextTarget || pending) return;
    core.processSnapshot(getMediaSnapshot(store));
  });

  core.resetSnapshot();
  baseline();

  return () => {
    active = false;
    unsubscribe();
  };
}
