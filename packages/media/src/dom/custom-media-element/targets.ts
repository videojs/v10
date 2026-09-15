import { renderShadowTemplate, setAttributeValue, type ShadowTemplateFunction } from '@videojs/utils/dom';

import { MediaChildren } from './media-children';
import { audioContentAttributes, type MediaAttributeDeclarations, videoContentAttributes } from './target-attributes';
import { elementTemplate, videoTemplate } from './templates';

export interface MediaTargetRenderContext<AdapterProps extends object = Record<string, unknown>> {
  /** Initial observed attributes from the outer media element. */
  readonly attributeValues: Record<string, string>;
  /** Initial attributes safe to render onto the adapter target. */
  readonly targetAttributeValues: Record<string, string>;
  /** Adapter defaults with initial content attributes parsed over them. */
  readonly adapterProps: AdapterProps;
}

/** Defines how a media element renders and manages the target attached to its playback adapter. */
export interface MediaTargetDefinition<
  Target extends EventTarget = EventTarget,
  AdapterProps extends object = Record<string, unknown>,
> {
  /** Target-native attributes exposed on the outer custom element. */
  readonly attributes?: MediaAttributeDeclarations;
  /** Default template exposed on the generated element class. */
  readonly template?: ShadowTemplateFunction<MediaTargetRenderContext<AdapterProps>>;
  /** Render the target from the element's initial attributes. */
  render(element: HTMLElement, context: MediaTargetRenderContext<AdapterProps>): void;
  /** Resolve the target currently attached to the adapter. */
  resolve(element: HTMLElement): Target | null;
  /** Observe target replacement and return an optional cleanup callback. */
  observe?(element: HTMLElement, targetChanged: () => void): void | (() => void);
  /** Apply a changed target-native attribute. */
  attributeChanged?(target: Target, name: string, value: string | null): void;
  /** Run target-specific work when the outer element connects. */
  connected?(element: HTMLElement): void;
}

const queryTargetElement = <Tag extends keyof HTMLElementTagNameMap>(element: HTMLElement, tag: Tag) =>
  element.querySelector<HTMLElementTagNameMap[Tag]>(`:scope > ${tag}[slot=media]`) ??
  element.querySelector<HTMLElementTagNameMap[Tag]>(`:scope > ${tag}`) ??
  element.shadowRoot?.querySelector<HTMLElementTagNameMap[Tag]>(tag) ??
  null;

const createNativeMediaTarget = <Tag extends 'audio' | 'video'>(
  tag: Tag,
  attributes: MediaAttributeDeclarations,
  template: ShadowTemplateFunction<Record<string, string>>
): MediaTargetDefinition<HTMLElementTagNameMap[Tag], object> => {
  const resolve = (element: HTMLElement) => queryTargetElement(element, tag);

  return {
    attributes,
    template: (context) => template({ part: tag, ...context.targetAttributeValues }),
    render(element, context) {
      renderShadowTemplate(element, context);
    },
    resolve,
    observe(element, targetChanged) {
      const children = new MediaChildren(element, () => resolve(element));
      const onSlotChange = () => {
        targetChanged();
        children.sync();
      };

      element.shadowRoot?.addEventListener('slotchange', onSlotChange);
      children.sync();

      return () => {
        element.shadowRoot?.removeEventListener('slotchange', onSlotChange);
        children.disconnect();
      };
    },
    attributeChanged: setAttributeValue,
  };
};

/** Target definition for a native video element. */
export const videoTarget = createNativeMediaTarget('video', videoContentAttributes, videoTemplate);

/** Target definition for a native audio element. */
export const audioTarget = createNativeMediaTarget('audio', audioContentAttributes, elementTemplate('audio'));

/** Creates a target definition for an iframe-backed playback adapter. */
export const iframeTarget = <AdapterProps extends object = Record<string, unknown>>(
  template: ShadowTemplateFunction<MediaTargetRenderContext<AdapterProps>> = (context) =>
    elementTemplate('iframe')({ part: 'iframe', ...context.attributeValues })
) => {
  const resolve = (element: HTMLElement) => queryTargetElement(element, 'iframe');

  return {
    template,
    render(element: HTMLElement, context: MediaTargetRenderContext<AdapterProps>) {
      renderShadowTemplate(element, context);
    },
    resolve,
    observe(element: HTMLElement, targetChanged: () => void) {
      element.shadowRoot?.addEventListener('slotchange', targetChanged);

      return () => element.shadowRoot?.removeEventListener('slotchange', targetChanged);
    },
    connected(element: HTMLElement) {
      element.setAttribute('data-cross-origin-frame', '');
    },
  } satisfies MediaTargetDefinition<HTMLIFrameElement, AdapterProps>;
};
