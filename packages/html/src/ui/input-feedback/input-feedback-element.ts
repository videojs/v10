import {
  getInputFeedbackItemDefinition,
  getInputFeedbackItemState,
  getInputFeedbackPredictedVolumeState,
  getInputFeedbackRootDerivedState,
  INPUT_FEEDBACK_GROUP_ACTIONS,
  InputFeedbackCore,
  type InputFeedbackDataState,
  type InputFeedbackEvent,
  type InputFeedbackGroup,
  type InputFeedbackItemDefinition,
  isInputFeedbackAction,
} from '@videojs/core';
import {
  getGestureCoordinator,
  getHotkeyCoordinator,
  selectFullscreen,
  selectPiP,
  selectPlayback,
  selectTextTrack,
  selectTime,
  selectVolume,
} from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';
import { ContextConsumer, ContextProvider } from '@videojs/element/context';

import { containerContext, playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../media-element';
import { inputFeedbackContext } from './context';

export class InputFeedbackElement extends MediaElement {
  static readonly tagName = 'media-input-feedback';

  readonly #core = new InputFeedbackCore();
  readonly #player = new PlayerController(this, playerContext);
  readonly #volume = new PlayerController(this, playerContext, selectVolume);
  readonly #provider = new ContextProvider(this, { context: inputFeedbackContext });

  readonly #container = new ContextConsumer(this, {
    context: containerContext,
    callback: () => this.#reconnect(),
    subscribe: true,
  });

  #disconnect: AbortController | null = null;
  #gestureUnsubscribe: (() => void) | null = null;
  #hotkeyUnsubscribe: (() => void) | null = null;
  #itemTemplates: InputFeedbackItemTemplate[] = [];
  #liveItems = new Map<string, HTMLElement>();

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.destroyed) return;

    if (this.#itemTemplates.length === 0) {
      this.#collectItemTemplates();
    }

    this.#disconnect = new AbortController();

    this.#core.state.subscribe(() => this.requestUpdate(), {
      signal: this.#disconnect.signal,
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#gestureUnsubscribe?.();
    this.#gestureUnsubscribe = null;
    this.#hotkeyUnsubscribe?.();
    this.#hotkeyUnsubscribe = null;
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  override destroyCallback(): void {
    this.#gestureUnsubscribe?.();
    this.#hotkeyUnsubscribe?.();
    this.#core.destroy();
    super.destroyCallback();
  }

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);

    const state = this.#core.state.current;
    const renderState = {
      ...state,
      transitionStarting: false,
      transitionEnding: false,
    };
    const volume = this.#volume.value;
    const store = this.#player.value;
    const playback = store ? selectPlayback(store.state) : undefined;
    const textTrack = store ? selectTextTrack(store.state) : undefined;
    const time = store ? selectTime(store.state) : undefined;
    const rootDerivedState = getInputFeedbackRootDerivedState(renderState, this.#core.labels, {
      playback,
      textTrack,
      time,
      volume,
    });

    this.#provider.setValue({
      state: renderState,
      ...rootDerivedState,
    });

    this.#syncLiveItems(renderState, rootDerivedState.currentVolumeLevel);
  }

  #reconnect(): void {
    this.#gestureUnsubscribe?.();
    this.#hotkeyUnsubscribe?.();
    this.#gestureUnsubscribe = null;
    this.#hotkeyUnsubscribe = null;

    const container = this.#container.value?.container;
    if (!container) return;

    const handleEvent = (event: InputFeedbackEvent) => {
      const store = this.#player.value;
      const predictedVolume = getInputFeedbackPredictedVolumeState(
        event,
        this.#core.state.current,
        store ? selectVolume(store.state) : undefined
      );

      this.#core.processEvent(event, {
        paused: store ? selectPlayback(store.state)?.paused : undefined,
        volume: predictedVolume?.volume,
        muted: predictedVolume?.muted,
        fullscreen: store ? selectFullscreen(store.state)?.fullscreen : undefined,
        subtitlesShowing: store ? selectTextTrack(store.state)?.subtitlesShowing : undefined,
        pip: store ? selectPiP(store.state)?.pip : undefined,
        currentTime: store ? selectTime(store.state)?.currentTime : undefined,
        duration: store ? selectTime(store.state)?.duration : undefined,
      });
    };

    this.#gestureUnsubscribe = getGestureCoordinator(container).subscribe(handleEvent);
    this.#hotkeyUnsubscribe = getHotkeyCoordinator(container).subscribe(handleEvent);
  }

  #collectItemTemplates(): void {
    const templates = Array.from(this.children).filter(isInputFeedbackItemTemplateElement);

    this.#itemTemplates = templates.flatMap((templateEl, index) => {
      const actionAttr = templateEl.getAttribute('action');
      const groupAttr = templateEl.getAttribute('group');
      const action = isInputFeedbackAction(actionAttr) ? actionAttr : undefined;
      const group = isInputFeedbackGroup(groupAttr) ? groupAttr : undefined;
      const definition = getInputFeedbackItemDefinition(action, group);

      templateEl.remove();

      if (!definition) {
        return [];
      }

      return [
        {
          definition,
          id: `${index}`,
          index,
          template: templateEl.cloneNode(true) as HTMLElement,
        },
      ];
    });
  }

  #syncLiveItems(
    rootState: InputFeedbackDataState,
    currentVolumeLevel: ReturnType<typeof getInputFeedbackRootDerivedState>['currentVolumeLevel']
  ): void {
    for (const [id, element] of this.#liveItems) {
      if (!element.isConnected) {
        this.#liveItems.delete(id);
      }
    }

    for (const itemTemplate of this.#itemTemplates) {
      const currentItemState = getInputFeedbackItemState(rootState, itemTemplate.definition, currentVolumeLevel);

      if (!currentItemState.active || this.#liveItems.has(itemTemplate.id)) {
        continue;
      }

      const liveItem = itemTemplate.template.cloneNode(true) as HTMLElement;
      liveItem.setAttribute(INPUT_FEEDBACK_LIVE_ITEM_ATTR, '');
      this.#liveItems.set(itemTemplate.id, liveItem);

      const nextLiveItem = this.#itemTemplates
        .slice(itemTemplate.index + 1)
        .map((nextTemplate) => this.#liveItems.get(nextTemplate.id))
        .find((nextItem) => nextItem?.isConnected);

      if (nextLiveItem) {
        this.insertBefore(liveItem, nextLiveItem);
      } else {
        this.append(liveItem);
      }
    }
  }
}

interface InputFeedbackItemTemplate {
  definition: InputFeedbackItemDefinition;
  id: string;
  index: number;
  template: HTMLElement;
}

const INPUT_FEEDBACK_LIVE_ITEM_ATTR = 'data-input-feedback-live';

function isInputFeedbackItemTemplateElement(node: Element): node is HTMLElement {
  return node.tagName.toLowerCase() === 'media-input-feedback-item';
}

function isInputFeedbackGroup(value: string | null): value is InputFeedbackGroup {
  return value !== null && value in INPUT_FEEDBACK_GROUP_ACTIONS;
}
