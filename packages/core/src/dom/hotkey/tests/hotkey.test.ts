import { afterEach, describe, expect, it, vi } from 'vitest';

import { createHotkey, matchesEvent, parseKeyPattern } from '../hotkey';

describe('parseKeyPattern', () => {
  it('parses a single key with no modifiers', () => {
    const result = parseKeyPattern('k');

    expect(result).toHaveLength(1);
    expect(result[0]!.key).toBe('k');
    expect(result[0]!.originalKey).toBe('k');
    expect(result[0]!.modifiers.size).toBe(0);
  });

  it('parses Shift modifier', () => {
    const result = parseKeyPattern('Shift+>');

    expect(result).toHaveLength(1);
    expect(result[0]!.key).toBe('>');
    expect(result[0]!.modifiers.has('shift')).toBe(true);
    expect(result[0]!.modifiers.size).toBe(1);
  });

  it('parses Ctrl modifier', () => {
    const result = parseKeyPattern('Ctrl+k');

    expect(result).toHaveLength(1);
    expect(result[0]!.modifiers.has('ctrl')).toBe(true);
  });

  it('parses multiple modifiers', () => {
    const result = parseKeyPattern('Ctrl+Shift+f');

    expect(result).toHaveLength(1);
    expect(result[0]!.modifiers.has('ctrl')).toBe(true);
    expect(result[0]!.modifiers.has('shift')).toBe(true);
    expect(result[0]!.modifiers.size).toBe(2);
  });

  it('expands 0-9 into 10 bindings', () => {
    const result = parseKeyPattern('0-9');

    expect(result).toHaveLength(10);
    for (let i = 0; i < 10; i++) {
      expect(result[i]!.key).toBe(String(i));
      expect(result[i]!.modifiers.size).toBe(0);
    }
  });

  it('stores key lowercased for matching', () => {
    const result = parseKeyPattern('ArrowRight');

    expect(result[0]!.key).toBe('arrowright');
    expect(result[0]!.originalKey).toBe('ArrowRight');
  });

  it('parses Space to literal space character', () => {
    const result = parseKeyPattern('Space');

    expect(result[0]!.key).toBe(' ');
    expect(result[0]!.originalKey).toBe('Space');
  });

  it('warns on unknown modifier in __DEV__', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    parseKeyPattern('Foo+k');

    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]![0]).toContain('Unknown modifier');

    spy.mockRestore();
  });
});

describe('matchesEvent', () => {
  function createEvent(key: string, mods?: Partial<KeyboardEventInit>): KeyboardEvent {
    return new KeyboardEvent('keydown', { key, bubbles: true, ...mods });
  }

  it('matches a simple key', () => {
    const binding = parseKeyPattern('k')[0]!;
    expect(matchesEvent(binding, createEvent('k'))).toBe(true);
  });

  it('matches Space pattern against literal space event', () => {
    const binding = parseKeyPattern('Space')[0]!;
    expect(matchesEvent(binding, createEvent(' '))).toBe(true);
  });

  it('matches case-insensitively', () => {
    const binding = parseKeyPattern('k')[0]!;
    expect(matchesEvent(binding, createEvent('K'))).toBe(true);
  });

  it('rejects when extra modifiers are held', () => {
    const binding = parseKeyPattern('k')[0]!;
    expect(matchesEvent(binding, createEvent('k', { ctrlKey: true }))).toBe(false);
  });

  it('requires exact modifier match', () => {
    const binding = parseKeyPattern('Ctrl+k')[0]!;

    // Ctrl held — match.
    expect(matchesEvent(binding, createEvent('k', { ctrlKey: true }))).toBe(true);

    // Ctrl not held — no match.
    expect(matchesEvent(binding, createEvent('k'))).toBe(false);

    // Ctrl + Shift held — no match (extra modifier).
    expect(matchesEvent(binding, createEvent('k', { ctrlKey: true, shiftKey: true }))).toBe(false);
  });

  it('skips Unidentified key events (IME)', () => {
    const binding = parseKeyPattern('k')[0]!;
    expect(matchesEvent(binding, createEvent('Unidentified'))).toBe(false);
  });

  it('rejects non-matching keys', () => {
    const binding = parseKeyPattern('k')[0]!;
    expect(matchesEvent(binding, createEvent('j'))).toBe(false);
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
