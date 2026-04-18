'use client';

import type { InferComponentState, InferMediaState, MediaButtonComponent, StateAttrMap } from '@videojs/core';
import { logMissingFeature } from '@videojs/core/dom';
import type { Selector } from '@videojs/store';
import type { ForwardedRef, ForwardRefExoticComponent, RefAttributes } from 'react';
import { forwardRef, useLayoutEffect, useState } from 'react';

import { usePlayer } from '../player/context';
import type { renderElement as renderElementFn } from '../utils/use-render';
import { renderElement } from '../utils/use-render';
import { useButton } from './hooks/use-button';
import { useAriaKeyShortcuts } from './hotkey/use-aria-key-shortcuts';
import { useOptionalTooltipContext } from './tooltip/context';

interface MediaButtonConfig<Core extends Required<MediaButtonComponent>> {
  displayName: string;
  core: { new (): Core; defaultProps: Record<string, unknown> };
  stateAttrMap: StateAttrMap<InferComponentState<Core>>;
  selector: Selector<object, InferMediaState<Core> | undefined>;
  action: (core: Core, state: InferMediaState<Core>) => void;
  hotkeyAction?: string;
  isSupported?: (state: InferComponentState<Core>) => boolean;
}

/** Creates a media button React component from a core class and config. */
export function createMediaButton<Core extends Required<MediaButtonComponent>, Props extends object>(
  config: MediaButtonConfig<Core>
): ForwardRefExoticComponent<Props & RefAttributes<HTMLButtonElement>> {
  const { displayName, core: CoreClass, stateAttrMap, selector, action, hotkeyAction, isSupported } = config;

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

    const tooltipCtx = useOptionalTooltipContext();
    const feature = usePlayer(selector);
    const shortcuts = useAriaKeyShortcuts(hotkeyAction);

    const [core] = useState(() => new CoreClass());
    core.setProps(coreProps);

    const { getButtonProps, buttonRef } = useButton({
      displayName,
      onActivate: () => action(core, feature!),
      isDisabled: () => !!coreProps.disabled || !feature,
    });

    // Derive state and label before the hooks boundary so the
    // useLayoutEffect below (called unconditionally) can reference them.
    type State = InferComponentState<Core>;
    if (feature) core.setMedia(feature);
    const state = feature ? (core.getState() as State) : null;
    const label = state ? core.getLabel(state) : undefined;

    // Forward label to tooltip popup content when inside a Tooltip.Root.
    useLayoutEffect(() => {
      if (!tooltipCtx) return;
      tooltipCtx.setContent(label);
      return () => tooltipCtx.setContent(undefined);
    }, [tooltipCtx, label]);

    if (!feature) {
      if (__DEV__) logMissingFeature(displayName, selector.displayName ?? displayName);
      return null;
    }

    if (!state) {
      return null;
    }

    if (isSupported && !isSupported(state)) {
      return null;
    }

    const attrs = { ...core.getAttrs(state), 'aria-keyshortcuts': shortcuts };

    return renderElement(
      'button',
      { render, className, style } as renderElementFn.ComponentProps<InferComponentState<Core>>,
      {
        state,
        stateAttrMap,
        ref: [forwardedRef, buttonRef],
        props: [attrs, elementProps, getButtonProps()],
      }
    );
  });

  Component.displayName = displayName;

  return Component as unknown as ForwardRefExoticComponent<Props & RefAttributes<HTMLButtonElement>>;
}
