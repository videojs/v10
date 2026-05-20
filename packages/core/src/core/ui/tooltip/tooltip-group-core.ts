import { defaults } from '@videojs/utils/object';
import type { NonNullableObject } from '@videojs/utils/types';

/** Props for the tooltip group core. */
export interface TooltipGroupProps {
  /** Default open delay in ms for tooltips in this group. */
  delay?: number | undefined;
  /** Default close delay in ms for tooltips in this group. */
  closeDelay?: number | undefined;
  /** Duration in ms after a tooltip closes during which the next tooltip opens instantly. */
  timeout?: number | undefined;
}

/** Coordinator for a set of tooltips — skips the hover delay while the group is "warm". */
export class TooltipGroupCore {
  /** Default values applied when a prop is omitted. */
  static readonly defaultProps: NonNullableObject<TooltipGroupProps> = {
    delay: 600,
    closeDelay: 0,
    timeout: 400,
  };

  #props = { ...TooltipGroupCore.defaultProps };
  #lastCloseTime = 0;
  #isOpen = false;

  /** @param props - Initial props (merged with defaults). */
  constructor(props?: TooltipGroupProps) {
    if (props) this.setProps(props);
  }

  setProps(props: TooltipGroupProps): void {
    this.#props = defaults(props, TooltipGroupCore.defaultProps);
  }

  /** Default open delay in ms for tooltips in this group. */
  get delay(): number {
    return this.#props.delay;
  }

  /** Default close delay in ms for tooltips in this group. */
  get closeDelay(): number {
    return this.#props.closeDelay;
  }

  /** Whether a newly hovered tooltip should open immediately because the group is warm. */
  shouldSkipDelay(): boolean {
    if (this.#isOpen) return true;
    return Date.now() - this.#lastCloseTime < this.#props.timeout;
  }

  /** Notify the group that a tooltip has opened. */
  notifyOpen(): void {
    this.#isOpen = true;
  }

  /** Notify the group that a tooltip has closed; starts the warm window. */
  notifyClose(): void {
    this.#isOpen = false;
    this.#lastCloseTime = Date.now();
  }
}

export namespace TooltipGroupCore {
  /** Alias for {@link TooltipGroupProps}. */
  export type Props = TooltipGroupProps;
}
