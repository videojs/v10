import { isFunction } from '../predicate';

/** A function that renders an HTML string from a context value. */
export type ShadowTemplateFunction<Context> = (context: Context) => string;

/** Static element fields consumed by {@link renderShadowTemplate}. */
export interface ShadowTemplateConstructor<Context> {
  template: ShadowTemplateFunction<Context>;
  shadowRootOptions?: ShadowRootInit;
}

/**
 * Render an element's static template function into a new shadow root with `innerHTML`. Escape any untrusted values
 * interpolated by the template. An existing root, such as a declarative shadow root, is left unchanged.
 *
 * Use {@link renderTemplate} instead when the static template is an `HTMLTemplateElement`.
 */
export function renderShadowTemplate<Context>(element: HTMLElement, context: Context): ShadowRoot {
  if (element.shadowRoot) return element.shadowRoot;

  const unknownConstructor: unknown = element.constructor;
  // SAFETY: this helper's element contract requires these static fields on its constructor.
  const constructor = unknownConstructor as ShadowTemplateConstructor<Context>;

  if (!isFunction(constructor.template)) {
    throw new TypeError(
      '[videojs] renderShadowTemplate requires the element constructor to define a template function.'
    );
  }

  const { template, shadowRootOptions = { mode: 'open' } } = constructor;
  const root = element.attachShadow(shadowRootOptions);

  root.innerHTML = template(context);

  return root;
}
