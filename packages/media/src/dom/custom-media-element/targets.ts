import { setAttributeValue, type ShadowTemplateFunction } from '@videojs/utils/dom';

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
export interface MediaTargetDefinition<Target extends EventTarget = EventTarget> {
  /** Target-native attributes exposed on the outer custom element. */
  readonly attributes?: MediaAttributeDeclarations;
  /** Default template exposed on the generated element class. */
  readonly template?: ShadowTemplateFunction<MediaTargetRenderContext>;
  /** Resolve the target currently attached to the adapter. */
  resolve(element: HTMLElement): Target | null;
  /** Observe target replacement and return an optional cleanup callback. */
  observe?(element: HTMLElement, targetChanged: () => void): void | (() => void);
  /** Apply a changed target-native attribute. */
  attributeChanged?(target: Target, name: string, value: string | null): void;
  /** Run target-specific work when the outer element connects. */
  hostConnected?(element: HTMLElement): void;
}

const queryTargetElement = <Tag extends keyof HTMLElementTagNameMap>(element: HTMLElement, tag: Tag) =>
  element.querySelector<HTMLElementTagNameMap[Tag]>(`:scope > ${tag}[slot=media]`) ??
  element.querySelector<HTMLElementTagNameMap[Tag]>(`:scope > ${tag}`) ??
  element.shadowRoot?.querySelector<HTMLElementTagNameMap[Tag]>(tag) ??
  null;

interface NativeMediaTargetOptions<Tag extends 'audio' | 'video'> {
  readonly tag: Tag;
  readonly attributes: MediaAttributeDeclarations;
  readonly template: ShadowTemplateFunction<Record<string, string>>;
}

const createNativeMediaTarget = <Tag extends 'audio' | 'video'>({
  tag,
  attributes,
  template,
}: NativeMediaTargetOptions<Tag>): MediaTargetDefinition<HTMLElementTagNameMap[Tag]> => {
  const resolve = (element: HTMLElement) => queryTargetElement(element, tag);

  return {
    attributes,
    template: (context) => template({ part: tag, ...context.targetAttributeValues }),
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
export const videoTarget = createNativeMediaTarget({
  tag: 'video',
  attributes: videoContentAttributes,
  template: videoTemplate,
});

/** Target definition for a native audio element. */
export const audioTarget = createNativeMediaTarget({
  tag: 'audio',
  attributes: audioContentAttributes,
  template: elementTemplate('audio'),
});

/** Target definition for an iframe owned by an embed element. */
export const iframeTarget: MediaTargetDefinition<HTMLIFrameElement> = {
  template: () => '<iframe part="iframe"></iframe>',
  resolve: (element) => element.shadowRoot?.querySelector('iframe') ?? null,
  hostConnected(element) {
    element.setAttribute('data-cross-origin-frame', '');
  },
};
