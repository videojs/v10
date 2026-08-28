import { MenuContentDataAttrs, MenuCore, type MenuOptionState, resolveMenuOptionState } from '@videojs/core';
import {
  applyElementProps,
  applyStateDataAttrs,
  createMenu,
  createTransition,
  isMenuNavigationKey,
  type MenuApi,
  type MenuChangeDetails,
  type MenuOpenChangeReason,
  type UIKeyboardEvent,
} from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextConsumer, ContextProvider } from '@videojs/element/context';

import { UIElement } from '../ui-element';
import { type MenuContextValue, menuContext } from './context';
let idCounter = 0;

/** One accessible menu page. Root and nested pages are sibling children of `<media-menu>`. */
export class MenuContentElement extends UIElement {
  static readonly tagName = 'media-menu-content';

  static override properties = {
    open: { type: Boolean },
    defaultOpen: { type: Boolean, attribute: 'default-open' },
  } satisfies PropertyDeclarationMap<'open' | 'defaultOpen'>;

  open = false;
  defaultOpen = false;

  readonly #root = new ContextConsumer(this, { context: menuContext, subscribe: true });
  readonly #provider = new ContextProvider(this, { context: menuContext });
  readonly #core = new MenuCore();
  readonly #generatedId = `vjs-menu-content-${idCounter++}`;
  #context: MenuContextValue | null = null;
  #menu: MenuApi | null = null;
  #parentMenu: MenuApi | null = null;
  #rootMenu: MenuApi | null = null;
  #ownsMenu = false;
  #disconnect: AbortController | null = null;
  #cleanupRegistration: (() => void) | null = null;
  #cleanupParentRegistration: (() => void) | null = null;
  readonly #optionStates = new Map<symbol, MenuOptionState>();
  readonly #optionSource = Symbol('menu');
  #optionState: MenuOptionState | null = null;
  #optionParent: MenuContextValue | null = null;
  #stateTrigger: HTMLElement | null = null;
  #triggerWasDisabled = false;
  #triggerWasHidden = false;
  #wasActive = false;
  #normalizing = false;

  get context(): MenuContextValue | null {
    return this.#context;
  }

  override connectedCallback(): void {
    super.connectedCallback();

    if (this.#normalizing) return;

    this.#disconnect = new AbortController();
    applyElementProps(
      this,
      { onKeyDown: this.#handleKeyDown, onFocusOut: this.#handleFocusOut },
      { signal: this.#disconnect.signal }
    );
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();

    if (this.#normalizing) return;

    this.#cleanupMenu();
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  openMenu(reason: MenuOpenChangeReason = 'imperative-action'): void {
    this.#menu?.open(reason);
  }

  close(reason: MenuOpenChangeReason = 'imperative-action'): void {
    this.#menu?.close(reason);
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);

    if (!this.hasUpdated && this.defaultOpen && !this.open) this.open = true;

    if (this.#ownsMenu && this.#menu && changed.has('open')) this.#menu.syncOpen(this.open);
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);
    const root = this.#root.value ?? null;
    if (!root) return;

    if (!this.id) this.id = this.#generatedId;

    const trigger = this.#findTrigger();
    const parentContent = trigger?.closest<MenuContentElement>(MenuContentElement.tagName) ?? null;

    if (parentContent && !parentContent.context) {
      this.hidden = true;
      requestAnimationFrame(() => this.requestUpdate());
      return;
    }

    const parentMenu = parentContent?.context?.menu ?? null;
    const isSubmenu = parentMenu !== null;

    if (root.menu !== this.#rootMenu || parentMenu !== this.#parentMenu) {
      this.#cleanupMenu();
      this.#rootMenu = root.menu;
      this.#parentMenu = parentMenu;
      this.#setupMenu(root, parentMenu);
    }

    this.#setOptionParent(parentContent?.context ?? root);

    const menu = this.#menu;
    if (!menu) return;

    const input = menu.input.current;

    this.#core.setInput({ ...input, isSubmenu });
    const state = this.#core.getState();
    const active = !isSubmenu || state.open || state.status === 'ending';

    applyElementProps(this, {
      ...this.#core.getContentAttrs(),
      hidden: !active,
    });
    applyStateDataAttrs(this, state, MenuContentDataAttrs);

    if (trigger) {
      menu.setTriggerElement(trigger);
      applyElementProps(trigger, this.#core.getTriggerAttrs(state, active ? this.id : undefined));
      this.#syncOptionState(trigger);
    }

    if (isSubmenu && active && !this.#wasActive) menu.highlightFirstItem({ preventScroll: true });

    this.#wasActive = active;

    this.#context = {
      core: this.#core,
      menu,
      popup: root.popup,
      state,
      setOptionState: this.#setOptionState,
    };
    this.#provider.setValue(this.#context);
    root.popup.sync();
    this.#normalize();
  }

  #setupMenu(root: MenuContextValue, parentMenu: MenuApi | null): void {
    const isSubmenu = parentMenu !== null;

    if (isSubmenu) {
      this.#ownsMenu = true;
      this.#menu = createMenu({
        transition: createTransition(),
        onOpenChange: (nextOpen: boolean, details: MenuChangeDetails) => {
          const accepted = this.dispatchEvent(
            new CustomEvent('open-change', {
              bubbles: true,
              cancelable: true,
              composed: true,
              detail: { open: nextOpen, ...details },
            })
          );

          if (accepted) this.open = nextOpen;
        },
        closeOnEscape: () => true,
        closeOnOutsideClick: () => false,
      });
      this.#menu.setPopupElement(this);
      this.#cleanupParentRegistration = parentMenu.registerSubmenu(this.#menu);
      const signal = this.#disconnect?.signal;

      if (signal) this.#menu.input.subscribe(() => this.requestUpdate(), { signal });

      this.#menu.syncOpen(this.open);
    } else {
      this.#ownsMenu = false;
      this.#menu = root.menu;
    }

    this.#cleanupRegistration = root.popup.registerContent({
      menu: this.#menu,
      parent: parentMenu,
      element: this,
    });
  }

  #cleanupMenu(): void {
    this.#cleanupRegistration?.();
    this.#cleanupRegistration = null;
    this.#cleanupParentRegistration?.();
    this.#cleanupParentRegistration = null;
    this.#setOptionParent(null);
    this.#clearOptionState();
    this.#optionStates.clear();
    this.#optionState = null;

    if (this.#ownsMenu) this.#menu?.destroy();

    this.#menu = null;
    this.#context = null;
    this.#rootMenu = null;
    this.#parentMenu = null;
    this.#ownsMenu = false;
    this.#wasActive = false;
  }

  #findTrigger(): HTMLElement | null {
    if (!this.id) return null;

    const root = this.getRootNode() as Document | ShadowRoot;

    return (
      [...root.querySelectorAll<HTMLElement>('[commandfor], media-menu-item')].find(
        (element) =>
          element.getAttribute('commandfor') === this.id ||
          (element as HTMLElement & { commandfor?: string }).commandfor === this.id
      ) ?? null
    );
  }

  /** Keep every page as a direct popup child, including authored nested pages. */
  #normalize(): void {
    const popup = this.closest('media-menu');
    if (!popup || this.parentElement === popup) return;

    this.#normalizing = true;
    popup.append(this);
    this.#normalizing = false;
  }

  #handleKeyDown = (event: UIKeyboardEvent): void => {
    const isNavigationKey = isMenuNavigationKey(event);
    const defaultPrevented = event.defaultPrevented;

    this.#menu?.contentProps.onKeyDown(event);

    if (this.#parentMenu && (event.key === 'ArrowLeft' || event.key === 'Escape') && !defaultPrevented) {
      event.preventDefault();
      this.#menu?.close('escape');
    }

    if (event.key !== 'Escape' && isNavigationKey) event.stopPropagation();
  };

  #handleFocusOut = (event: FocusEvent): void => {
    this.#menu?.contentProps.onFocusOut(event);
  };

  #setOptionState = (source: symbol, optionState: MenuOptionState | null): void => {
    const previous = this.#optionStates.get(source);
    if (optionState && isSameOptionState(previous, optionState)) return;

    if (!optionState && !previous) return;

    if (optionState) this.#optionStates.set(source, optionState);
    else this.#optionStates.delete(source);

    this.#optionState = resolveMenuOptionState(this.#optionStates.values());

    if ((this.#optionState?.disabled || this.#optionState?.hidden) && this.open && this.#parentMenu) {
      this.close('imperative-action');
    }

    this.#syncOptionState(this.#findTrigger());
    this.#optionParent?.setOptionState(this.#optionSource, this.#optionState);
  };

  #setOptionParent(parent: MenuContextValue | null): void {
    if (parent === this.#optionParent) return;

    this.#optionParent?.setOptionState(this.#optionSource, null);
    this.#optionParent = parent;
    this.#optionParent?.setOptionState(this.#optionSource, this.#optionState);
  }

  #syncOptionState(trigger: HTMLElement | null): void {
    if (trigger !== this.#stateTrigger) {
      this.#clearOptionState();
      this.#stateTrigger = trigger;
      this.#triggerWasDisabled = trigger ? isTriggerExplicitlyDisabled(trigger) : false;
      this.#triggerWasHidden = trigger?.hidden === true;
    }

    if (!trigger) return;

    const disabled = this.#optionState?.disabled || this.#triggerWasDisabled;

    applyElementProps(trigger, {
      disabled: disabled || undefined,
      'aria-disabled': disabled ? 'true' : undefined,
      'data-availability': this.#optionState?.availability,
      hidden: this.#triggerWasHidden || this.#optionState?.hidden || undefined,
    });
    const value = trigger.querySelector<HTMLElement>('[data-part~="value"], [data-part~="hint"]');

    if (value && value.textContent !== this.#optionState?.value) value.textContent = this.#optionState?.value ?? '';
  }

  #clearOptionState(): void {
    const trigger = this.#stateTrigger;
    if (!trigger) return;

    applyElementProps(trigger, {
      disabled: this.#triggerWasDisabled || undefined,
      'aria-disabled': this.#triggerWasDisabled ? 'true' : undefined,
      'data-availability': undefined,
      hidden: this.#triggerWasHidden || undefined,
    });
    const value = trigger.querySelector<HTMLElement>('[data-part~="value"], [data-part~="hint"]');

    if (value?.textContent) value.textContent = '';

    this.#stateTrigger = null;
    this.#triggerWasDisabled = false;
    this.#triggerWasHidden = false;
  }
}

function isSameOptionState(a: MenuOptionState | undefined, b: MenuOptionState): boolean {
  return (
    a?.value === b.value && a.disabled === b.disabled && a.hidden === b.hidden && a.availability === b.availability
  );
}

function isTriggerExplicitlyDisabled(trigger: HTMLElement): boolean {
  return (
    trigger.hasAttribute('disabled') ||
    ('disabled' in trigger && (trigger as HTMLElement & { disabled?: boolean }).disabled === true)
  );
}
