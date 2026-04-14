import { afterEach, describe, expect, it, vi } from 'vitest';

import { createHotkey, matchesHotkeyEvent, parseHotkeyPattern } from '../hotkey';

describe('parseHotkeyPattern', () => {
  it('parses a single key with no modifiers', () => {
    const result = parseHotkeyPattern('k');

    expect(result).toHaveLength(1);
    expect(result[0]!.key).toBe('k');
    expect(result[0]!.originalKey).toBe('k');
    expect(result[0]!.modifiers.size).toBe(0);
  });

  it('parses Shift modifier', () => {
    const result = parseHotkeyPattern('Shift+ArrowLeft');

    expect(result).toHaveLength(1);
    expect(result[0]!.key).toBe('arrowleft');
    expect(result[0]!.modifiers.has('shift')).toBe(true);
    expect(result[0]!.modifiers.size).toBe(1);
  });

  it('parses Ctrl modifier', () => {
    const result = parseHotkeyPattern('Ctrl+k');

    expect(result).toHaveLength(1);
    expect(result[0]!.modifiers.has('ctrl')).toBe(true);
  });

  it('parses multiple modifiers', () => {
    const result = parseHotkeyPattern('Ctrl+Shift+f');

    expect(result).toHaveLength(1);
    expect(result[0]!.modifiers.has('ctrl')).toBe(true);
    expect(result[0]!.modifiers.has('shift')).toBe(true);
    expect(result[0]!.modifiers.size).toBe(2);
  });

  it('expands 0-9 into 10 bindings', () => {
    const result = parseHotkeyPattern('0-9');

    expect(result).toHaveLength(10);
    for (let i = 0; i < 10; i++) {
      expect(result[i]!.key).toBe(String(i));
      expect(result[i]!.modifiers.size).toBe(0);
    }
  });

  it('stores key lowercased for matching', () => {
    const result = parseHotkeyPattern('ArrowRight');

    expect(result[0]!.key).toBe('arrowright');
    expect(result[0]!.originalKey).toBe('ArrowRight');
  });

  it('parses Space to literal space character', () => {
    const result = parseHotkeyPattern('Space');

    expect(result[0]!.key).toBe(' ');
    expect(result[0]!.originalKey).toBe('Space');
  });

  it('warns on unknown modifier in __DEV__', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    parseHotkeyPattern('Foo+k');

    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]![0]).toContain('Unknown modifier');

    spy.mockRestore();
  });
});

describe('matchesHotkeyEvent', () => {
  function createEvent(key: string, mods?: Partial<KeyboardEventInit>): KeyboardEvent {
    return new KeyboardEvent('keydown', { key, bubbles: true, ...mods });
  }

  it('matches a simple key', () => {
    const binding = parseHotkeyPattern('k')[0]!;
    expect(matchesHotkeyEvent(binding, createEvent('k'))).toBe(true);
  });

  it('matches Space pattern against literal space event', () => {
    const binding = parseHotkeyPattern('Space')[0]!;
    expect(matchesHotkeyEvent(binding, createEvent(' '))).toBe(true);
  });

  it('matches case-insensitively', () => {
    const binding = parseHotkeyPattern('k')[0]!;
    expect(matchesHotkeyEvent(binding, createEvent('K'))).toBe(true);
  });

  it('rejects when extra modifiers are held', () => {
    const binding = parseHotkeyPattern('k')[0]!;
    expect(matchesHotkeyEvent(binding, createEvent('k', { ctrlKey: true }))).toBe(false);
  });

  it('requires exact modifier match', () => {
    const binding = parseHotkeyPattern('Ctrl+k')[0]!;

    // Ctrl held — match.
    expect(matchesHotkeyEvent(binding, createEvent('k', { ctrlKey: true }))).toBe(true);

    // Ctrl not held — no match.
    expect(matchesHotkeyEvent(binding, createEvent('k'))).toBe(false);

    // Ctrl + Shift held — no match (extra modifier).
    expect(matchesHotkeyEvent(binding, createEvent('k', { ctrlKey: true, shiftKey: true }))).toBe(false);
  });

  it('skips Unidentified key events (IME)', () => {
    const binding = parseHotkeyPattern('k')[0]!;
    expect(matchesHotkeyEvent(binding, createEvent('Unidentified'))).toBe(false);
  });

  it('rejects non-matching keys', () => {
    const binding = parseHotkeyPattern('k')[0]!;
    expect(matchesHotkeyEvent(binding, createEvent('j'))).toBe(false);
  });

  describe('implicit modifiers for non-letter characters', () => {
    it('matches > when Shift is held (US keyboard: Shift+. produces >)', () => {
      const binding = parseHotkeyPattern('>')[0]!;
      expect(matchesHotkeyEvent(binding, createEvent('>', { shiftKey: true }))).toBe(true);
    });

    it('matches < when Shift is held (US keyboard: Shift+, produces <)', () => {
      const binding = parseHotkeyPattern('<')[0]!;
      expect(matchesHotkeyEvent(binding, createEvent('<', { shiftKey: true }))).toBe(true);
    });

    it('matches > when Shift is NOT held (European keyboard: > is unshifted)', () => {
      const binding = parseHotkeyPattern('>')[0]!;
      expect(matchesHotkeyEvent(binding, createEvent('>'))).toBe(true);
    });

    it('matches ? when Shift is held', () => {
      const binding = parseHotkeyPattern('?')[0]!;
      expect(matchesHotkeyEvent(binding, createEvent('?', { shiftKey: true }))).toBe(true);
    });

    it('matches Ctrl+> with Ctrl and Shift held', () => {
      const binding = parseHotkeyPattern('Ctrl+>')[0]!;
      expect(matchesHotkeyEvent(binding, createEvent('>', { ctrlKey: true, shiftKey: true }))).toBe(true);
    });

    it('rejects Ctrl+> when only Shift is held (no Ctrl)', () => {
      const binding = parseHotkeyPattern('Ctrl+>')[0]!;
      expect(matchesHotkeyEvent(binding, createEvent('>', { shiftKey: true }))).toBe(false);
    });

    it('rejects letter k when Shift is held (Shift changes letter case)', () => {
      const binding = parseHotkeyPattern('k')[0]!;
      expect(matchesHotkeyEvent(binding, createEvent('K', { shiftKey: true }))).toBe(false);
    });

    it('requires exact Shift for named keys', () => {
      const binding = parseHotkeyPattern('Shift+ArrowLeft')[0]!;
      expect(matchesHotkeyEvent(binding, createEvent('ArrowLeft', { shiftKey: true }))).toBe(true);
      expect(matchesHotkeyEvent(binding, createEvent('ArrowLeft'))).toBe(false);
    });

    it('rejects ArrowLeft when Shift is held but binding has no Shift', () => {
      const binding = parseHotkeyPattern('ArrowLeft')[0]!;
      expect(matchesHotkeyEvent(binding, createEvent('ArrowLeft', { shiftKey: true }))).toBe(false);
    });

    it('Shift+> binding requires Shift held', () => {
      const binding = parseHotkeyPattern('Shift+>')[0]!;
      expect(matchesHotkeyEvent(binding, createEvent('>', { shiftKey: true }))).toBe(true);
      expect(matchesHotkeyEvent(binding, createEvent('>'))).toBe(false);
    });

    it('matches > when Alt is held (Mac Option key produces >)', () => {
      const binding = parseHotkeyPattern('>')[0]!;
      expect(matchesHotkeyEvent(binding, createEvent('>', { altKey: true }))).toBe(true);
    });

    it('matches > when Alt and Shift are held (Mac Option+Shift produces >)', () => {
      const binding = parseHotkeyPattern('>')[0]!;
      expect(matchesHotkeyEvent(binding, createEvent('>', { altKey: true, shiftKey: true }))).toBe(true);
    });

    it('matches < when Alt is held (Mac Option key produces <)', () => {
      const binding = parseHotkeyPattern('<')[0]!;
      expect(matchesHotkeyEvent(binding, createEvent('<', { altKey: true }))).toBe(true);
    });

    it('Alt+> binding requires Alt held', () => {
      const binding = parseHotkeyPattern('Alt+>')[0]!;
      expect(matchesHotkeyEvent(binding, createEvent('>', { altKey: true }))).toBe(true);
      expect(matchesHotkeyEvent(binding, createEvent('>'))).toBe(false);
    });

    it('rejects letter k when Alt is held (Alt is not implicit for letters)', () => {
      const binding = parseHotkeyPattern('k')[0]!;
      expect(matchesHotkeyEvent(binding, createEvent('k', { altKey: true }))).toBe(false);
    });

    it('rejects ArrowLeft when Alt is held but binding has no Alt', () => {
      const binding = parseHotkeyPattern('ArrowLeft')[0]!;
      expect(matchesHotkeyEvent(binding, createEvent('ArrowLeft', { altKey: true }))).toBe(false);
    });

    it('rejects > when Ctrl is held but binding has no Ctrl', () => {
      const binding = parseHotkeyPattern('>')[0]!;
      expect(matchesHotkeyEvent(binding, createEvent('>', { ctrlKey: true }))).toBe(false);
    });

    it('rejects > when Meta is held but binding has no Meta', () => {
      const binding = parseHotkeyPattern('>')[0]!;
      expect(matchesHotkeyEvent(binding, createEvent('>', { metaKey: true }))).toBe(false);
    });
  });
});

describe('createHotkey', () => {
  let container: HTMLElement;

  afterEach(() => {
    container?.remove();
  });

  function setup() {
    container = document.createElement('div');
    document.body.appendChild(container);
    return container;
  }

  it('returns a cleanup function', () => {
    const el = setup();
    const cleanup = createHotkey(el, { keys: 'k', onActivate: vi.fn() });

    expect(typeof cleanup).toBe('function');

    cleanup();
  });

  it('calls onActivate when matching key is pressed', () => {
    const el = setup();
    const onActivate = vi.fn();
    const cleanup = createHotkey(el, { keys: 'k', onActivate });

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', bubbles: true }));

    expect(onActivate).toHaveBeenCalledOnce();

    cleanup();
  });

  it('does not fire after cleanup', () => {
    const el = setup();
    const onActivate = vi.fn();
    const cleanup = createHotkey(el, { keys: 'k', onActivate });

    cleanup();

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', bubbles: true }));

    expect(onActivate).not.toHaveBeenCalled();
  });

  it('does not fire when disabled', () => {
    const el = setup();
    const onActivate = vi.fn();
    const cleanup = createHotkey(el, { keys: 'k', onActivate, disabled: true });

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', bubbles: true }));

    expect(onActivate).not.toHaveBeenCalled();

    cleanup();
  });

  it('passes the matched key to onActivate', () => {
    const el = setup();
    const onActivate = vi.fn();
    const cleanup = createHotkey(el, { keys: 'ArrowRight', onActivate });

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

    expect(onActivate).toHaveBeenCalledWith(expect.any(KeyboardEvent), 'ArrowRight');

    cleanup();
  });
});
