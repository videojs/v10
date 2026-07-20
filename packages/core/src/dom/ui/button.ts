import type { UIEvent, UIKeyboardEvent } from './event';

export interface ButtonOptions {
  onActivate: (event: UIEvent) => void;
  isDisabled: () => boolean;
}

export interface ButtonProps {
  role: 'button';
  tabIndex: 0;
  onClick: (event: UIEvent) => void;
  onPointerDown: (event: UIEvent) => void;
  onMouseDown: (event: UIEvent) => void;
  onKeyDown: (event: UIKeyboardEvent) => void;
  onKeyUp: (event: UIKeyboardEvent) => void;
}

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
      onActivate(event);
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
        onActivate(event);
      } else if (event.key === ' ') {
        event.preventDefault();
      }
    },

    onKeyUp(event) {
      if (event.target !== event.currentTarget) return;
      if (isDisabled()) return;

      if (event.key === ' ') {
        onActivate(event);
      }
    },
  };
}
