import { describe, expect, it, vi } from 'vitest';

import type { SubmenuTriggerController } from '../submenu-trigger-controller';
import { updateMediaMenuSectionTrigger } from '../update-media-menu-section-trigger';

type CaptionsTriggerLikeState = {
  disabled: boolean;
  availability: 'available' | 'unavailable';
};

describe('updateMediaMenuSectionTrigger', () => {
  function createSubmenuMocks(submenuAttrs: Record<string, string> | null) {
    const getAttrs = vi.fn(() => submenuAttrs);
    const syncRegistration = vi.fn();
    const submenuTrigger = {
      getAttrs,
      syncRegistration,
    } as unknown as SubmenuTriggerController;

    return { submenuTrigger, getAttrs, syncRegistration };
  }

  const submenuAttrs = {
    role: 'menuitem',
    'aria-haspopup': 'menu',
    'aria-expanded': 'false',
    'data-has-submenu': '',
  };

  it('applies standalone button props when no submenu layout', () => {
    const host = document.createElement('div');

    const { submenuTrigger, getAttrs, syncRegistration } = createSubmenuMocks(null);

    updateMediaMenuSectionTrigger({
      host,
      state: { disabled: false },
      submenuTrigger,
      getCoreAttrs: () => ({ 'aria-label': 'Captions, Off', 'aria-disabled': undefined }),
      submenuRegistrationActive: (subPresent) => subPresent,
      syncVisibleLabel: vi.fn(),
      getMenuSectionLabel: () => 'Captions',
    });

    expect(getAttrs).toHaveBeenCalledTimes(1);
    expect(syncRegistration).toHaveBeenCalledWith(false);

    expect(host.getAttribute('role')).toBe('button');
    expect(host.getAttribute('aria-label')).toBe('Captions, Off');
    expect(host.tabIndex).toBe(0);
  });

  it('merges submenu item props and registers when availability allows', () => {
    const host = document.createElement('div');

    const state: CaptionsTriggerLikeState = { disabled: false, availability: 'available' };
    const { submenuTrigger, syncRegistration } = createSubmenuMocks(submenuAttrs);

    updateMediaMenuSectionTrigger<CaptionsTriggerLikeState>({
      host,
      state,
      submenuTrigger,
      getCoreAttrs: () => ({ 'aria-label': 'Captions, Auto', 'aria-disabled': undefined }),
      submenuRegistrationActive: (subPresent) => subPresent && state.availability === 'available',
      submenuOpenExtras: (s) => ({ hidden: s.availability !== 'available' }),
      syncVisibleLabel: vi.fn(),
      getMenuSectionLabel: () => 'Captions',
    });

    expect(syncRegistration).toHaveBeenCalledWith(true);
    expect(host.getAttribute('role')).toBe('menuitem');
    expect(host.getAttribute('aria-label')).toBe('Captions, Auto');
    expect(host.hidden).toBe(false);
  });

  it('skips submenu item registration when availability is unavailable', () => {
    const host = document.createElement('div');

    const state: CaptionsTriggerLikeState = { disabled: false, availability: 'unavailable' };
    const { submenuTrigger, syncRegistration } = createSubmenuMocks(submenuAttrs);

    updateMediaMenuSectionTrigger<CaptionsTriggerLikeState>({
      host,
      state,
      submenuTrigger,
      getCoreAttrs: () => ({ 'aria-label': 'Captions, Off', 'aria-disabled': undefined }),
      submenuRegistrationActive: (subPresent) => subPresent && state.availability === 'available',
      submenuOpenExtras: (s) => ({ hidden: s.availability !== 'available' }),
      syncVisibleLabel: vi.fn(),
      getMenuSectionLabel: () => 'Captions',
    });

    expect(syncRegistration).toHaveBeenCalledWith(false);
    expect(host.getAttribute('role')).toBe('menuitem');
    expect(host.hidden).toBe(true);
  });

  it('runs syncVisibleLabel and syncSectionLabelParts', () => {
    const host = document.createElement('div');
    const section = document.createElement('span');
    section.dataset.part = 'section-label';
    host.append(section);

    const syncVisibleLabel = vi.fn();
    const { submenuTrigger } = createSubmenuMocks(null);

    updateMediaMenuSectionTrigger({
      host,
      state: { disabled: false },
      submenuTrigger,
      getCoreAttrs: () => ({ 'aria-label': 'Rate', 'aria-disabled': undefined }),
      submenuRegistrationActive: (subPresent) => subPresent,
      syncVisibleLabel,
      getMenuSectionLabel: () => 'Speed',
    });

    expect(syncVisibleLabel).toHaveBeenCalledTimes(1);
    expect(section.textContent).toBe('Speed');
  });
});
