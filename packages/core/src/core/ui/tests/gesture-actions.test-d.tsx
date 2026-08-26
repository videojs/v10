import type { GestureProps } from '../gesture/core';

const builtInGesture = {
  type: 'tap',
  action: 'toggleControls',
} satisfies GestureProps;

const customGesture = {
  type: 'doubletap',
  action: 'openTranscript',
} satisfies GestureProps;

void builtInGesture;
void customGesture;
