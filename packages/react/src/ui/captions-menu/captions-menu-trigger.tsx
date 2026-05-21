'use client';

import { type CaptionsMenuCore, CaptionsMenuDataAttrs } from '@videojs/core';
import { isFunction, isNull, isUndefined } from '@videojs/utils/predicate';
import type { ReactNode, Ref } from 'react';
import { forwardRef, isValidElement } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { MenuTrigger } from '../menu/menu-trigger';
import { useCaptionsMenuContext } from './context';

export interface CaptionsMenuTriggerProps extends UIComponentProps<'button', CaptionsMenuCore.State> {}

function hasChildren(children: ReactNode): boolean {
  return !isUndefined(children) && !isNull(children) && children !== false;
}

export const CaptionsMenuTrigger = forwardRef<HTMLButtonElement | HTMLDivElement, CaptionsMenuTriggerProps>(
  function CaptionsMenuTrigger({ render, className, style, children, disabled, ...elementProps }, forwardedRef) {
    const { core, state } = useCaptionsMenuContext();
    const isDisabled = state.disabled || Boolean(disabled);
    const renderedChildren = isValidElement<{ children?: ReactNode }>(render) ? render.props.children : undefined;
    const hasOwnChildren = !isUndefined(children);
    const hasRenderedChildren = !isUndefined(renderedChildren);
    const triggerChildren = hasOwnChildren
      ? children
      : hasRenderedChildren
        ? undefined
        : isFunction(render)
          ? undefined
          : state.label;
    const childrenProps = hasChildren(triggerChildren) ? { children: triggerChildren } : undefined;

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
              stateAttrMap: CaptionsMenuDataAttrs,
              ref: [forwardedRef as Ref<HTMLButtonElement & HTMLDivElement>],
              props: [menuProps, core.getAttrs(state), elementProps, disabledProps, childrenProps],
            }
          );
        }}
      />
    );
  }
);

export namespace CaptionsMenuTrigger {
  export type Props = CaptionsMenuTriggerProps;
  export type State = CaptionsMenuCore.State;
}
