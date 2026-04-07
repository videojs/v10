import { describe, expect, it } from 'vitest';

import { toAriaKeyShortcut } from '../aria';
import { parseHotkeyPattern } from '../hotkey';

describe('toAriaKeyShortcut', () => {
  it('formats a simple key', () => {
    expect(toAriaKeyShortcut(parseHotkeyPattern('k'))).toBe('k');
  });

  it('maps ctrl to Control', () => {
    expect(toAriaKeyShortcut(parseHotkeyPattern('Ctrl+k'))).toBe('Control+k');
  });

  it('maps shift to Shift', () => {
    expect(toAriaKeyShortcut(parseHotkeyPattern('Shift+>'))).toBe('Shift+>');
  });

  it('formats multiple modifiers in consistent order', () => {
    const result = toAriaKeyShortcut(parseHotkeyPattern('Ctrl+Shift+f'));
    expect(result).toBe('Control+Shift+f');
  });

  it('separates alternatives with space', () => {
    const bindings = [...parseHotkeyPattern('k'), ...parseHotkeyPattern('Space')];
    expect(toAriaKeyShortcut(bindings)).toBe('k Space');
  });

  it('preserves original key casing', () => {
    expect(toAriaKeyShortcut(parseHotkeyPattern('ArrowRight'))).toBe('ArrowRight');
  });

  it('handles digit range bindings', () => {
    const bindings = parseHotkeyPattern('0-9');
    const result = toAriaKeyShortcut(bindings);
    expect(result).toBe('0 1 2 3 4 5 6 7 8 9');
  });
});
