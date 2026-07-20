'use client';

import type { InferComponentState, InferMediaState, MediaButtonComponent, StateAttrMap } from '@videojs/core';
import { logMissingFeature } from '@videojs/core/dom';
import { resolveTranslation } from '@videojs/core/i18n';
import type { Selector } from '@videojs/store';
import { isString, isUndefined } from '@videojs/utils/predicate';
import type { ForwardedRef, ForwardRefExoticComponent, RefAttributes } from 'react';
import { forwardRef, useLayoutEffect, useState } from 'react';

import { useTranslator } from '../i18n/context';
import { usePlayer } from '../player/context';
import type { renderElement as renderElementFn } from '../utils/use-render';
import { renderElement } from '../utils/use-render';
import { useButton } from './hooks/use-button';
import { useHotkeyShortcut } from './hotkey/use-hotkey-shortcut';
import { useOptionalMenuTriggerChildContext } from './menu/context';
import { useOptionalTooltipContext } from './tooltip/context';

interface MediaButtonConfig<Core extends Required<MediaButtonComponent>> {
  displayName: string;
  core: { new (): Core; defaultProps: Record<string, unknown> };
  stateAttrMap: StateAttrMap<InferComponentState<Core>>;
  selector: Selector<object, InferMediaState<Core> | undefined>;
  action: (core: Core, state: InferMediaState<Core>) => void;
  hotkeyAction?: string;
  hotkeyValue?: (props: Record<string, unknown>) => number | undefined;
  tooltipLabel?: (core: Core, state: InferComponentState<Core>) => string | undefined;
}

type LabelParams = Record<string, string | number>;
type LabelParamsCore<State> = {
  getLabelParams?: (state: State) => LabelParams | undefined;
};

function getLabelParams<Core extends MediaButtonComponent>(
  core: Core,
  state: InferComponentState<Core>
): LabelParams | undefined {
  return (core as LabelParamsCore<InferComponentState<Core>>).getLabelParams?.(state);
}

/** Creates a media button React component from a core class and config. */
export function createMediaButton<Core extends Required<MediaButtonComponent>, Props extends object>(
  config: MediaButtonConfig<Core>
): ForwardRefExoticComponent<Props & RefAttributes<HTMLButtonElement>> {
  const {
    displayName,
    core: CoreClass,
    stateAttrMap,
    selector,
    action,
    hotkeyAction,
    hotkeyValue,
    tooltipLabel,
  } = config;

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
    const menuTriggerChild = useOptionalMenuTriggerChildContext();
    const setTooltipContent = tooltipCtx?.setContent;
    const feature = usePlayer(selector);
    const shortcut = useHotkeyShortcut(hotkeyAction, hotkeyValue?.(coreProps));
    const translator = useTranslator();

    const [core] = useState(() => new CoreClass());

    if (corePropKeys.has('menuTrigger') && isUndefined(coreProps.menuTrigger)) {
      coreProps.menuTrigger = menuTriggerChild;
    }

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
    const label = state ? resolveTranslation(translator, core.getLabel(state), getLabelParams(core, state)) : undefined;
    const tooltipText = state ? (tooltipLabel?.(core, state) ?? label) : undefined;

    // Forward label to tooltip popup content when inside a Tooltip.Root.
    useLayoutEffect(() => {
      if (!setTooltipContent) return;
      setTooltipContent(tooltipText ? { label: tooltipText, shortcut: shortcut.shortcut } : undefined);
      return () => setTooltipContent(undefined);
    }, [setTooltipContent, tooltipText, shortcut.shortcut]);

    if (!feature || !state) {
      if (__DEV__) logMissingFeature(displayName, selector.displayName ?? displayName);
      return null;
    }

    const attrs = core.getAttrs(state) as Record<string, unknown>;
    const ariaLabel = attrs['aria-label'];
    const resolvedAttrs = {
      ...attrs,
      ...(isString(ariaLabel)
        ? { 'aria-label': resolveTranslation(translator, ariaLabel, getLabelParams(core, state)) }
        : undefined),
      'aria-keyshortcuts': shortcut.aria,
    };

    return renderElement(
      'button',
      { render, className, style } as renderElementFn.ComponentProps<InferComponentState<Core>>,
      {
        state,
        stateAttrMap,
        ref: [forwardedRef, buttonRef],
        props: [getButtonProps(), elementProps, resolvedAttrs],
      }
    );
  });

  Component.displayName = displayName;

  return Component as unknown as ForwardRefExoticComponent<Props & RefAttributes<HTMLButtonElement>>;
}
