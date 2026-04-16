import type { InputFeedbackDataState, InputFeedbackItemDefinition } from '@videojs/core';
import { getInputFeedbackItemState } from '@videojs/core';
import { describe, expect, it } from 'vitest';

import { InputFeedbackIconElement } from '../input-feedback-icon-element';
import { InputFeedbackItemElement } from '../input-feedback-item-element';

const DEFAULT_STATE: InputFeedbackDataState = {
  active: false,
  action: null,
  region: null,
  direction: null,
  count: 0,
  seekTotal: 0,
  generation: 0,
  label: null,
  paused: null,
  volumeLevel: null,
  fullscreen: null,
  captions: null,
  pip: null,
  boundary: null,
  volumeLabel: null,
  captionsLabel: null,
  transitionStarting: false,
  transitionEnding: false,
};

describe('InputFeedbackItemElement', () => {
  it('has the correct tag name', () => {
    expect(InputFeedbackItemElement.tagName).toBe('media-input-feedback-item');
  });

  it('has the correct icon tag name', () => {
    expect(InputFeedbackIconElement.tagName).toBe('media-input-feedback-icon');
  });
});

describe('getInputFeedbackItemState', () => {
  it('returns volume attrs for a matching volume group', () => {
    const state: InputFeedbackDataState = {
      ...DEFAULT_STATE,
      active: true,
      action: 'volumeStep',
      volumeLevel: 'high',
      volumeLabel: '80%',
      label: '80%',
    };
    const definition: InputFeedbackItemDefinition = { group: 'volume' };

    const itemState = getInputFeedbackItemState(state, definition, 'high');

    expect(itemState.group).toBe('volume');
    expect(itemState.action).toBe(null);
    expect(itemState.volumeLevel).toBe('high');
    expect(itemState.value).toBe('80%');
  });

  it('keeps the matched seek action for seek groups', () => {
    const state: InputFeedbackDataState = {
      ...DEFAULT_STATE,
      active: true,
      action: 'seekToPercent',
      direction: 'forward',
    };
    const definition: InputFeedbackItemDefinition = { group: 'seek' };

    const itemState = getInputFeedbackItemState(state, definition, null);

    expect(itemState.group).toBe('seek');
    expect(itemState.action).toBe('seekToPercent');
    expect(itemState.generation).toBe(0);
  });

  it('keeps a live volume level on inactive volume items', () => {
    const definition: InputFeedbackItemDefinition = { group: 'volume' };

    const itemState = getInputFeedbackItemState(DEFAULT_STATE, definition, 'low');

    expect(itemState.active).toBe(false);
    expect(itemState.group).toBe('volume');
    expect(itemState.volumeLevel).toBe('low');
  });
});
