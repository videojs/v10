import type { UIFocusEvent, UIKeyboardEvent } from '@videojs/core/dom';

export function toUIKeyboardEvent(event: React.KeyboardEvent<HTMLElement>): UIKeyboardEvent {
  return {
    get defaultPrevented() {
      return event.defaultPrevented;
    },
    key: event.key,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    metaKey: event.metaKey,
    target: event.target instanceof Node ? event.target : event.currentTarget,
    currentTarget: event.currentTarget,
    preventDefault: () => event.preventDefault(),
    stopPropagation: () => event.stopPropagation(),
  };
}

export function toUIFocusEvent(event: React.FocusEvent<HTMLElement>): UIFocusEvent {
  return {
    get defaultPrevented() {
      return event.defaultPrevented;
    },
    relatedTarget: event.relatedTarget,
    preventDefault: () => event.preventDefault(),
    stopPropagation: () => event.stopPropagation(),
  };
}
