import { defaults } from '@videojs/utils/object';

import { TOOLTIP_GROUP_DEFAULT_PROPS, type TooltipGroupProps } from './props';

export class TooltipGroupCore {
  static readonly defaultProps = TOOLTIP_GROUP_DEFAULT_PROPS;

  #props = { ...TooltipGroupCore.defaultProps };
  #lastCloseTime = 0;
  #isOpen = false;

  constructor(props?: TooltipGroupProps) {
    if (props) this.setProps(props);
  }

  setProps(props: TooltipGroupProps): void {
    this.#props = defaults(props, TooltipGroupCore.defaultProps);
  }

  get delay(): number {
    return this.#props.delay;
  }

  get closeDelay(): number {
    return this.#props.closeDelay;
  }

  shouldSkipDelay(): boolean {
    if (this.#isOpen) return true;
    return Date.now() - this.#lastCloseTime < this.#props.timeout;
  }

  notifyOpen(): void {
    this.#isOpen = true;
  }

  notifyClose(): void {
    this.#isOpen = false;
    this.#lastCloseTime = Date.now();
  }
}

export namespace TooltipGroupCore {
  export type Props = TooltipGroupProps;
}
