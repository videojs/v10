import { applyElementProps } from '@videojs/core/dom';

import type { SubmenuTriggerController } from './submenu-trigger-controller';
import { syncSectionLabelParts } from './sync-section-label-parts';

export interface UpdateMediaMenuSectionTriggerOptions<MenuState extends { disabled: boolean }> {
  host: HTMLElement;
  state: MenuState;
  submenuTrigger: SubmenuTriggerController;
  getCoreAttrs: (state: MenuState) => {
    'aria-label': string;
    'aria-disabled': string | undefined;
  };
  /** Return true while this trigger should remain a navigable submenu item */
  submenuRegistrationActive: (submenuAttrsPresent: boolean) => boolean;
  /** Spread into standalone (non-submenu) props after clearing submenu attributes */
  standaloneButtonExtras?: () => Record<string, unknown>;
  /** Spread alongside core attrs while in submenu layout */
  submenuOpenExtras?: (state: MenuState) => Record<string, unknown>;
  syncVisibleLabel: () => void;
  getMenuSectionLabel: () => string;
}

/** Shared DOM wiring for captions/playback-rate style menu triggers. */
export function updateMediaMenuSectionTrigger<MenuState extends { disabled: boolean }>(
  options: UpdateMediaMenuSectionTriggerOptions<MenuState>
): void {
  const {
    host,
    state,
    submenuTrigger,
    getCoreAttrs,
    submenuRegistrationActive,
    standaloneButtonExtras,
    submenuOpenExtras,
    syncVisibleLabel,
    getMenuSectionLabel,
  } = options;

  const submenuAttrs = submenuTrigger.getAttrs();

  syncVisibleLabel();
  syncSectionLabelParts(host, getMenuSectionLabel());
  submenuTrigger.syncRegistration(submenuRegistrationActive(Boolean(submenuAttrs)));

  if (submenuAttrs) {
    applyElementProps(host, {
      ...getCoreAttrs(state),
      ...submenuOpenExtras?.(state),
      ...submenuAttrs,
    });
  } else {
    applyElementProps(host, {
      role: 'button',
      tabIndex: 0,
      'aria-haspopup': undefined,
      'aria-expanded': undefined,
      'data-has-submenu': undefined,
      ...standaloneButtonExtras?.(),
      ...getCoreAttrs(state),
    });
  }
}
