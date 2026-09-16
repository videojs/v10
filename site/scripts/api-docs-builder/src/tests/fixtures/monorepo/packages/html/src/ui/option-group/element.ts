/**
 * HTML element fixture for the shared-source multi-part component.
 *
 * Exercises: the `Root` part falls back to the component's `element.ts` when no React part constructs the core.
 */

export class OptionGroupElement extends EventTarget {
  static readonly tagName = 'media-option-group';

  static readonly properties = {
    label: { type: String },
  };

  /** @fires value-change - Emitted when the selected option changes. */
  announceValue(value: string) {
    this.dispatchEvent(new CustomEvent('value-change', { detail: { value }, bubbles: true }));
  }
}
