import type { DurationDisplayState } from '@videojs/store';
import { durationDisplayStateDefinition } from '@videojs/store';
import { formatDisplayTime } from '@videojs/utils';
import { namedNodeMapToObject } from '@videojs/utils/dom';
import type { ConnectedComponentConstructor, PropsHook, StateHook } from '../utils/component-factory';
import { toConnectedHTMLComponent } from '../utils/component-factory';

export function getTemplateHTML(
  this: typeof DurationDisplay,
  _attrs: Record<string, string>,
  _props: Record<string, any> = {}
) {
  return /* html */ `
    <span></span>
  `;
}

export class DurationDisplay extends HTMLElement {
  static shadowRootOptions = {
    mode: 'open' as ShadowRootMode,
  };

  static getTemplateHTML: typeof getTemplateHTML = getTemplateHTML;

  constructor() {
    super();

    if (!this.shadowRoot) {
      this.attachShadow((this.constructor as typeof DurationDisplay).shadowRootOptions);

      const attrs = namedNodeMapToObject(this.attributes);
      const html = (this.constructor as typeof DurationDisplay).getTemplateHTML(attrs);
      const shadowRoot = this.shadowRoot as unknown as ShadowRoot;
      shadowRoot.setHTMLUnsafe ? shadowRoot.setHTMLUnsafe(html) : (shadowRoot.innerHTML = html);
    }
  }

  _update(_props: any, state: DurationDisplayState): void {
    // Update the span content with formatted duration
    const spanElement = this.shadowRoot?.querySelector('span') as HTMLElement;
    if (spanElement) {
      spanElement.textContent = formatDisplayTime(state.duration);
    }
  }
}

export const getDurationDisplayState: StateHook<DurationDisplay, DurationDisplayState> = (_element, mediaStore) => {
  return {
    ...durationDisplayStateDefinition.stateTransform(mediaStore.getState()),
    // Duration display is read-only, so no request methods needed
  };
};

export const getDurationDisplayProps: PropsHook<DurationDisplay, DurationDisplayState> = (_element, _state) => {
  return {};
};

export const DurationDisplayElement: ConnectedComponentConstructor<DurationDisplay, DurationDisplayState> =
  toConnectedHTMLComponent(DurationDisplay, getDurationDisplayState, getDurationDisplayProps, 'DurationDisplay');
