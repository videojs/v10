'use client';

import type { InferComponentState, InferMediaState, MediaUIComponent, StateAttrMap } from '@videojs/core';
import { logMissingFeature } from '@videojs/core/dom';
import type { Selector } from '@videojs/store';
import type { ForwardedRef, ForwardRefExoticComponent, RefAttributes } from 'react';
import { forwardRef, useState } from 'react';

import { usePlayer } from '../player/context';
import type { renderElement as renderElementFn } from '../utils/use-render';
import { renderElement } from '../utils/use-render';
import { useButton } from './hooks/use-button';

interface MediaButtonConfig<Core extends Required<MediaUIComponent>> {
  displayName: string;
  core: { new (): Core; defaultProps: Record<string, unknown> };
  stateAttrMap: StateAttrMap<InferComponentState<Core>>;
  selector: Selector<object, InferMediaState<Core> | undefined>;
  action: (core: Core, state: InferMediaState<Core>) => void;
}

/** Creates a media button React component from a core class and config. */
export function createMediaButton<Core extends Required<MediaUIComponent>, Props extends object>(
  config: MediaButtonConfig<Core>
): ForwardRefExoticComponent<Props & RefAttributes<HTMLButtonElement>> {
  const { displayName, core: CoreClass, stateAttrMap, selector, action } = config;

  // Props that exist in the core's defaultProps are routed to setProps; the rest go to the DOM element.
  const corePropKeys = new Set(Object.keys(CoreClass.defaultProps));

  const Component = forwardRef(function MediaButton(
    componentProps: Record<string, unknown>,
    forwardedRef: ForwardedRef<HTMLButtonElement>
  ) {
    const { render, className, style, ...rest } = componentProps;

    const coreProps: Record<string, unknown> = {};
    const elementProps: Record<string, unknown> = {};

    for (const key of Object.keys(rest)) {
      if (corePropKeys.has(key)) {
        coreProps[key] = rest[key];
      } else {
        elementProps[key] = rest[key];
      }
    }

    const feature = usePlayer(selector);

    const [core] = useState(() => new CoreClass());
    core.setProps(coreProps);

    const { getButtonProps, buttonRef } = useButton({
      displayName,
      onActivate: () => action(core, feature!),
      isDisabled: () => !!coreProps.disabled || !feature,
    });

    if (!feature) {
      if (__DEV__) logMissingFeature(displayName, selector.displayName ?? displayName);
      return null;
    }

    type State = InferComponentState<Core>;

    core.setMedia(feature);
    const state = core.getState() as State;

    return renderElement(
      'button',
      { render, className, style } as renderElementFn.ComponentProps<InferComponentState<Core>>,
      {
        state,
        stateAttrMap,
        ref: [forwardedRef, buttonRef],
        props: [core.getAttrs(state), elementProps, getButtonProps()],
      }
    );
  });

  Component.displayName = displayName;

  return Component as unknown as ForwardRefExoticComponent<Props & RefAttributes<HTMLButtonElement>>;
}
