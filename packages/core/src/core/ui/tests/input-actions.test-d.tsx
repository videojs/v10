import type { HotkeyProps } from '../hotkey/core';

const hotkey = {
  keys: 'k',
  action: 'togglePaused',
} satisfies HotkeyProps;

void hotkey;

// @ts-expect-error - toggleControls is not implemented by Hotkey.
const unsupportedHotkey = { keys: 'k', action: 'toggleControls' } satisfies HotkeyProps;

// @ts-expect-error - Hotkey does not resolve custom store actions.
const customHotkey = { keys: 'k', action: 'openTranscript' } satisfies HotkeyProps;

void unsupportedHotkey;
void customHotkey;
