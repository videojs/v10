import { type CaptionsRadioGroupCore, CaptionsRadioGroupDataAttrs } from '@videojs/core';
import { getStateDataAttrs } from '@videojs/core/dom';
import { isFunction } from '@videojs/utils/predicate';
import type { ReactElement } from 'react';
import { Fragment, forwardRef } from 'react';

import type { HTMLProps, UIComponentProps } from '../../utils/types';
import { MenuRadioGroup } from '../menu/menu-radio-group';
import type { MenuRadioItemProps } from '../menu/menu-radio-item';
import { type CaptionsOption, type CaptionsOptionsProps, useCaptionsOptions } from './use-captions-options';

export type CaptionsRadioGroupItemState = CaptionsOption & {
  /** Whether this option is currently selected. */
  checked: boolean;
};

export interface CaptionsRadioGroupItemProps extends Omit<MenuRadioItemProps, 'ref'> {
  /** Text track value represented by the item. */
  'data-track': string;
}

export interface CaptionsRadioGroupProps
  extends Omit<UIComponentProps<'div', CaptionsRadioGroupCore.State>, 'children'>, CaptionsOptionsProps {
  /** Render one consumer-owned menu radio item for every captions option. */
  renderItem: (props: CaptionsRadioGroupItemProps, state: CaptionsRadioGroupItemState) => ReactElement;
}

/**
 * Renders menu radio items for the player's captions and subtitles tracks.
 *
 * @example
 *   ```tsx
 *   <CaptionsRadioGroup
 *     renderItem={(props, item) => (
 *       <Menu.RadioItem {...props}>
 *         {item.label}
 *         <Menu.ItemIndicator checked={item.checked} />
 *       </Menu.RadioItem>
 *     )}
 *   />;
 *   ```;
 */
export const CaptionsRadioGroup = forwardRef<HTMLDivElement, CaptionsRadioGroupProps>(
  function CaptionsRadioGroup(componentProps, forwardedRef) {
    const {
      renderItem,
      render,
      className,
      style,
      label,
      formatTrack,
      disabled,
      'aria-label': ariaLabelProp,
      'aria-labelledby': ariaLabelledBy,
      ...elementProps
    } = componentProps;
    const captions = useCaptionsOptions({ label, formatTrack, disabled });
    if (!captions) return null;

    const { state, value, options, setValue } = captions;
    const ariaLabel = ariaLabelProp ?? (ariaLabelledBy === undefined ? captions.label : undefined);

    return (
      <MenuRadioGroup
        {...getStateDataAttrs(state, CaptionsRadioGroupDataAttrs)}
        {...elementProps}
        ref={forwardedRef}
        className={isFunction(className) ? className(state) : className}
        style={isFunction(style) ? style(state) : style}
        render={isFunction(render) ? (props: HTMLProps) => render(props, state) : render}
        value={value}
        onValueChange={setValue}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-disabled={state.disabled || undefined}
        hidden={state.hidden}
      >
        {options.map((option) => {
          const itemState = { ...option, checked: option.value === value };

          return (
            <Fragment key={option.value}>
              {renderItem(
                {
                  value: option.value,
                  disabled: option.disabled,
                  'data-track': option.value,
                  children: option.label,
                },
                itemState
              )}
            </Fragment>
          );
        })}
      </MenuRadioGroup>
    );
  }
);

export namespace CaptionsRadioGroup {
  export type Props = CaptionsRadioGroupProps;
  export type State = CaptionsRadioGroupCore.State;
  export type ItemProps = CaptionsRadioGroupItemProps;
  export type ItemState = CaptionsRadioGroupItemState;
}
