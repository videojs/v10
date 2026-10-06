// HTML element fixture for single-part component.
//
// Exercises: static tagName extraction for platforms.html, and which core props the element exposes: `disabled` as a
// reactive property, `label` as a plain public field, and `onPressedChange` not at all.

export class ToggleButtonElement extends EventTarget {
  static readonly tagName = 'media-toggle-button';

  static readonly properties = {
    disabled: { type: Boolean },
  };

  label = '';

  /** @fires pressed-change - Emitted when the pressed state changes. */
  announcePressed(pressed: boolean) {
    this.dispatchEvent(new CustomEvent('pressed-change', { detail: { pressed }, bubbles: true }));
  }

  announceFocus() {
    this.dispatchEvent(new Event('focus-change'));
  }
}
