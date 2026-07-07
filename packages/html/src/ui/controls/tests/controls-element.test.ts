import { type MediaControlsState, POPUP_HOST_ATTR } from '@videojs/core';
import type { AnyPlayerStore } from '@videojs/core/dom';
import { ContextProvider } from '@videojs/element/context';
import { createStore, flush } from '@videojs/store';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { playerContext } from '../../../player/context';
import { MediaElement } from '../../media-element';
import { MenuElement } from '../../menu/menu-element';
import { PopoverElement } from '../../popover/popover-element';
import { TooltipElement } from '../../tooltip/tooltip-element';
import { ControlsElement } from '../controls-element';

function ensureCustomElementDefined(Constructor: CustomElementConstructor & { readonly tagName: string }): void {
  const { tagName } = Constructor;
  if (!customElements.get(tagName)) {
    customElements.define(tagName, Constructor);
  }
}

function createDefinedElement<Class extends CustomElementConstructor & { readonly tagName: string }>(
  Constructor: Class
): InstanceType<Class> {
  ensureCustomElementDefined(Constructor);
  return document.createElement(Constructor.tagName) as InstanceType<Class>;
}

function defineElement(tagName: string, Base: CustomElementConstructor): void {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, Base);
  }
}

function createControlsStore(): AnyPlayerStore {
  return createStore<unknown>()<MediaControlsState>({
    name: 'controls',
    state: ({ get, set }) => {
      return {
        userActive: true,
        controlsVisible: true,
        toggleControls() {
          const visible = !(get().controlsVisible as boolean);

          set({ userActive: visible, controlsVisible: visible });

          return visible;
        },
      };
    },
  }) as unknown as AnyPlayerStore;
}

class TestPlayerProviderElement extends MediaElement {
  store = createControlsStore();

  readonly #provider = new ContextProvider(this, { context: playerContext, initialValue: this.store });

  override connectedCallback(): void {
    super.connectedCallback();
    this.#provider.setValue(this.store);
  }

  setVisible(visible: boolean): void {
    const state = this.store.state as MediaControlsState;

    if (state.controlsVisible === visible) return;

    state.toggleControls();
    flush();
  }
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function waitForAssertion(assertion: () => void): Promise<void> {
  let error: unknown;

  for (let index = 0; index < 10; index++) {
    try {
      assertion();
      return;
    } catch (caught) {
      error = caught;
      await nextFrame();
    }
  }

  throw error;
}

defineElement('test-controls-player-provider', TestPlayerProviderElement);

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ControlsElement', () => {
  it('closes owned popovers, menus, and tooltips when controls hide', async () => {
    const provider = document.createElement('test-controls-player-provider') as TestPlayerProviderElement;
    const controls = createDefinedElement(ControlsElement);
    const popover = createDefinedElement(PopoverElement);
    const menu = createDefinedElement(MenuElement);
    const playbackRateMenu = createDefinedElement(MenuElement);
    const tooltip = createDefinedElement(TooltipElement);
    const popoverClose = vi.spyOn(popover, 'close');
    const menuClose = vi.spyOn(menu, 'close');
    const playbackRateMenuClose = vi.spyOn(playbackRateMenu, 'close');
    const tooltipClose = vi.spyOn(tooltip, 'close');

    controls.append(popover, menu, playbackRateMenu, tooltip);
    document.body.append(provider);
    provider.append(controls);

    await controls.updateComplete;

    expect(popover.hasAttribute(POPUP_HOST_ATTR)).toBe(true);
    expect(menu.hasAttribute(POPUP_HOST_ATTR)).toBe(true);
    expect(playbackRateMenu.hasAttribute(POPUP_HOST_ATTR)).toBe(true);
    expect(tooltip.hasAttribute(POPUP_HOST_ATTR)).toBe(true);

    provider.setVisible(false);

    await waitForAssertion(() => {
      expect(popoverClose).toHaveBeenCalledWith('imperative-action');
      expect(menuClose).toHaveBeenCalledWith('imperative-action');
      expect(playbackRateMenuClose).toHaveBeenCalledWith('imperative-action');
      expect(tooltipClose).toHaveBeenCalledWith('imperative-action');
    });
  });

  it('does not call close on native dialogs inside controls when controls hide', async () => {
    const provider = document.createElement('test-controls-player-provider') as TestPlayerProviderElement;
    const controls = createDefinedElement(ControlsElement);
    const dialog = document.createElement('dialog');
    const closeSpy = vi.spyOn(dialog, 'close');

    controls.append(dialog);
    document.body.append(provider);
    provider.append(controls);

    await controls.updateComplete;

    provider.setVisible(false);

    await waitForAssertion(() => {
      expect(closeSpy).not.toHaveBeenCalled();
    });
  });

  it('ignores popup host markers when close is missing or not a function', async () => {
    const provider = document.createElement('test-controls-player-provider') as TestPlayerProviderElement;
    const controls = createDefinedElement(ControlsElement);
    const withoutClose = document.createElement('div');
    withoutClose.setAttribute(POPUP_HOST_ATTR, '');
    const wrongClose = document.createElement('div');
    wrongClose.setAttribute(POPUP_HOST_ATTR, '');
    Object.assign(wrongClose, { close: 'not-callable' });

    controls.append(withoutClose, wrongClose);
    document.body.append(provider);
    provider.append(controls);

    await controls.updateComplete;

    expect(() => provider.setVisible(false)).not.toThrow();
  });
});
