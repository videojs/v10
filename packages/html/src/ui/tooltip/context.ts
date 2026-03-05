import type { TooltipGroupCore } from '@videojs/core';
import { createContext } from '@videojs/element/context';

const TOOLTIP_GROUP_CONTEXT_KEY = Symbol('@videojs/tooltip-group');

export const tooltipGroupContext = createContext<TooltipGroupCore>(TOOLTIP_GROUP_CONTEXT_KEY);
