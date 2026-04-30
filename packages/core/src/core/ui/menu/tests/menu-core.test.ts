import { describe, expect, it } from 'vitest';

import { MenuCore, type MenuInput } from '../menu-core';

function createInput(overrides: Partial<MenuInput> = {}): MenuInput {
  return {
    active: false,
    status: 'idle',
    ...overrides,
  };
}

describe('MenuCore', () => {
  describe('defaultProps', () => {
    it('has expected defaults', () => {
      expect(MenuCore.defaultProps).toEqual({
        side: 'bottom',
        align: 'start',
        open: false,
        defaultOpen: false,
        closeOnEscape: true,
        closeOnOutsideClick: true,
        isSubmenu: false,
      });
    });
  });

  describe('getState', () => {
    it('returns closed state by default', () => {
      const core = new MenuCore();
      core.setInput(createInput());
      const state = core.getState();

      expect(state.open).toBe(false);
      expect(state.status).toBe('idle');
      expect(state.side).toBe('bottom');
      expect(state.align).toBe('start');
      expect(state.isSubmenu).toBe(false);
      expect(state.transitionStarting).toBe(false);
      expect(state.transitionEnding).toBe(false);
    });

    it('returns open state when active', () => {
      const core = new MenuCore();
      core.setInput(createInput({ active: true, status: 'idle' }));
      const state = core.getState();

      expect(state.open).toBe(true);
    });

    it('reflects transitionStarting during starting status', () => {
      const core = new MenuCore();
      core.setInput(createInput({ active: true, status: 'starting' }));
      const state = core.getState();

      expect(state.transitionStarting).toBe(true);
      expect(state.transitionEnding).toBe(false);
    });

    it('reflects transitionEnding during ending status', () => {
      const core = new MenuCore();
      core.setInput(createInput({ active: false, status: 'ending' }));
      const state = core.getState();

      expect(state.transitionStarting).toBe(false);
      expect(state.transitionEnding).toBe(true);
    });

    it('reflects custom side and align from props', () => {
      const core = new MenuCore({ side: 'top', align: 'end' });
      core.setInput(createInput());
      const state = core.getState();

      expect(state.side).toBe('top');
      expect(state.align).toBe('end');
    });

    it('reflects isSubmenu from props', () => {
      const core = new MenuCore({ isSubmenu: true });
      core.setInput(createInput());
      const state = core.getState();

      expect(state.isSubmenu).toBe(true);
    });
  });

  describe('getTriggerAttrs', () => {
    it('returns closed ARIA attrs', () => {
      const core = new MenuCore();
      core.setInput(createInput());
      const state = core.getState();
      const attrs = core.getTriggerAttrs(state);

      expect(attrs['aria-haspopup']).toBe('menu');
      expect(attrs['aria-expanded']).toBe('false');
      expect(attrs['aria-controls']).toBeUndefined();
    });

    it('returns open ARIA attrs when open', () => {
      const core = new MenuCore();
      core.setInput(createInput({ active: true }));
      const state = core.getState();
      const attrs = core.getTriggerAttrs(state);

      expect(attrs['aria-expanded']).toBe('true');
    });

    it('sets aria-controls when contentId is provided', () => {
      const core = new MenuCore();
      core.setInput(createInput());
      const state = core.getState();
      const attrs = core.getTriggerAttrs(state, 'my-menu');

      expect(attrs['aria-controls']).toBe('my-menu');
    });
  });

  describe('getContentAttrs', () => {
    it('returns menu ARIA attrs with popover for root menu', () => {
      const core = new MenuCore();
      core.setInput(createInput());
      const state = core.getState();
      const attrs = core.getContentAttrs(state);

      expect(attrs.role).toBe('menu');
      expect(attrs.tabIndex).toBe(-1);
      expect(attrs.popover).toBe('manual');
    });

    it('omits popover attr for submenus', () => {
      const core = new MenuCore({ isSubmenu: true });
      core.setInput(createInput());
      const state = core.getState();
      const attrs = core.getContentAttrs(state);

      expect(attrs.role).toBe('menu');
      expect(attrs.tabIndex).toBe(-1);
      expect('popover' in attrs).toBe(false);
    });
  });

  describe('setProps', () => {
    it('updates props after construction', () => {
      const core = new MenuCore();
      core.setProps({ side: 'top', align: 'center' });
      core.setInput(createInput());
      const state = core.getState();

      expect(state.side).toBe('top');
      expect(state.align).toBe('center');
    });

    it('preserves defaults for unset props', () => {
      const core = new MenuCore();
      core.setProps({ side: 'left' });
      core.setInput(createInput());
      const state = core.getState();

      expect(state.side).toBe('left');
      expect(state.align).toBe('start');
      expect(state.isSubmenu).toBe(false);
    });
  });

  describe('constructor', () => {
    it('accepts initial props', () => {
      const core = new MenuCore({ side: 'right', isSubmenu: true });
      core.setInput(createInput());
      const state = core.getState();

      expect(state.side).toBe('right');
      expect(state.isSubmenu).toBe(true);
    });

    it('works without props', () => {
      const core = new MenuCore();
      core.setInput(createInput());
      expect(() => core.getState()).not.toThrow();
    });
  });

  describe('namespace', () => {
    it('exports Props, State, Input types via namespace', () => {
      // Compile-time check: ensure namespace types are accessible.
      const _props: MenuCore.Props = {};
      const _input: MenuCore.Input = { active: false, status: 'idle' };
      expect(_props).toBeDefined();
      expect(_input).toBeDefined();
    });
  });
});
