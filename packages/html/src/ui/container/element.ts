import { ContainerCore, ContainerDataAttrs } from '@videojs/core';
import {
  applyContainerAttrs,
  applyStateDataAttrs,
  createPopupGroup,
  focusContainer,
  type MediaContainer,
  selectControls,
} from '@videojs/core/dom';
import { labelText } from '@videojs/core/i18n/text/container';
import type { PropertyValues } from '@videojs/element';
import { ContextConsumer, ContextProvider } from '@videojs/element/context';
import { listen } from '@videojs/utils/dom';

import { i18nContext } from '../../i18n/context';
import { I18nController } from '../../i18n/controller';
import { type ContainerContextValue, containerContext, playerContext } from '../../player/context';
import { PlayerController } from '../../player/controller';
import { popupGroupContext } from '../../player/popup-group-context';
import { UIElement } from '../ui-element';

const sourceIdAttributes = [
  'aria-controls',
  'aria-describedby',
  'aria-labelledby',
  'aria-owns',
  'commandfor',
  'for',
  'popovertarget',
  'trigger',
] as const;
let sourceIdScope = 0;

/**
 * The visual, interactive player boundary.
 *
 * A container registers itself with its closest player and provides popup coordination to the controls it contains.
 */
export class ContainerElement extends UIElement implements MediaContainer {
  static readonly tagName = 'media-container';

  #releaseContainer: (() => void) | null = null;
  #disconnect: AbortController | null = null;
  #label: string | null = null;
  #sourceIdObserver: MutationObserver | null = null;
  #sourceIdPrefix: string | null = null;
  readonly #sourceIds = new Map<string, string>();

  readonly #core = new ContainerCore();
  readonly #controls = new PlayerController(this, playerContext, selectControls);
  readonly #i18n = new I18nController(this, i18nContext);
  readonly #popupGroup = createPopupGroup();
  readonly #popupGroupProvider = new ContextProvider(this, {
    context: popupGroupContext,
    initialValue: this.#popupGroup,
  });
  readonly #container = new ContextConsumer(this, {
    context: containerContext,
    callback: (value) => this.#register(value),
  });

  override connectedCallback(): void {
    this.#scopeSourceIds();
    super.connectedCallback();

    this.#popupGroupProvider.setValue(this.#popupGroup);
    this.#register(this.#container.value);
    applyContainerAttrs(this);
    this.#applyLabel();

    this.#disconnect = new AbortController();
    listen(this, 'pointerup', this.#onPointerUp, { signal: this.#disconnect.signal });
  }

  override disconnectedCallback(): void {
    this.#releaseContainer?.();
    this.#releaseContainer = null;
    this.#disconnect?.abort();
    this.#disconnect = null;
    this.#sourceIdObserver?.disconnect();
    this.#sourceIdObserver = null;
    super.disconnectedCallback();
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);
    this.#applyLabel();

    const controls = this.#controls.value;

    if (controls) {
      this.#core.setMedia(controls);
      applyStateDataAttrs(this, this.#core.getState(), ContainerDataAttrs);
    } else {
      this.removeAttribute(ContainerDataAttrs.controlsVisible);
    }
  }

  #register(value: ContainerContextValue | undefined): void {
    this.#releaseContainer?.();
    this.#releaseContainer = null;

    if (this.isConnected && value) {
      this.#releaseContainer = value.registerContainer(this);
    }
  }

  #applyLabel(): void {
    const current = this.getAttribute('aria-label');
    if (current && current !== this.#label) return;

    if (this.hasAttribute('aria-labelledby')) {
      if (current === this.#label) {
        this.removeAttribute('aria-label');
        this.#label = null;
      }

      return;
    }

    const label = this.#i18n.value(labelText);

    this.setAttribute('aria-label', label);
    this.#label = label;
  }

  /** Keep build-time IDs in copied light-DOM skins unique when a page renders more than one player. */
  #scopeSourceIds(roots: readonly ParentNode[] = [this]): void {
    if (!this.hasAttribute('data-vjs-scope-ids')) return;

    this.#sourceIdPrefix ??= `vjs-source-${sourceIdScope++}`;

    if (!this.#sourceIdObserver) {
      this.#sourceIdObserver = new MutationObserver((records) => {
        const addedRoots = records.flatMap((record) =>
          [...record.addedNodes].filter(
            (node): node is ParentNode =>
              node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.DOCUMENT_FRAGMENT_NODE
          )
        );

        if (addedRoots.length > 0) this.#scopeSourceIds(addedRoots);
      });
      this.#sourceIdObserver.observe(this, { childList: true, subtree: true });
    }

    const sourceElements = roots.flatMap((root) => [
      ...(root instanceof HTMLElement && root.matches('[data-vjs-source-id][id]') ? [root] : []),
      ...root.querySelectorAll<HTMLElement>('[data-vjs-source-id][id]'),
    ]);
    if (sourceElements.length === 0) return;

    for (const element of sourceElements) {
      const id = element.id;
      const scopedId = `${this.#sourceIdPrefix}-${id.slice(4)}`;

      this.#sourceIds.set(id, scopedId);
      element.id = scopedId;
      element.removeAttribute('data-vjs-source-id');
    }

    for (const element of this.querySelectorAll<HTMLElement>(sourceIdAttributes.map((name) => `[${name}]`).join(','))) {
      for (const attribute of sourceIdAttributes) {
        const value = element.getAttribute(attribute);
        if (!value) continue;

        const scopedValue = value
          .split(/\s+/)
          .map((id) => this.#sourceIds.get(id) ?? id)
          .join(' ');

        if (scopedValue !== value) element.setAttribute(attribute, scopedValue);
      }
    }
  }

  #onPointerUp = (): void => {
    focusContainer(this);
  };
}
