import { audioContentAttributes, type HostAttributeConfigs, videoContentAttributes } from './host-attributes';
import { MediaChildren } from './media-children';
import { renderHost } from './render-host';
import { elementTemplate, type MediaTemplate, videoTemplate } from './templates';

export interface MediaHostRenderAttributes {
  /** Every initial attribute observed by the media element. */
  readonly all: Record<string, string>;
  /** Initial target-native attributes not owned by the adapter. */
  readonly target: Record<string, string>;
}

/** Defines how a media element renders and manages the target attached to its playback adapter. */
export interface MediaElementHost<Target extends EventTarget = EventTarget> {
  /** Target-native attributes exposed on the outer custom element. */
  readonly attributes?: HostAttributeConfigs;
  /** Default template exposed on the generated element class. */
  readonly template?: MediaTemplate;
  /** Render the target from the element's initial attributes. */
  render(element: HTMLElement, attributes: MediaHostRenderAttributes): void;
  /** Resolve the target currently attached to the adapter. */
  target(element: HTMLElement): Target | null;
  /** Observe target replacement and return an optional cleanup callback. */
  observe?(element: HTMLElement, targetChanged: () => void): void | (() => void);
  /** Apply a changed target-native attribute. */
  attributeChanged?(target: Target, name: string, value: string | null): void;
  /** Run host-specific work when the outer element connects. */
  connected?(element: HTMLElement): void;
}

const targetElement = <Tag extends keyof HTMLElementTagNameMap>(element: HTMLElement, tag: Tag) =>
  element.querySelector<HTMLElementTagNameMap[Tag]>(`:scope > ${tag}[slot=media]`) ??
  element.querySelector<HTMLElementTagNameMap[Tag]>(`:scope > ${tag}`) ??
  element.shadowRoot?.querySelector<HTMLElementTagNameMap[Tag]>(tag) ??
  null;

const applyElementAttribute = (target: Element, name: string, value: string | null) => {
  if (value === null) {
    target.removeAttribute(name);
  } else if (target.getAttribute(name) !== value) {
    target.setAttribute(name, value);
  }
};

const nativeMediaHost = <Tag extends 'audio' | 'video'>(
  tag: Tag,
  attributes: HostAttributeConfigs,
  template: MediaTemplate
): MediaElementHost<HTMLElementTagNameMap[Tag]> => {
  const target = (element: HTMLElement) => targetElement(element, tag);

  return {
    attributes,
    template,
    render(element, renderAttributes) {
      renderHost(element, { part: tag, ...renderAttributes.target });
    },
    target,
    observe(element, targetChanged) {
      const children = new MediaChildren(element, () => target(element));
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
    attributeChanged: applyElementAttribute,
  };
};

/** Host policy for a native video target. */
export const videoHost = nativeMediaHost('video', videoContentAttributes, videoTemplate);

/** Host policy for a native audio target. */
export const audioHost = nativeMediaHost('audio', audioContentAttributes, elementTemplate('audio'));

/** Creates a host for an iframe-backed playback adapter. */
export const iframeHost = (template: MediaTemplate = elementTemplate('iframe')) => {
  const target = (element: HTMLElement) => targetElement(element, 'iframe');

  return {
    template,
    render(element: HTMLElement, attributes: MediaHostRenderAttributes) {
      renderHost(element, { part: 'iframe', ...attributes.all });
    },
    target,
    observe(element: HTMLElement, targetChanged: () => void) {
      element.shadowRoot?.addEventListener('slotchange', targetChanged);

      return () => element.shadowRoot?.removeEventListener('slotchange', targetChanged);
    },
    connected(element: HTMLElement) {
      element.setAttribute('data-cross-origin-frame', '');
    },
  } satisfies MediaElementHost<HTMLIFrameElement>;
};
