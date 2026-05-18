/**
 * Subscribes to DOM updates that can change inherited `lang`: any `lang` attribute edit,
 * or subtree structural changes under `<html>` (which can move nodes between labeled ancestors).
 */
export function subscribeAmbientLang(onStoreChange: () => void): () => void {
  if (typeof document === 'undefined') {
    return () => {};
  }
  let disconnected = false;
  let queued = false;
  const flush = (): void => {
    queued = false;
    if (disconnected) {
      return;
    }
    onStoreChange();
  };
  const schedule = (): void => {
    if (!queued) {
      queued = true;
      queueMicrotask(flush);
    }
  };
  const root = document.documentElement;
  const observer = new MutationObserver(schedule);
  observer.observe(root, {
    subtree: true,
    attributes: true,
    attributeFilter: ['lang'],
    childList: true,
  });
  return () => {
    disconnected = true;
    observer.disconnect();
    queued = false;
  };
}
