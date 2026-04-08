import { isEditableTarget, listen, resolveEventTarget } from '@videojs/utils/dom';

import { toAriaKeyShortcut } from './aria';
import type { HotkeyOptions, ParsedHotkeyBinding } from './hotkey';
import { matchesHotkeyEvent, parseHotkeyPattern } from './hotkey';

const ACTIVATION_KEYS = new Set([' ', 'Enter']);

/** Whether the event is an activation key on an interactive element (button, slider). */
function isInteractiveActivation(event: KeyboardEvent): boolean {
  if (!ACTIVATION_KEYS.has(event.key)) return false;

  const target = resolveEventTarget(event);
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLButtonElement) return true;

  const role = target.getAttribute('role');
  return role === 'button' || role === 'slider';
}

interface HotkeyBinding {
  parsed: ParsedHotkeyBinding[];
  options: HotkeyOptions;
  /** Registration order for DOM-order tie-breaking. */
  id: number;
}

interface ActiveHold {
  key: string;
  cleanup: () => void;
  repeated: boolean;
}

export class HotkeyCoordinator {
  #target: HTMLElement;
  #bindings: HotkeyBinding[] = [];
  #nextId = 0;
  #disconnect: AbortController | null = null;
  #docDisconnect: AbortController | null = null;
  /** Action name → bound keys. Controls query this to set `aria-keyshortcuts`. */
  #ariaRegistry = new Map<string, ParsedHotkeyBinding[]>();
  #activeHold: ActiveHold | null = null;
  #destroyed = false;

  constructor(target: HTMLElement) {
    this.#target = target;
  }

  add(options: HotkeyOptions): () => void {
    const parsed = parseHotkeyPattern(options.keys);
    const binding: HotkeyBinding = { parsed, options, id: this.#nextId++ };

    this.#bindings.push(binding);
    this.#sortBindings();

    if (options.action) {
      this.#addToAriaRegistry(options.action, parsed);
    }

    // Lazily connect listeners.
    if (options.target === 'document') {
      this.#connectDocument();
    } else {
      this.#connect();
    }

    let removed = false;
    return () => {
      if (removed) return;
      removed = true;

      const idx = this.#bindings.indexOf(binding);
      if (idx !== -1) this.#bindings.splice(idx, 1);

      if (options.action) {
        this.#removeFromAriaRegistry(options.action, parsed);
      }

      this.#maybeDisconnect();
    };
  }

  getAriaKeys(action: string): string | undefined {
    const bindings = this.#ariaRegistry.get(action);
    if (!bindings?.length) return undefined;
    return toAriaKeyShortcut(bindings);
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#activeHold?.cleanup();
    this.#activeHold = null;
    this.#disconnect?.abort();
    this.#disconnect = null;
    this.#docDisconnect?.abort();
    this.#docDisconnect = null;
    this.#bindings = [];
    this.#ariaRegistry.clear();
  }

  // --- Private ---

  #sortBindings(): void {
    this.#bindings.sort((a, b) => {
      // Higher specificity (more modifiers) first.
      const specDiff = b.parsed[0]!.modifiers.size - a.parsed[0]!.modifiers.size;
      if (specDiff !== 0) return specDiff;
      // Repeatable before non-repeatable (hold bindings take priority).
      const aRepeatable = a.options.repeatable !== false ? 1 : 0;
      const bRepeatable = b.options.repeatable !== false ? 1 : 0;
      if (bRepeatable !== aRepeatable) return bRepeatable - aRepeatable;
      // Then registration order.
      return a.id - b.id;
    });
  }

  #connect(): void {
    if (this.#disconnect) return;
    this.#disconnect = new AbortController();
    const signal = this.#disconnect.signal;
    listen(this.#target, 'keydown', this.#handleKeyDown, { signal });
    listen(this.#target, 'keyup', this.#handleKeyUp, { signal });
  }

  #connectDocument(): void {
    if (this.#docDisconnect) return;
    this.#docDisconnect = new AbortController();
    const signal = this.#docDisconnect.signal;
    listen(document, 'keydown', this.#handleKeyDown, { signal });
    listen(document, 'keyup', this.#handleKeyUp, { signal });
  }

  #maybeDisconnect(): void {
    const hasPlayer = this.#bindings.some((b) => b.options.target !== 'document');
    const hasDoc = this.#bindings.some((b) => b.options.target === 'document');

    if (!hasPlayer) {
      this.#disconnect?.abort();
      this.#disconnect = null;
    }

    if (!hasDoc) {
      this.#docDisconnect?.abort();
      this.#docDisconnect = null;
    }
  }

  #handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Unidentified') return;
    if (isInteractiveActivation(event)) return;

    // If a hold is active and this is a repeat of the same key, just prevent default.
    if (this.#activeHold && event.repeat && event.key.toLowerCase() === this.#activeHold.key) {
      this.#activeHold.repeated = true;
      event.preventDefault();
      return;
    }

    const editable = isEditableTarget(event);

    for (const binding of this.#bindings) {
      const { options, parsed } = binding;

      if (options.disabled) continue;
      if (event.repeat && options.repeatable === false) continue;

      const isDocBinding = options.target === 'document';
      const isDocEvent = event.currentTarget === document;
      if (isDocBinding !== isDocEvent) continue;

      for (const p of parsed) {
        if (!matchesHotkeyEvent(p, event)) continue;
        if (editable && p.modifiers.size === 0) continue;

        event.preventDefault();
        const cleanup = options.onActivate(event, p.originalKey);

        // If onActivate returned a cleanup, this is a hold action.
        if (typeof cleanup === 'function') {
          this.#activeHold = { key: p.key, cleanup, repeated: false };
        }

        return;
      }
    }
  };

  #handleKeyUp = (event: KeyboardEvent): void => {
    const hold = this.#activeHold;
    if (!hold || event.key.toLowerCase() !== hold.key) return;

    hold.cleanup();

    // Tap (no repeat) → dispatch deferred non-repeatable bindings.
    if (!hold.repeated) {
      this.#dispatchDeferred(event);
    }

    this.#activeHold = null;
  };

  /** Dispatch the first matching non-repeatable binding (e.g. togglePaused on tap). */
  #dispatchDeferred(event: KeyboardEvent): void {
    const editable = isEditableTarget(event);

    for (const binding of this.#bindings) {
      const { options, parsed } = binding;
      if (options.disabled || options.repeatable !== false) continue;

      const isDocBinding = options.target === 'document';
      const isDocEvent = event.currentTarget === document;
      if (isDocBinding !== isDocEvent) continue;

      for (const p of parsed) {
        if (!matchesHotkeyEvent(p, event)) continue;
        if (editable && p.modifiers.size === 0) continue;
        options.onActivate(event, p.originalKey);
        return;
      }
    }
  }

  #addToAriaRegistry(action: string, bindings: ParsedHotkeyBinding[]): void {
    let existing = this.#ariaRegistry.get(action);
    if (!existing) {
      existing = [];
      this.#ariaRegistry.set(action, existing);
    }
    existing.push(...bindings);
  }

  #removeFromAriaRegistry(action: string, bindings: ParsedHotkeyBinding[]): void {
    const existing = this.#ariaRegistry.get(action);
    if (!existing) return;

    const filtered = existing.filter((b) => !bindings.includes(b));

    if (filtered.length === 0) {
      this.#ariaRegistry.delete(action);
    } else {
      this.#ariaRegistry.set(action, filtered);
    }
  }
}
