import { isMacOS } from '@videojs/utils/dom';

import { HotkeyCoordinator } from './coordinator';

export type ModifierKey = 'shift' | 'ctrl' | 'alt' | 'meta';

export interface ParsedKeyBinding {
  modifiers: Set<ModifierKey>;
  /** Lowercased key for matching. */
  key: string;
  /** Original casing preserved for ARIA formatting. */
  originalKey: string;
}

export interface HotkeyOptions {
  keys: string;
  onActivate: (event: KeyboardEvent, key: string) => void;
  /** Where to listen — `'player'` (container) or `'document'`. */
  target?: 'player' | 'document';
  /** Whether `event.repeat` should fire the callback. */
  allowRepeat?: boolean;
  disabled?: boolean;
  /** Action name for the ARIA registry. */
  action?: string;
}

const MODIFIER_KEYS = new Set(['shift', 'ctrl', 'alt', 'meta']);

/**
 * Parse a key pattern string into one or more bindings.
 *
 * @example
 * ```ts
 * parseKeyPattern('Shift+>');
 * // [{ modifiers: Set('shift'), key: '>', originalKey: '>' }]
 *
 * parseKeyPattern('0-9');
 * // 10 bindings, one per digit
 * ```
 */
export function parseKeyPattern(pattern: string): ParsedKeyBinding[] {
  // Range expansion: "0-9" → individual digit bindings.
  if (pattern === '0-9') {
    return Array.from({ length: 10 }, (_, i) => ({
      modifiers: new Set<ModifierKey>(),
      key: String(i),
      originalKey: String(i),
    }));
  }

  const segments = pattern.split('+');
  const rawKey = segments.pop()!;
  const modifiers = new Set<ModifierKey>();

  for (const seg of segments) {
    const lower = seg.toLowerCase();

    if (lower === 'mod') {
      modifiers.add(isMacOS() ? 'meta' : 'ctrl');
    } else if (MODIFIER_KEYS.has(lower)) {
      modifiers.add(lower as ModifierKey);
    } else if (__DEV__) {
      console.warn(`[vjs-hotkey] Unknown modifier: "${seg}" in pattern "${pattern}"`);
    }
  }

  // "Space" is the readable name but KeyboardEvent.key is " ".
  const key = rawKey === 'Space' ? ' ' : rawKey.toLowerCase();

  return [{ modifiers, key, originalKey: rawKey }];
}

/** Whether a parsed binding matches a keyboard event. */
export function matchesEvent(binding: ParsedKeyBinding, event: KeyboardEvent): boolean {
  // IME composition filtering.
  if (event.key === 'Unidentified') return false;

  // Case-insensitive key comparison.
  if (event.key.toLowerCase() !== binding.key) return false;

  // Exact modifier matching — all four must agree.
  if (event.shiftKey !== binding.modifiers.has('shift')) return false;
  if (event.ctrlKey !== binding.modifiers.has('ctrl')) return false;
  if (event.altKey !== binding.modifiers.has('alt')) return false;
  if (event.metaKey !== binding.modifiers.has('meta')) return false;

  return true;
}

// --- Coordinator management ---

const coordinators = new WeakMap<HTMLElement, HotkeyCoordinator>();

function getCoordinator(target: HTMLElement): HotkeyCoordinator {
  let coordinator = coordinators.get(target);
  if (!coordinator) {
    coordinator = new HotkeyCoordinator(target);
    coordinators.set(target, coordinator);
  }
  return coordinator;
}

/**
 * Register a hotkey binding on a target element.
 *
 * @example
 * ```ts
 * const cleanup = createHotkey(container, {
 *   keys: 'k',
 *   onActivate: () => store.paused ? store.play() : store.pause(),
 * });
 *
 * // Later: remove the binding
 * cleanup();
 * ```
 *
 * @returns A cleanup function that removes the binding.
 */
export function createHotkey(target: HTMLElement, options: HotkeyOptions): () => void {
  const coordinator = getCoordinator(target);
  return coordinator.add(options);
}
