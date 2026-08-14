'use client';

import { type AudioTrackRadioGroupCore, AudioTrackRadioGroupDataAttrs } from '@videojs/core';
import { getStateDataAttrs } from '@videojs/core/dom';
import { isFunction } from '@videojs/utils/predicate';
import type { ReactElement } from 'react';
import { Fragment, forwardRef } from 'react';

import type { HTMLProps, UIComponentProps } from '../../utils/types';
import {
  type AudioTrackOption,
  type AudioTrackOptionsProps,
  useAudioTrackOptions,
} from '../audio-track/use-audio-track-options';
import { MenuRadioGroup } from '../menu/menu-radio-group';
import type { MenuRadioItemProps } from '../menu/menu-radio-item';

export type AudioTrackRadioGroupItemState = AudioTrackOption & {
  /** Whether this option is the currently enabled audio track. */
  checked: boolean;
};

export interface AudioTrackRadioGroupItemProps extends Omit<MenuRadioItemProps, 'ref'> {
  /** Audio track value represented by the option. */
  'data-track': string;
}

export interface AudioTrackRadioGroupProps
  extends Omit<UIComponentProps<'div', AudioTrackRadioGroupCore.State>, 'children'>,
    AudioTrackOptionsProps {
  /** Render one consumer-owned menu radio item for every audio track. */
  renderItem: (props: AudioTrackRadioGroupItemProps, state: AudioTrackRadioGroupItemState) => ReactElement;
}

/**
 * Renders menu radio options for the player's audio tracks.
 *
 * @example
 * ```tsx
 * <AudioTrackRadioGroup
 *   renderItem={(props, item) => (
 *     <Menu.RadioItem {...props}>
 *       {item.label}
 *       <Menu.ItemIndicator checked={item.checked} />
 *     </Menu.RadioItem>
 *   )}
 * />
 * ```
 */
export const AudioTrackRadioGroup = forwardRef<HTMLDivElement, AudioTrackRadioGroupProps>(
  function AudioTrackRadioGroup(componentProps, forwardedRef) {
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
    const audioTrack = useAudioTrackOptions({ label, formatTrack, disabled });
    if (!audioTrack) return null;

    const { state, value, options, setValue } = audioTrack;
    const ariaLabel = ariaLabelProp ?? (ariaLabelledBy === undefined ? audioTrack.label : undefined);

    return (
      <MenuRadioGroup
        {...getStateDataAttrs(state, AudioTrackRadioGroupDataAttrs)}
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

export namespace AudioTrackRadioGroup {
  export type Props = AudioTrackRadioGroupProps;
  export type State = AudioTrackRadioGroupCore.State;
  export type ItemProps = AudioTrackRadioGroupItemProps;
  export type ItemState = AudioTrackRadioGroupItemState;
}
