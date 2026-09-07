/**
 * Mock custom media element factory.
 *
 * Exercises: composition through the factory. The builder reads nothing from this file; native attributes come from the
 * base adapters and CSS vars from templates.ts.
 */
import { commonTemplate, videoTemplate } from './templates';

// Stub — the builder parses the AST, it doesn't run the code.
// Mirrors the real CustomMediaElement factory signature: the target is the adapter's static `host`.
export function CustomMediaElement(Adapter: { readonly host: 'video' | 'audio' | 'iframe'; readonly defaultProps: object }) {
  class CustomMedia {
    static template = Adapter.host === 'video' ? videoTemplate : commonTemplate(Adapter.host);
    static shadowRootOptions = { mode: 'open' };
  }

  return CustomMedia;
}
