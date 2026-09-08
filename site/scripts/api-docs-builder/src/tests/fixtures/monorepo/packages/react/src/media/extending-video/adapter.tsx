/**
 * Mock React media component built with the `createMediaComponent` factory.
 *
 * Exercises: the factory takes the adapter and a render callback, so the
 * builder reads the target from the element the callback returns and the
 * defaults from the adapter's `static defaultProps` — which here spreads the
 * parent host's static (mirrors HlsJsVideo over HlsJsAdapter, and MuxVideo's inheritance).
 */
import { ExtendingHost } from '../../../../media/src/dom/extending';

declare function createMediaComponent(adapter: object, render: (args: any) => unknown): unknown;

export const ExtendingVideo = createMediaComponent(ExtendingHost, ({ props, children, ref }) => (
  <video {...props} ref={ref}>
    {children}
  </video>
));
