'use client';

import type { InferMediaState, StateAttrMap, UICore } from '@videojs/core';
import { logMissingFeature } from '@videojs/core/dom';
import type { Selector } from '@videojs/store';
import type { ForwardedRef, ForwardRefExoticComponent, RefAttributes } from 'react';
import { forwardRef, useState } from 'react';

import { usePlayer } from '../player/context';
import { renderElement } from '../utils/use-render';
import { useButton } from './hooks/use-button';

interface MediaButtonConfig<Core extends UICore> {
  displayName: string;
  core: { new (): Core; defaultProps: Record<string, unknown> };
  stateAttrMap: StateAttrMap<object>;
  selector: Selector<object, InferMediaState<Core> | undefined> & { displayName?: string };
  action: (core: Core, state: InferMediaState<Core>) => void;
}

/**
 * Creates a media button React component. Curried so `ComponentProps` is explicit
 * while `Core` is inferred from the config.
 */
export function createMediaButton<ComponentProps extends object>() {
  return <Core extends Required<UICore>>(
    config: MediaButtonConfig<Core>
  ): ForwardRefExoticComponent<ComponentProps & RefAttributes<HTMLButtonElement>> => {
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

      const state = core.getState(feature) as object & Record<string, unknown>;

      return renderElement('button', { render, className, style } as Parameters<typeof renderElement>[1], {
        state,
        stateAttrMap,
        ref: [forwardedRef, buttonRef],
        props: [core.getAttrs(state), elementProps, getButtonProps()],
      });
    });

    Component.displayName = displayName;

    return Component as unknown as ForwardRefExoticComponent<ComponentProps & RefAttributes<HTMLButtonElement>>;
  };
}
