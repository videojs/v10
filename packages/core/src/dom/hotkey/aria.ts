import type { ModifierKey, ParsedKeyBinding } from './hotkey';

const ARIA_MODIFIER_MAP: Record<ModifierKey, string> = {
  shift: 'Shift',
  ctrl: 'Control',
  alt: 'Alt',
  meta: 'Meta',
};

const MODIFIER_ORDER: readonly ModifierKey[] = ['ctrl', 'shift', 'alt', 'meta'];

/**
 * Convert parsed key bindings to a WAI-ARIA `aria-keyshortcuts` formatted string.
 *
 * @example
 * ```ts
 * toAriaKeyShortcut(parseKeyPattern('Ctrl+Shift+f'));
 * // "Control+Shift+f"
 *
 * toAriaKeyShortcut([...parseKeyPattern('k'), ...parseKeyPattern('Space')]);
 * // "k Space"
 * ```
 */
export function toAriaKeyShortcut(bindings: ParsedKeyBinding[]): string {
  return bindings
    .map((b) => {
      const parts: string[] = [];

      for (const mod of MODIFIER_ORDER) {
        if (b.modifiers.has(mod)) {
          parts.push(ARIA_MODIFIER_MAP[mod]);
        }
      }

      parts.push(b.originalKey);
      return parts.join('+');
    })
    .join(' ');
}
