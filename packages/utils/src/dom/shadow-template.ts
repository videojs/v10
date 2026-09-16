/** A function that renders an HTML string from a context value. */
export type ShadowTemplateFunction<Context> = (context: Context) => string;

/** Configuration for rendering a string template into an element's shadow root. */
export interface RenderShadowTemplateOptions<Context> {
  readonly template: ShadowTemplateFunction<Context>;
  readonly context: Context;
  readonly shadowRootOptions?: ShadowRootInit;
}

/**
 * Render a string template into a new shadow root with `innerHTML`. Escape any untrusted values interpolated by the
 * template. An existing root, such as a declarative shadow root, is left unchanged.
 *
 * Use {@link renderTemplate} instead when the static template is an `HTMLTemplateElement`.
 */
export function renderShadowTemplate<Context>(
  element: HTMLElement,
  { template, context, shadowRootOptions = { mode: 'open' } }: RenderShadowTemplateOptions<Context>
): ShadowRoot {
  if (element.shadowRoot) return element.shadowRoot;

  const root = element.attachShadow(shadowRootOptions);

  root.innerHTML = template(context);

  return root;
}
