/**
 * HTML element fixture for single-part component.
 *
 * Exercises: static tagName extraction for platforms.html.
 */

export class ToggleButtonElement extends EventTarget {
  static readonly tagName = 'media-toggle-button';

  /** @fires pressed-change - Emitted when the pressed state changes. */
  announcePressed(pressed: boolean) {
    this.dispatchEvent(new CustomEvent('pressed-change', { detail: { pressed }, bubbles: true }));
  }

  announceFocus() {
    this.dispatchEvent(new Event('focus-change'));
  }
}
