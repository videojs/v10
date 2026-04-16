import { describe, expect, it } from 'vitest';

import {
  getRenderedInputFeedbackItemState,
  type InputFeedbackItemDataState,
  isInputFeedbackItemPresent,
} from '../input-feedback-item';

const DEFAULT_ITEM_STATE: InputFeedbackItemDataState = {
  active: false,
  action: null,
  group: null,
  generation: 0,
  region: null,
  direction: null,
  paused: null,
  volumeLevel: null,
  captions: null,
  boundary: null,
  value: null,
  transitionStarting: false,
  transitionEnding: false,
};

describe('getRenderedInputFeedbackItemState', () => {
  it('keeps the snapshot seek region while the item is transitioning out', () => {
    const current: InputFeedbackItemDataState = {
      ...DEFAULT_ITEM_STATE,
      group: 'seek',
      region: 'center',
    };
    const snapshot: InputFeedbackItemDataState = {
      ...DEFAULT_ITEM_STATE,
      active: true,
      action: 'seekStep',
      group: 'seek',
      generation: 1,
      region: 'right',
      direction: 'forward',
      value: '10s',
    };

    const rendered = getRenderedInputFeedbackItemState(current, snapshot, {
      active: true,
      status: 'ending',
    });

    expect(rendered.region).toBe('right');
    expect(rendered.transitionEnding).toBe(true);
  });
});

describe('isInputFeedbackItemPresent', () => {
  it('stays present while the exit transition is still active', () => {
    expect(
      isInputFeedbackItemPresent(
        {
          ...DEFAULT_ITEM_STATE,
          active: false,
        },
        {
          active: true,
        }
      )
    ).toBe(true);
  });

  it('is not present once both the item and transition are inactive', () => {
    expect(isInputFeedbackItemPresent(DEFAULT_ITEM_STATE, { active: false })).toBe(false);
  });
});
