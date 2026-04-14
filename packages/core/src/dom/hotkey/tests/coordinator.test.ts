import { afterEach, describe, expect, it, vi } from 'vitest';

import { HotkeyCoordinator } from '../coordinator';

function keydown(target: EventTarget, key: string, mods?: Partial<KeyboardEventInit>): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...mods });
  target.dispatchEvent(event);
  return event;
}

describe('HotkeyCoordinator', () => {
  let container: HTMLElement;
  let coordinator: HotkeyCoordinator;

  afterEach(() => {
    coordinator?.destroy();
    container?.remove();
  });

  function setup() {
    container = document.createElement('div');
    document.body.appendChild(container);
    coordinator = new HotkeyCoordinator(container);
    return coordinator;
  }

  describe('add', () => {
    it('returns a cleanup function', () => {
      const c = setup();
      const remove = c.add({ keys: 'k', onActivate: vi.fn() });

      expect(typeof remove).toBe('function');

      remove();
    });

    it('fires onActivate for matching keydown', () => {
      const c = setup();
      const onActivate = vi.fn();
      c.add({ keys: 'k', onActivate });

      keydown(container, 'k');

      expect(onActivate).toHaveBeenCalledOnce();
    });

    it('calls preventDefault on match', () => {
      const c = setup();
      c.add({ keys: 'k', onActivate: vi.fn() });

      const event = keydown(container, 'k');

      expect(event.defaultPrevented).toBe(true);
    });

    it('does not fire for non-matching keys', () => {
      const c = setup();
      const onActivate = vi.fn();
      c.add({ keys: 'k', onActivate });

      keydown(container, 'j');

      expect(onActivate).not.toHaveBeenCalled();
    });

    it('removes binding on cleanup', () => {
      const c = setup();
      const onActivate = vi.fn();
      const remove = c.add({ keys: 'k', onActivate });

      remove();
      keydown(container, 'k');

      expect(onActivate).not.toHaveBeenCalled();
    });

    it('cleanup is idempotent', () => {
      const c = setup();
      const remove = c.add({ keys: 'k', onActivate: vi.fn() });

      remove();
      remove();
    });
  });

  describe('conflict resolution', () => {
    it('fires binding with more modifiers first (specificity)', () => {
      const c = setup();
      const first = vi.fn();
      const second = vi.fn();

      c.add({ keys: 'k', onActivate: second });
      c.add({ keys: 'Ctrl+k', onActivate: first });

      keydown(container, 'k', { ctrlKey: true });

      expect(first).toHaveBeenCalledOnce();
      expect(second).not.toHaveBeenCalled();
    });

    it('fires first-registered binding for equal specificity', () => {
      const c = setup();
      const first = vi.fn();
      const second = vi.fn();

      c.add({ keys: 'k', onActivate: first });
      c.add({ keys: 'k', onActivate: second });

      keydown(container, 'k');

      expect(first).toHaveBeenCalledOnce();
      expect(second).not.toHaveBeenCalled();
    });

    it('only fires one binding per event', () => {
      const c = setup();
      const first = vi.fn();
      const second = vi.fn();

      c.add({ keys: 'k', onActivate: first });
      c.add({ keys: 'k', onActivate: second });

      keydown(container, 'k');

      expect(first).toHaveBeenCalledOnce();
      expect(second).not.toHaveBeenCalled();
    });
  });

  describe('input safety', () => {
    it('suppresses single-key shortcuts in text inputs', () => {
      const c = setup();
      const onActivate = vi.fn();
      c.add({ keys: 'k', onActivate });

      const input = document.createElement('input');
      input.type = 'text';
      container.appendChild(input);

      keydown(input, 'k');

      expect(onActivate).not.toHaveBeenCalled();
    });

    it('allows modifier combos in text inputs', () => {
      const c = setup();
      const onActivate = vi.fn();
      c.add({ keys: 'Ctrl+k', onActivate });

      const input = document.createElement('input');
      input.type = 'text';
      container.appendChild(input);

      keydown(input, 'k', { ctrlKey: true });

      expect(onActivate).toHaveBeenCalledOnce();
    });
  });

  describe('interactive element priority', () => {
    it('skips Space on button elements', () => {
      const c = setup();
      const onActivate = vi.fn();
      c.add({ keys: 'Space', onActivate });

      const button = document.createElement('button');
      container.appendChild(button);

      keydown(button, ' ');

      expect(onActivate).not.toHaveBeenCalled();
    });

    it('skips Enter on role="button" elements', () => {
      const c = setup();
      const onActivate = vi.fn();
      c.add({ keys: 'Enter', onActivate });

      const div = document.createElement('div');
      div.setAttribute('role', 'button');
      container.appendChild(div);

      keydown(div, 'Enter');

      expect(onActivate).not.toHaveBeenCalled();
    });

    it('fires for non-activation keys on buttons', () => {
      const c = setup();
      const onActivate = vi.fn();
      c.add({ keys: 'k', onActivate });

      const button = document.createElement('button');
      container.appendChild(button);

      keydown(button, 'k');

      expect(onActivate).toHaveBeenCalledOnce();
    });
  });

  describe('repeat handling', () => {
    it('ignores repeat events when repeat is false', () => {
      const c = setup();
      const onActivate = vi.fn();
      c.add({ keys: 'k', onActivate, repeatable: false });

      keydown(container, 'k', { repeat: true });

      expect(onActivate).not.toHaveBeenCalled();
    });

    it('fires repeat events when repeatable is true', () => {
      const c = setup();
      const onActivate = vi.fn();
      c.add({ keys: 'k', onActivate, repeatable: true });

      keydown(container, 'k', { repeat: true });

      expect(onActivate).toHaveBeenCalledOnce();
    });

    it('allows repeat by default', () => {
      const c = setup();
      const onActivate = vi.fn();
      c.add({ keys: 'k', onActivate });

      keydown(container, 'k', { repeat: true });

      expect(onActivate).toHaveBeenCalledOnce();
    });
  });

  describe('disabled', () => {
    it('skips disabled bindings', () => {
      const c = setup();
      const onActivate = vi.fn();
      c.add({ keys: 'k', onActivate, disabled: true });

      keydown(container, 'k');

      expect(onActivate).not.toHaveBeenCalled();
    });
  });

  describe('lifecycle', () => {
    it('creates listener on first binding', () => {
      const c = setup();
      const onActivate = vi.fn();

      // Before any binding, keydown should do nothing.
      keydown(container, 'k');

      c.add({ keys: 'k', onActivate });
      keydown(container, 'k');

      expect(onActivate).toHaveBeenCalledOnce();
    });

    it('removes listener when last binding removed', () => {
      const c = setup();
      const onActivate = vi.fn();
      const remove = c.add({ keys: 'k', onActivate });

      remove();

      // Re-add to verify listener was removed (new listener needed).
      const onActivate2 = vi.fn();
      c.add({ keys: 'k', onActivate: onActivate2 });
      keydown(container, 'k');

      expect(onActivate).not.toHaveBeenCalled();
      expect(onActivate2).toHaveBeenCalledOnce();
    });

    it('destroy is idempotent', () => {
      const c = setup();
      c.destroy();
      c.destroy();
    });

    it('does not fire after destroy', () => {
      const c = setup();
      const onActivate = vi.fn();
      c.add({ keys: 'k', onActivate });

      c.destroy();
      keydown(container, 'k');

      expect(onActivate).not.toHaveBeenCalled();
    });
  });

  describe('document target', () => {
    it('listens on document for document-scoped bindings', () => {
      const c = setup();
      const onActivate = vi.fn();
      c.add({ keys: 'k', onActivate, target: 'document' });

      keydown(document, 'k');

      expect(onActivate).toHaveBeenCalledOnce();
    });

    it('cleans up document listener when last doc binding removed', () => {
      const c = setup();
      const onActivate = vi.fn();
      const remove = c.add({ keys: 'k', onActivate, target: 'document' });

      remove();
      keydown(document, 'k');

      expect(onActivate).not.toHaveBeenCalled();
    });

    it('fires document-scoped binding once when key originates in container', () => {
      const c = setup();
      const onActivate = vi.fn();
      c.add({ keys: 'k', onActivate, target: 'document' });

      // Key in container bubbles to document — doc listener fires once.
      keydown(container, 'k');

      expect(onActivate).toHaveBeenCalledOnce();
    });
  });

  describe('ARIA registry', () => {
    it('returns undefined for unregistered action', () => {
      const c = setup();
      expect(c.getAriaKeys('togglePaused')).toBeUndefined();
    });

    it('returns formatted key for registered action', () => {
      const c = setup();
      c.add({ keys: 'k', onActivate: vi.fn(), action: 'togglePaused' });

      expect(c.getAriaKeys('togglePaused')).toBe('k');
    });

    it('accumulates multiple bindings for same action', () => {
      const c = setup();
      c.add({ keys: 'k', onActivate: vi.fn(), action: 'togglePaused' });
      c.add({ keys: 'Space', onActivate: vi.fn(), action: 'togglePaused' });

      expect(c.getAriaKeys('togglePaused')).toBe('k Space');
    });

    it('removes from registry on cleanup', () => {
      const c = setup();
      const remove = c.add({ keys: 'k', onActivate: vi.fn(), action: 'togglePaused' });

      remove();

      expect(c.getAriaKeys('togglePaused')).toBeUndefined();
    });
  });
});
