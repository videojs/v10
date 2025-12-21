import type { PopoverState } from './popover';
import { Popover } from './popover';

export interface TooltipState extends PopoverState {}

export class Tooltip extends Popover {
  constructor() {
    super();
    this.setState({
      openOnHover: true,
      disableHoverablePopover: true,
    });
  }
}
