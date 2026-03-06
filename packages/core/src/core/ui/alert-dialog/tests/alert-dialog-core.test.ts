import { describe, expect, it } from 'vitest';
import { AlertDialogCore, type AlertDialogInput } from '../alert-dialog-core';

const CLOSED: AlertDialogInput = { active: false, status: 'idle' };
const OPEN: AlertDialogInput = { active: true, status: 'idle' };
const STARTING: AlertDialogInput = { active: true, status: 'starting' };
const ENDING: AlertDialogInput = { active: true, status: 'ending' };

describe('AlertDialogCore', () => {
  it('uses default props', () => {
    const core = new AlertDialogCore();
    core.setInput(CLOSED);
    const state = core.getState();

    expect(state.open).toBe(false);
  });

  it('maps active to open', () => {
    const core = new AlertDialogCore();

    core.setInput(CLOSED);
    expect(core.getState().open).toBe(false);

    core.setInput(OPEN);
    expect(core.getState().open).toBe(true);
  });

  it('derives status from input', () => {
    const core = new AlertDialogCore();

    core.setInput(CLOSED);
    expect(core.getState().status).toBe('idle');

    core.setInput(STARTING);
    expect(core.getState().status).toBe('starting');

    core.setInput(ENDING);
    expect(core.getState().status).toBe('ending');
  });

  it('derives transition flags from status', () => {
    const core = new AlertDialogCore();

    core.setInput(STARTING);
    expect(core.getState().transitionStarting).toBe(true);
    expect(core.getState().transitionEnding).toBe(false);

    core.setInput(ENDING);
    expect(core.getState().transitionStarting).toBe(false);
    expect(core.getState().transitionEnding).toBe(true);

    core.setInput(OPEN);
    expect(core.getState().transitionStarting).toBe(false);
    expect(core.getState().transitionEnding).toBe(false);
  });

  it('keeps open true during ending transition', () => {
    const core = new AlertDialogCore();
    core.setInput(ENDING);
    const state = core.getState();

    expect(state.open).toBe(true);
    expect(state.transitionEnding).toBe(true);
  });

  it('accepts setProps without error', () => {
    const core = new AlertDialogCore();
    core.setProps({ open: true, defaultOpen: false });
    core.setInput(OPEN);

    expect(core.getState().open).toBe(true);
  });

  it('includes titleId and descriptionId in state', () => {
    const core = new AlertDialogCore();
    core.setInput(OPEN);

    expect(core.getState().titleId).toBeUndefined();
    expect(core.getState().descriptionId).toBeUndefined();

    core.setTitleId('title-1');
    core.setDescriptionId('desc-1');

    expect(core.getState().titleId).toBe('title-1');
    expect(core.getState().descriptionId).toBe('desc-1');
  });

  it('clears ids when set to undefined', () => {
    const core = new AlertDialogCore();
    core.setInput(OPEN);
    core.setTitleId('title-1');
    core.setDescriptionId('desc-1');

    core.setTitleId(undefined);
    core.setDescriptionId(undefined);

    expect(core.getState().titleId).toBeUndefined();
    expect(core.getState().descriptionId).toBeUndefined();
  });

  describe('getAttrs', () => {
    it('returns alertdialog role and aria-modal', () => {
      const core = new AlertDialogCore();
      core.setInput(OPEN);
      const attrs = core.getAttrs(core.getState());

      expect(attrs.role).toBe('alertdialog');
      expect(attrs['aria-modal']).toBe('true');
    });

    it('derives aria-labelledby and aria-describedby from state', () => {
      const core = new AlertDialogCore();
      core.setInput(OPEN);
      core.setTitleId('title-1');
      core.setDescriptionId('desc-1');
      const attrs = core.getAttrs(core.getState());

      expect(attrs['aria-labelledby']).toBe('title-1');
      expect(attrs['aria-describedby']).toBe('desc-1');
    });

    it('omits aria-labelledby and aria-describedby when no ids set', () => {
      const core = new AlertDialogCore();
      core.setInput(OPEN);
      const attrs = core.getAttrs(core.getState());

      expect(attrs['aria-labelledby']).toBeUndefined();
      expect(attrs['aria-describedby']).toBeUndefined();
    });
  });
});
