import { describe, expect, it } from 'vite-plus/test';

import { DialogCore, type DialogInput } from '../core';

const CLOSED: DialogInput = { active: false, status: 'idle' };
const OPEN: DialogInput = { active: true, status: 'idle' };
const ENDING: DialogInput = { active: true, status: 'ending' };

describe('DialogCore', () => {
  it('maps transition input to dialog state', () => {
    const core = new DialogCore();

    core.setInput(CLOSED);
    expect(core.getState().open).toBe(false);

    core.setInput(ENDING);
    expect(core.getState()).toMatchObject({
      open: true,
      status: 'ending',
      transitionStarting: false,
      transitionEnding: true,
    });
  });

  it('returns modal dialog semantics and label relationships', () => {
    const core = new DialogCore();

    core.setInput(OPEN);
    core.setTitleId('title-1');
    core.setDescriptionId('description-1');

    expect(core.getPopupAttrs(core.getState())).toEqual({
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'title-1',
      'aria-describedby': 'description-1',
    });
  });

  it('connects a trigger to the popup', () => {
    const core = new DialogCore();

    core.setInput(OPEN);

    expect(core.getTriggerAttrs(core.getState(), 'dialog-1')).toEqual({
      'aria-expanded': 'true',
      'aria-haspopup': 'dialog',
      'aria-controls': 'dialog-1',
    });
  });
});
