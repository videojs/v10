const locks = new WeakMap<HTMLElement, number>();

/** Prevent container-level interactions while a scoped overlay owns the container. */
export function lockInteractions(element: HTMLElement): () => void {
  locks.set(element, (locks.get(element) ?? 0) + 1);

  let released = false;

  return () => {
    if (released) return;

    released = true;

    const count = locks.get(element) ?? 0;

    if (count <= 1) locks.delete(element);
    else locks.set(element, count - 1);
  };
}

/** Whether a scoped overlay currently prevents interactions on this container. */
export function isInteractionLocked(element: HTMLElement): boolean {
  return (locks.get(element) ?? 0) > 0;
}
