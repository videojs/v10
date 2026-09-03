'use client';

import type { EngineAdapter, Media } from '@videojs/media';
import type {
  AudioHTMLAttributes,
  ForwardRefExoticComponent,
  HTMLAttributes,
  IframeHTMLAttributes,
  PropsWithoutRef,
  ReactNode,
  RefAttributes,
  RefCallback,
  VideoHTMLAttributes,
} from 'react';
import { forwardRef, useState } from 'react';

import { useAttachMedia } from '../utils/use-attach-media';
import { useComposedRefs } from '../utils/use-composed-refs';
import { useMediaInstance } from '../utils/use-media-instance';
import { useSyncProps } from '../utils/use-sync-props';

/** An adapter class: constructible without arguments, attachable to a target, with its defaults as a static. */
export interface MediaAdapterConstructor {
  new (): Media & EngineAdapter;
  readonly defaultProps: object;
}

/** The element an adapter attaches to, read off its `attach()` signature. */
export type MediaAdapterTarget<Adapter extends MediaAdapterConstructor> =
  InstanceType<Adapter> extends { attach(target: infer Target): unknown } ? NonNullable<Target> : never;

/** The adapter's props: the keys of its static `defaultProps`. */
export type MediaAdapterProps<Adapter extends MediaAdapterConstructor> = Adapter['defaultProps'];

/** The native attributes of the element an adapter attaches to. */
export type MediaTargetAttributes<Target> = Target extends HTMLIFrameElement
  ? IframeHTMLAttributes<HTMLIFrameElement>
  : Target extends { readonly videoWidth: number }
    ? VideoHTMLAttributes<HTMLVideoElement>
    : Target extends { readonly volume: number }
      ? AudioHTMLAttributes<HTMLAudioElement>
      : HTMLAttributes<HTMLElement>;

/** Props of a component built by `createMediaComponent`: the target's attributes plus the adapter's props. */
export type MediaComponentProps<Adapter extends MediaAdapterConstructor> = Omit<
  MediaTargetAttributes<MediaAdapterTarget<Adapter>>,
  keyof MediaAdapterProps<Adapter>
> &
  Partial<MediaAdapterProps<Adapter>> & {
    children?: ReactNode;
  };

/** What the render callback receives on every render. */
export interface MediaRenderArgs<Adapter extends MediaAdapterConstructor> {
  /** The adapter instance, already synced with this render's props. */
  adapter: InstanceType<Adapter>;
  /** Props left after the adapter's were synced onto it: the native attributes to spread on the target. */
  props: Omit<MediaTargetAttributes<MediaAdapterTarget<Adapter>>, keyof MediaAdapterProps<Adapter>> &
    Record<string, unknown>;
  children: ReactNode;
  /** Attaches the adapter to the rendered target and forwards the consumer's ref. Put it on the target. */
  ref: RefCallback<MediaAdapterTarget<Adapter>>;
  /**
   * The adapter props from the first render, frozen. For values that must not change once rendered, such as an embed's
   * initial `src`, derive them from these rather than from `adapter`.
   */
  initialProps: Readonly<Partial<MediaAdapterProps<Adapter>>>;
}

export type MediaRenderFunction<Adapter extends MediaAdapterConstructor> = (
  args: MediaRenderArgs<Adapter>
) => ReactNode;

/** A component built by `createMediaComponent`, forwarding its ref to the rendered target. */
export type MediaComponent<Adapter extends MediaAdapterConstructor> = ForwardRefExoticComponent<
  PropsWithoutRef<MediaComponentProps<Adapter>> & RefAttributes<MediaAdapterTarget<Adapter>>
>;

export interface MediaComponentOptions {
  /** Name shown in React DevTools. Defaults to the adapter's class name. */
  displayName?: string;
}

/**
 * Build a React component that drives a rendered target through an adapter and registers with the surrounding Player.
 *
 * The component creates one adapter instance, syncs the adapter's props from the React props of the same name (falling
 * back to `Adapter.defaultProps` when a prop is omitted), and calls `render` with the adapter, the remaining native
 * props, and a ref that attaches the adapter to whatever element it lands on. The target element is whatever `render`
 * returns: a `<video>`, an `<audio>`, or an embed's `<iframe>`. It is what the built-in `HlsJsVideo`, `MuxVideo`, and
 * `VimeoVideo` components are made of.
 *
 * @param Adapter - Adapter class with a static `defaultProps`, for example `HlsJsAdapter` from `@videojs/hlsjs-video`.
 * @param render - Renders the target element from the adapter, the native props, the children, and the attach ref.
 * @param options - `displayName` for React DevTools. Defaults to the adapter's class name.
 */
export function createMediaComponent<Adapter extends MediaAdapterConstructor>(
  Adapter: Adapter,
  render: MediaRenderFunction<Adapter>,
  options: MediaComponentOptions = {}
): MediaComponent<Adapter> {
  type Props = MediaAdapterProps<Adapter>;
  type Target = MediaAdapterTarget<Adapter>;

  const Component = forwardRef<Target, MediaComponentProps<Adapter>>(function MediaComponent(allProps, ref) {
    // The conditional attribute type keeps TypeScript from destructuring `children` off the generic props directly.
    const { children, ...props } = allProps as { children?: ReactNode } & Record<string, unknown>;
    const media = useMediaInstance(Adapter) as InstanceType<Adapter>;
    const attachRef = useAttachMedia<Target>(media);
    const composedRef = useComposedRefs(attachRef, ref);
    const [initialProps] = useState(() => Object.freeze({ ...props }) as Readonly<Partial<Props>>);
    const htmlProps = useSyncProps<Props, Record<string, unknown>>(
      media as Props,
      props as Partial<Props> & Record<string, unknown>,
      Adapter.defaultProps as Props
    );

    return render({
      adapter: media,
      props: htmlProps as MediaRenderArgs<Adapter>['props'],
      children,
      ref: composedRef,
      initialProps,
    });
  });

  if (__DEV__) Component.displayName = options.displayName ?? Adapter.name;

  return Component;
}
