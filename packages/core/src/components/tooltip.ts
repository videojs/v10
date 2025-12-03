import type { PopoverState } from './popover';
import { Popover } from './popover';

export interface TooltipState extends PopoverState {}

export class Tooltip {
  #popover: Popover;

  constructor() {
    this.#popover = new Popover();
    this.setState({
      openOnHover: true,
      disableHoverablePopover: true,
    });
  }

  getState(): TooltipState {
    return {
      ...this.#popover.getState(),
    };
  }

  setState(state: Partial<TooltipState>): void {
    this.#popover.setState(state);
  }

  subscribe(callback: (state: TooltipState) => void): () => void {
    return this.#popover.subscribe(callback);
  }
}
