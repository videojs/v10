import type { UIKeyboardEvent } from './event';

/** Options for {@link createButton}. */
export interface ButtonOptions {
  /** Invoked when the button activates (click, Enter, or Space). */
  onActivate: () => void;
  /** Predicate returning whether the button is currently disabled. */
  isDisabled: () => boolean;
}

/** Event-handler bundle returned by {@link createButton}. */
export interface ButtonProps {
  /** ARIA role for the element. */
  role: 'button';
  /** Tab index to make the element focusable. */
  tabIndex: 0;
  /** Click handler that suppresses activation when disabled. */
  onClick: (event: UIEvent) => void;
  /** Pointer-down handler that prevents default when disabled. */
  onPointerDown: (event: UIEvent) => void;
  /** Mouse-down handler that prevents default when disabled. */
  onMouseDown: (event: UIEvent) => void;
  /** Key-down handler that mirrors native button activation semantics. */
  onKeyDown: (event: UIKeyboardEvent) => void;
  /** Key-up handler that activates on Space. */
  onKeyUp: (event: UIKeyboardEvent) => void;
}

/**
 * Build an accessible button event-handler bundle that mirrors native button semantics.
 *
 * @param options - Activation callback and disabled predicate.
 */
export function createButton(options: ButtonOptions): ButtonProps {
  const { onActivate, isDisabled } = options;

  return {
    role: 'button',
    tabIndex: 0,

    onClick(event) {
      if (isDisabled()) {
        event.preventDefault();
        return;
      }
      onActivate();
    },

    onPointerDown(event) {
      if (isDisabled()) event.preventDefault();
    },

    onMouseDown(event) {
      if (isDisabled()) event.preventDefault();
    },

    onKeyDown(event) {
      if (event.target !== event.currentTarget) return;

      if (isDisabled()) {
        if (event.key !== 'Tab') event.preventDefault();
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        onActivate();
      } else if (event.key === ' ') {
        event.preventDefault();
      }
    },

    onKeyUp(event) {
      if (event.target !== event.currentTarget) return;
      if (isDisabled()) return;

      if (event.key === ' ') {
        onActivate();
      }
    },
  };
}
