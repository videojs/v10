import { noop } from '../function/noop';

export type ObservedElements = Element | Iterable<Element>;

/** Observe one or more elements for size changes and return a cleanup function. */
export function observeResize(elements: ObservedElements, callback: ResizeObserverCallback): () => void {
  if (typeof ResizeObserver === 'undefined') return noop;

  const observer = new ResizeObserver(callback);
  const targets = Symbol.iterator in Object(elements) ? (elements as Iterable<Element>) : [elements as Element];

  for (const element of targets) observer.observe(element);

  return () => observer.disconnect();
}

export interface ObserveElementsOptions {
  /** Resolve the current set of elements to resize-observe. */
  getElements: () => Iterable<Element>;
  /** Called when an observed element resizes or the configured root mutates. */
  onChange: () => void;
  /** Optional root whose mutations can change the observed element set. */
  root?: Node | undefined;
  /** Mutation options used to refresh the observed element set. */
  mutations?: MutationObserverInit | false | undefined;
}

/**
 * Observe a dynamically resolved element set. When the optional root mutates,
 * the set is resolved again before `onChange` is called.
 */
export function observeElements({ getElements, onChange, root, mutations }: ObserveElementsOptions): () => void {
  let stopObservingResize = noop;

  const observeCurrentElements = () => {
    stopObservingResize();
    stopObservingResize = observeResize(getElements(), onChange);
  };

  observeCurrentElements();

  let mutationObserver: MutationObserver | null = null;

  if (root && mutations !== false && typeof MutationObserver !== 'undefined') {
    mutationObserver = new MutationObserver(() => {
      observeCurrentElements();
      onChange();
    });
    mutationObserver.observe(root, mutations ?? { childList: true });
  }

  return () => {
    mutationObserver?.disconnect();
    stopObservingResize();
  };
}
