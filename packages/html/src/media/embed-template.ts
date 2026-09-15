import { serializeAttributes } from '@videojs/utils/dom';
import { escapeHtml } from '@videojs/utils/string';

export interface EmbedTemplateOptions {
  /** The embed URL, or an empty string to leave `src` off until the adapter builds one. */
  src: string;
  /** The `allow` feature policy for the frame. */
  allow: string;
  /** Further attributes on the frame, such as `sandbox` or `title`. An empty string renders a boolean attribute. */
  attributes?: Record<string, string>;
  /** How the host sizes itself. Landscape embeds start inline at 300x150. */
  host?: { display?: 'inline-block' | 'block'; minWidth?: string; minHeight?: string };
  /**
   * The CSS rule for a host without `controls`. A cross-origin frame swallows every pointer event, so by default the
   * frame leaves hit-testing and the skin above it sees the hover that reveals the controls.
   */
  withoutControls?: string;
}

/**
 * The shadow template every iframe embed renders: a frame filling the host, with the provider's URL and feature policy.
 * Embeds pass what differs and keep the rest in one place.
 */
export function embedTemplate({
  src,
  allow,
  attributes = {},
  host = {},
  withoutControls,
}: EmbedTemplateOptions): string {
  const { display = 'inline-block', minWidth = '300px', minHeight = '150px' } = host;
  const frame = serializeAttributes({
    part: 'iframe',
    ...(src && { src }),
    allow,
    frameborder: '0',
    width: '100%',
    height: '100%',
    ...attributes,
  });

  return /*html*/ `
    <style>
      :host {
        display: ${display};
        min-width: ${escapeHtml(minWidth)};
        min-height: ${escapeHtml(minHeight)};
        position: relative;
      }
      iframe {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        border: 0;
      }
      ${withoutControls ?? ':host(:not([controls])) { pointer-events: none; }'}
    </style>
    <iframe${frame}></iframe>
  `;
}
