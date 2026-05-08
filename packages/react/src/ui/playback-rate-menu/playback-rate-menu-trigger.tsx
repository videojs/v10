'use client';

import { type PlaybackRateMenuCore, PlaybackRateMenuDataAttrs } from '@videojs/core';
import { isNull, isUndefined } from '@videojs/utils/predicate';
import type { ReactNode, Ref } from 'react';
import { forwardRef, isValidElement } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { MenuTrigger } from '../menu/menu-trigger';
import { usePlaybackRateMenuContext } from './context';

export interface PlaybackRateMenuTriggerProps extends UIComponentProps<'button', PlaybackRateMenuCore.State> {}

function hasChildren(children: ReactNode): boolean {
  return !isUndefined(children) && !isNull(children) && children !== false;
}

export const PlaybackRateMenuTrigger = forwardRef<HTMLButtonElement | HTMLDivElement, PlaybackRateMenuTriggerProps>(
  function PlaybackRateMenuTrigger({ render, className, style, children, disabled, ...elementProps }, forwardedRef) {
    const { core, state } = usePlaybackRateMenuContext();
    const isDisabled = state.disabled || Boolean(disabled);
    const renderedChildren = isValidElement<{ children?: ReactNode }>(render) ? render.props.children : undefined;
    const hasOwnChildren = !isUndefined(children);
    const hasRenderedChildren = !isUndefined(renderedChildren);
    const triggerChildren = hasOwnChildren ? children : hasRenderedChildren ? undefined : core.getRateLabel(state.rate);
    const childrenProps = !isUndefined(triggerChildren) ? { children: triggerChildren } : undefined;
    const inlineLabelProps =
      hasChildren(triggerChildren) || hasChildren(renderedChildren) ? { 'data-inline-rate-label': '' } : undefined;

    return (
      <MenuTrigger
        disabled={isDisabled}
        render={(menuProps) => {
          const isSubmenuTrigger = menuProps.role === 'menuitem';
          const element = isSubmenuTrigger ? 'div' : 'button';
          const disabledProps = isSubmenuTrigger ? undefined : { disabled: isDisabled };

          return renderElement(
            element,
            { render, className, style },
            {
              state,
              stateAttrMap: PlaybackRateMenuDataAttrs,
              ref: [forwardedRef as Ref<HTMLButtonElement & HTMLDivElement>],
              props: [menuProps, core.getAttrs(state), elementProps, disabledProps, inlineLabelProps, childrenProps],
            }
          );
        }}
      />
    );
  }
);

export namespace PlaybackRateMenuTrigger {
  export type Props = PlaybackRateMenuTriggerProps;
  export type State = PlaybackRateMenuCore.State;
}
