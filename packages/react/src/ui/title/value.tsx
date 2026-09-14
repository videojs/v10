import { type TitleCore } from '@videojs/core';
import type { ForwardedRef } from 'react';
import { forwardRef } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useTitleContext } from './context';

export interface TitleValueProps extends UIComponentProps<'div', TitleCore.State> {}

export const TitleValue = forwardRef(function TitleValue(
  componentProps: TitleValueProps,
  forwardedRef: ForwardedRef<HTMLDivElement>
) {
  const { render, className, style, ...elementProps } = componentProps;
  const { state } = useTitleContext();

  return renderElement(
    'div',
    { render, className, style },
    {
      state,
      ref: forwardedRef,
      props: [{ children: state.title }, elementProps],
    }
  );
});

export namespace TitleValue {
  export type Props = TitleValueProps;
}
