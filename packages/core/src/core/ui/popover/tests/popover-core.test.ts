import { describe, expect, it } from 'vitest';
import { PopoverCore, type PopoverInteraction } from '../popover-core';

const CLOSED: PopoverInteraction = { open: false };
const OPEN: PopoverInteraction = { open: true };

describe('PopoverCore', () => {
  it('uses default props', () => {
    const core = new PopoverCore();
    const state = core.getState(CLOSED);

    expect(state.side).toBe('top');
    expect(state.align).toBe('center');
    expect(state.modal).toBe(false);
  });

  it('merges interaction state', () => {
    const core = new PopoverCore();

    const closed = core.getState(CLOSED);
    expect(closed.open).toBe(false);

    const open = core.getState(OPEN);
    expect(open.open).toBe(true);
  });

  it('applies custom props', () => {
    const core = new PopoverCore({ side: 'bottom', align: 'start' });
    const state = core.getState(OPEN);

    expect(state.side).toBe('bottom');
    expect(state.align).toBe('start');
  });

  it('updates props via setProps', () => {
    const core = new PopoverCore();

    core.setProps({ side: 'left', modal: true });
    const state = core.getState(OPEN);

    expect(state.side).toBe('left');
    expect(state.modal).toBe(true);
    // Other defaults preserved
    expect(state.align).toBe('center');
  });

  describe('getTriggerAttrs', () => {
    it('returns aria-expanded false when closed', () => {
      const core = new PopoverCore();
      const state = core.getState(CLOSED);
      const attrs = core.getTriggerAttrs(state);

      expect(attrs['aria-expanded']).toBe('false');
      expect(attrs['aria-haspopup']).toBe('dialog');
    });

    it('returns aria-expanded true when open', () => {
      const core = new PopoverCore();
      const state = core.getState(OPEN);
      const attrs = core.getTriggerAttrs(state);

      expect(attrs['aria-expanded']).toBe('true');
    });

    it('includes aria-controls when popupId is provided', () => {
      const core = new PopoverCore();
      const state = core.getState(OPEN);
      const attrs = core.getTriggerAttrs(state, 'popup-123');

      expect(attrs['aria-controls']).toBe('popup-123');
    });

    it('omits aria-controls when popupId is not provided', () => {
      const core = new PopoverCore();
      const state = core.getState(OPEN);
      const attrs = core.getTriggerAttrs(state);

      expect(attrs).not.toHaveProperty('aria-controls');
    });
  });

  describe('getPopupAttrs', () => {
    it('returns dialog role', () => {
      const core = new PopoverCore();
      const state = core.getState(OPEN);
      const attrs = core.getPopupAttrs(state);

      expect(attrs.role).toBe('dialog');
    });

    it('sets aria-modal when modal is true', () => {
      const core = new PopoverCore({ modal: true });
      const state = core.getState(OPEN);
      const attrs = core.getPopupAttrs(state);

      expect(attrs['aria-modal']).toBe('true');
    });

    it('omits aria-modal when not modal', () => {
      const core = new PopoverCore();
      const state = core.getState(OPEN);
      const attrs = core.getPopupAttrs(state);

      expect(attrs['aria-modal']).toBeUndefined();
    });

    it('omits aria-modal when modal is trap-focus', () => {
      const core = new PopoverCore({ modal: 'trap-focus' });
      const state = core.getState(OPEN);
      const attrs = core.getPopupAttrs(state);

      expect(attrs['aria-modal']).toBeUndefined();
    });
  });
});
