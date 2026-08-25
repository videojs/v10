import { type PlaybackRateRadioGroupCore, PlaybackRateRadioGroupDataAttrs } from '@videojs/core';
import { getStateDataAttrs } from '@videojs/core/dom';
import { isFunction } from '@videojs/utils/predicate';
import type { ReactElement } from 'react';
import { Fragment, forwardRef } from 'react';

import type { HTMLProps, UIComponentProps } from '../../utils/types';
import { MenuRadioGroup } from '../menu/menu-radio-group';
import type { MenuRadioItemProps } from '../menu/menu-radio-item';
import {
  type PlaybackRateOption,
  type PlaybackRateOptionsProps,
  usePlaybackRateOptions,
} from '../playback-rate/use-playback-rate-options';

export type PlaybackRateRadioGroupItemState = PlaybackRateOption & {
  /** Whether this playback rate is currently selected. */
  checked: boolean;
};

export interface PlaybackRateRadioGroupItemProps extends Omit<MenuRadioItemProps, 'ref'> {
  /** Playback rate represented by the item. */
  'data-rate': string;
}

export interface PlaybackRateRadioGroupProps
  extends Omit<UIComponentProps<'div', PlaybackRateRadioGroupCore.State>, 'children'>, PlaybackRateOptionsProps {
  /** Render one consumer-owned menu radio item for every playback rate. */
  renderItem: (props: PlaybackRateRadioGroupItemProps, state: PlaybackRateRadioGroupItemState) => ReactElement;
}

/**
 * Renders menu radio items for the player's available playback rates.
 *
 * @example
 *   ```tsx
 *   <PlaybackRateRadioGroup
 *     renderItem={(props, item) => (
 *       <Menu.RadioItem {...props}>
 *         {item.label}
 *         <Menu.ItemIndicator checked={item.checked} />
 *       </Menu.RadioItem>
 *     )}
 *   />;
 *   ```;
 */
export const PlaybackRateRadioGroup = forwardRef<HTMLDivElement, PlaybackRateRadioGroupProps>(
  function PlaybackRateRadioGroup(componentProps, forwardedRef) {
    const {
      renderItem,
      render,
      className,
      style,
      label,
      formatRate,
      disabled,
      'aria-label': ariaLabelProp,
      'aria-labelledby': ariaLabelledBy,
      ...elementProps
    } = componentProps;
    const playbackRate = usePlaybackRateOptions({ label, formatRate, disabled });
    if (!playbackRate) return null;

    const { state, value, options, setValue } = playbackRate;
    const ariaLabel = ariaLabelProp ?? (ariaLabelledBy === undefined ? playbackRate.label : undefined);

    return (
      <MenuRadioGroup
        {...getStateDataAttrs(state, PlaybackRateRadioGroupDataAttrs)}
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
                  'data-rate': option.value,
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

export namespace PlaybackRateRadioGroup {
  export type Props = PlaybackRateRadioGroupProps;
  export type State = PlaybackRateRadioGroupCore.State;
  export type ItemProps = PlaybackRateRadioGroupItemProps;
  export type ItemState = PlaybackRateRadioGroupItemState;
}
