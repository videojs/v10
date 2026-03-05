import { describe, expect, it } from 'vitest';
import { PopoverCore, type PopoverInput } from '../popover-core';

const CLOSED: PopoverInput = { active: false, status: 'idle' };
const OPEN: PopoverInput = { active: true, status: 'idle' };

describe('PopoverCore', () => {
  it('uses default props', () => {
    const core = new PopoverCore();
    core.setInput(CLOSED);
    const state = core.getState();

    expect(state.side).toBe('top');
    expect(state.align).toBe('center');
    expect(state.modal).toBe(false);
  });

  it('merges input state', () => {
    const core = new PopoverCore();

    core.setInput(CLOSED);
    const closed = core.getState();
    expect(closed.open).toBe(false);

    core.setInput(OPEN);
    const open = core.getState();
    expect(open.open).toBe(true);
  });

  it('applies custom props', () => {
    const core = new PopoverCore({ side: 'bottom', align: 'start' });
    core.setInput(OPEN);
    const state = core.getState();

    expect(state.side).toBe('bottom');
    expect(state.align).toBe('start');
  });

  it('updates props via setProps', () => {
    const core = new PopoverCore();

    core.setProps({ side: 'left', modal: true });
    core.setInput(OPEN);
    const state = core.getState();

    expect(state.side).toBe('left');
    expect(state.modal).toBe(true);
    // Other defaults preserved
    expect(state.align).toBe('center');
  });

  describe('getTriggerAttrs', () => {
    it('returns aria-expanded false when closed', () => {
      const core = new PopoverCore();
      core.setInput(CLOSED);
      const state = core.getState();
      const attrs = core.getTriggerAttrs(state);

      expect(attrs['aria-expanded']).toBe('false');
      expect(attrs['aria-haspopup']).toBe('dialog');
    });

    it('returns aria-expanded true when open', () => {
      const core = new PopoverCore();
      core.setInput(OPEN);
      const state = core.getState();
      const attrs = core.getTriggerAttrs(state);

      expect(attrs['aria-expanded']).toBe('true');
    });

    it('includes aria-controls when popupId is provided', () => {
      const core = new PopoverCore();
      core.setInput(OPEN);
      const state = core.getState();
      const attrs = core.getTriggerAttrs(state, 'popup-123');

      expect(attrs['aria-controls']).toBe('popup-123');
    });

    it('returns undefined aria-controls when popupId is not provided', () => {
      const core = new PopoverCore();
      core.setInput(OPEN);
      const state = core.getState();
      const attrs = core.getTriggerAttrs(state);

      expect(attrs['aria-controls']).toBeUndefined();
    });
  });

  describe('getPopupAttrs', () => {
    it('returns popover manual attribute', () => {
      const core = new PopoverCore();
      core.setInput(OPEN);
      const state = core.getState();
      const attrs = core.getPopupAttrs(state);

      expect(attrs.popover).toBe('manual');
    });

    it('returns dialog role', () => {
      const core = new PopoverCore();
      core.setInput(OPEN);
      const state = core.getState();
      const attrs = core.getPopupAttrs(state);

      expect(attrs.role).toBe('dialog');
    });

    it('sets aria-modal when modal is true', () => {
      const core = new PopoverCore({ modal: true });
      core.setInput(OPEN);
      const state = core.getState();
      const attrs = core.getPopupAttrs(state);

      expect(attrs['aria-modal']).toBe('true');
    });

    it('omits aria-modal when not modal', () => {
      const core = new PopoverCore();
      core.setInput(OPEN);
      const state = core.getState();
      const attrs = core.getPopupAttrs(state);

      expect(attrs['aria-modal']).toBeUndefined();
    });

    it('omits aria-modal when modal is trap-focus', () => {
      const core = new PopoverCore({ modal: 'trap-focus' });
      core.setInput(OPEN);
      const state = core.getState();
      const attrs = core.getPopupAttrs(state);

      expect(attrs['aria-modal']).toBeUndefined();
    });
  });

  describe('transition flags', () => {
    it('sets transitionStarting when status is starting', () => {
      const core = new PopoverCore();
      core.setInput({ active: true, status: 'starting' });
      const state = core.getState();

      expect(state.transitionStarting).toBe(true);
      expect(state.transitionEnding).toBe(false);
    });

    it('sets transitionEnding when status is ending', () => {
      const core = new PopoverCore();
      core.setInput({ active: true, status: 'ending' });
      const state = core.getState();

      expect(state.transitionStarting).toBe(false);
      expect(state.transitionEnding).toBe(true);
    });

    it('both false when status is idle', () => {
      const core = new PopoverCore();
      core.setInput(OPEN);
      const state = core.getState();

      expect(state.transitionStarting).toBe(false);
      expect(state.transitionEnding).toBe(false);
    });
  });
});
