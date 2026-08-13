'use client';

import { type QualityRadioGroupCore, QualityRadioGroupDataAttrs } from '@videojs/core';
import { getStateDataAttrs } from '@videojs/core/dom';
import { isFunction } from '@videojs/utils/predicate';
import type { ReactElement } from 'react';
import { Fragment, forwardRef } from 'react';

import type { HTMLProps, UIComponentProps } from '../../utils/types';
import { MenuRadioGroup } from '../menu/menu-radio-group';
import type { MenuRadioItemProps } from '../menu/menu-radio-item';
import { type QualityOption, type QualityOptionsProps, useQualityOptions } from '../quality/use-quality-options';

export type QualityRadioGroupItemState = QualityOption & {
  /** Whether this quality option is currently selected. */
  checked: boolean;
};

export interface QualityRadioGroupItemProps extends Omit<MenuRadioItemProps, 'ref'> {
  /** Rendition value represented by the item. */
  'data-rendition': string;
}

export interface QualityRadioGroupProps
  extends Omit<UIComponentProps<'div', QualityRadioGroupCore.State>, 'children'>,
    QualityOptionsProps {
  /** Render one consumer-owned menu radio item for every quality option. */
  renderItem: (props: QualityRadioGroupItemProps, state: QualityRadioGroupItemState) => ReactElement;
}

/**
 * Renders menu radio items for the player's video renditions.
 *
 * @example
 * ```tsx
 * <QualityRadioGroup
 *   renderItem={(props, item) => (
 *     <Menu.RadioItem {...props}>
 *       {item.label}
 *       {item.tier ? <sup>{item.tier}</sup> : null}
 *       <Menu.ItemIndicator checked={item.checked} />
 *     </Menu.RadioItem>
 *   )}
 * />
 * ```
 */
export const QualityRadioGroup = forwardRef<HTMLDivElement, QualityRadioGroupProps>(
  function QualityRadioGroup(componentProps, forwardedRef) {
    const {
      renderItem,
      render,
      className,
      style,
      label,
      formatRendition,
      disabled,
      'aria-label': ariaLabelProp,
      'aria-labelledby': ariaLabelledBy,
      ...elementProps
    } = componentProps;
    const quality = useQualityOptions({ label, formatRendition, disabled });
    if (!quality) return null;

    const { state, value, options, setValue } = quality;
    const ariaLabel = ariaLabelProp ?? (ariaLabelledBy === undefined ? quality.label : undefined);

    return (
      <MenuRadioGroup
        {...getStateDataAttrs(state, QualityRadioGroupDataAttrs)}
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
                  'data-rendition': option.value,
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

export namespace QualityRadioGroup {
  export type Props = QualityRadioGroupProps;
  export type State = QualityRadioGroupCore.State;
  export type ItemProps = QualityRadioGroupItemProps;
  export type ItemState = QualityRadioGroupItemState;
}
