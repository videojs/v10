import type { HotkeysCore } from '../../core/ui/hotkeys/hotkeys-core';

export interface BindHotKeysOptions {
  container: HTMLElement;
  core: HotkeysCore;
}

/** Binds keyboard shortcuts to the media container. */
export function bindHotKeys({ container, core }: BindHotKeysOptions): () => void {
  const controller = new AbortController();

  function handleKeydown(this: HTMLElement, event: KeyboardEvent) {
    if (!shouldHandleKeyEvent(event)) return;

    const handled = core.handleKeydown(event.key);
    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function handleKeyup(this: HTMLElement, event: KeyboardEvent) {
    if (!shouldHandleKeyEvent(event)) return;

    const handled = core.handleKeyup(event.key);
    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  container.addEventListener('keydown', handleKeydown, { signal: controller.signal });
  container.addEventListener('keyup', handleKeyup, { signal: controller.signal });

  return () => {
    controller.abort();
  };
}

function shouldHandleKeyEvent(event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return false;
  }

  if (event.key === ' ') {
    // The space key should only be handled if the container is focused.
    // TODO: evaluate other scenarios where the space key should be handled,
    // the time slider might be a good candidate for this but brittle check.
    const isContainer = event.target === event.currentTarget;
    return isContainer;
  }

  return true;
}
