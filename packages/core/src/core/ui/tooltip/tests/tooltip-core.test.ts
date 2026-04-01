import { describe, expect, it } from 'vitest';
import { TooltipCore, type TooltipInput } from '../tooltip-core';

const CLOSED: TooltipInput = { active: false, status: 'idle' };
const OPEN: TooltipInput = { active: true, status: 'idle' };

describe('TooltipCore', () => {
  it('uses default props', () => {
    const core = new TooltipCore();
    core.setInput(CLOSED);
    const state = core.getState();

    expect(state.side).toBe('top');
    expect(state.align).toBe('center');
  });

  it('merges input state', () => {
    const core = new TooltipCore();

    core.setInput(CLOSED);
    expect(core.getState().open).toBe(false);

    core.setInput(OPEN);
    expect(core.getState().open).toBe(true);
  });

  it('applies custom props', () => {
    const core = new TooltipCore({ side: 'bottom', align: 'start' });
    core.setInput(OPEN);
    const state = core.getState();

    expect(state.side).toBe('bottom');
    expect(state.align).toBe('start');
  });

  it('updates props via setProps', () => {
    const core = new TooltipCore();

    core.setProps({ side: 'left' });
    core.setInput(OPEN);
    const state = core.getState();

    expect(state.side).toBe('left');
    expect(state.align).toBe('center');
  });

  describe('getTriggerAttrs', () => {
    it('returns empty object (visual-only tooltip)', () => {
      const core = new TooltipCore();
      core.setInput(OPEN);
      const attrs = core.getTriggerAttrs(core.getState(), 'tooltip-1');

      expect(attrs).toEqual({});
    });
  });

  describe('getPopupAttrs', () => {
    it('returns presentation role', () => {
      const core = new TooltipCore();
      core.setInput(OPEN);
      const attrs = core.getPopupAttrs(core.getState());

      expect(attrs.role).toBe('presentation');
    });

    it('returns popover manual attribute', () => {
      const core = new TooltipCore();
      core.setInput(OPEN);
      const attrs = core.getPopupAttrs(core.getState());

      expect(attrs.popover).toBe('manual');
    });
  });

  describe('transition flags', () => {
    it('sets transitionStarting when status is starting', () => {
      const core = new TooltipCore();
      core.setInput({ active: true, status: 'starting' });
      const state = core.getState();

      expect(state.transitionStarting).toBe(true);
      expect(state.transitionEnding).toBe(false);
    });

    it('sets transitionEnding when status is ending', () => {
      const core = new TooltipCore();
      core.setInput({ active: true, status: 'ending' });
      const state = core.getState();

      expect(state.transitionStarting).toBe(false);
      expect(state.transitionEnding).toBe(true);
    });

    it('both false when status is idle', () => {
      const core = new TooltipCore();
      core.setInput(OPEN);
      const state = core.getState();

      expect(state.transitionStarting).toBe(false);
      expect(state.transitionEnding).toBe(false);
    });
  });
});
