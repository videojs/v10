import type { TransitionFlags, TransitionState } from '../transition';
import { getTransitionFlags } from '../transition';

/** Default delay in milliseconds before an indicator closes. */
export const INDICATOR_CLOSE_DELAY = 800;

/** Props common to indicator cores that auto-close after a delay. */
export interface IndicatorCoreProps {
  /** Delay in milliseconds before the indicator closes. */
  closeDelay?: number | undefined;
}

/** Open and generation state shared by all input-feedback indicators. */
export interface IndicatorLifecycleState extends TransitionFlags {
  /** Whether the indicator is currently open. */
  open: boolean;
  /** Monotonic counter incremented on each open event, used to restart animations. */
  generation: number;
}

/** Re-arms a close timer on every interaction and closes once the delay expires. */
export class IndicatorCloseController {
  #timer: ReturnType<typeof setTimeout> | null = null;
  #close: () => void;
  #getDelay: () => number;

  /**
   * @param close - Callback to invoke when the timer expires.
   * @param getDelay - Resolves the current close delay in milliseconds.
   */
  constructor(close: () => void, getDelay: () => number) {
    this.#close = close;
    this.#getDelay = getDelay;
  }

  /** Reset and start the close timer. */
  arm(): void {
    this.clear();
    this.#timer = setTimeout(() => {
      this.#timer = null;
      this.#close();
    }, this.#getDelay());
  }

  /** Cancel any pending close timer. */
  clear(): void {
    if (this.#timer === null) return;
    clearTimeout(this.#timer);
    this.#timer = null;
  }

  /** Cancel the timer and close immediately. */
  close(): void {
    this.clear();
    this.#close();
  }

  /** Cancel any pending close timer; alias of `clear` for symmetry with other cores. */
  destroy(): void {
    this.clear();
  }
}

/** Handle that an indicator visibility coordinator can close. */
export interface IndicatorVisibilityHandle {
  /** Close this indicator. */
  close(): void;
}

/** Closes other indicators when a new one is shown, so at most one is visible at a time. */
export class IndicatorVisibilityCoordinator<Handle extends IndicatorVisibilityHandle = IndicatorVisibilityHandle> {
  #handles = new Set<Handle>();

  /** Register a handle and return an unregister function. */
  register(handle: Handle): () => void {
    this.#handles.add(handle);
    return () => this.#handles.delete(handle);
  }

  /** Close every registered handle except the given one. */
  show(handle: Handle): void {
    for (const nextHandle of this.#handles) {
      if (nextHandle !== handle) nextHandle.close();
    }
  }
}

/** Resolve the indicator's close delay from props, falling back to the default. */
export function getIndicatorCloseDelay(props: IndicatorCoreProps): number {
  return props.closeDelay ?? INDICATOR_CLOSE_DELAY;
}

/** Whether the indicator should remain mounted given current state and transition status. */
export function isIndicatorPresent(
  current: Pick<IndicatorLifecycleState, 'open'>,
  transition: Pick<TransitionState, 'active'>
): boolean {
  return current.open || transition.active;
}

/** Merge live indicator state with a captured snapshot during the close transition. */
export function getRenderedIndicatorState<State extends IndicatorLifecycleState>(
  current: State,
  snapshot: State,
  transition: TransitionState
): State {
  const payload = current.open ? current : snapshot;

  return {
    ...payload,
    open: current.open && transition.active,
    generation: current.open ? current.generation : payload.generation,
    ...getTransitionFlags(transition.status),
  };
}
