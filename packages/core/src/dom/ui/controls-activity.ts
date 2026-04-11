import { isInteractiveTarget, listen } from '@videojs/utils/dom';

const TAP_THRESHOLD = 250;

export interface ControlsActivityOptions {
  setActive: () => void;
  setInactive: () => void;
  toggleControls: () => void;
}

export interface ControlsActivityProps {
  onPointerMove: () => void;
  onPointerDown: () => void;
  onPointerUp: (event: PointerEvent) => void;
  onKeyUp: () => void;
  onFocusIn: () => void;
  onMouseLeave: () => void;
}

export interface ControlsActivityApi {
  props: ControlsActivityProps;
}

/**
 * Create controls activity tracking event handlers.
 *
 * Returns props that should be applied to the player container.
 * Handles idle timer reset on pointer/keyboard activity and
 * touch tap-to-toggle controls visibility.
 */
export function createControlsActivity(options: ControlsActivityOptions): ControlsActivityApi {
  let pointerDownTime = 0;

  const props: ControlsActivityProps = {
    onPointerMove() {
      options.setActive();
    },
    onPointerDown() {
      pointerDownTime = Date.now();
    },
    onPointerUp(event: PointerEvent) {
      if (event.pointerType === 'touch' && Date.now() - pointerDownTime < TAP_THRESHOLD) {
        // Touch tap on interactive controls (buttons, sliders) — skip toggle.
        if (isInteractiveTarget(event)) return;

        options.toggleControls();
        return;
      }

      // Non-touch pointer up (mouse click, pen) — treat as activity.
      options.setActive();
    },
    onKeyUp() {
      options.setActive();
    },
    onFocusIn() {
      options.setActive();
    },
    onMouseLeave() {
      options.setInactive();
    },
  };

  return { props };
}

/** Wire up controls activity tracking on a container element. */
export function attachControlsActivity(
  container: HTMLElement,
  options: ControlsActivityOptions,
  signal: AbortSignal
): ControlsActivityApi {
  const activity = createControlsActivity(options);

  listen(container, 'pointermove', activity.props.onPointerMove, { signal });
  listen(container, 'pointerdown', activity.props.onPointerDown, { signal });
  listen(container, 'pointerup', activity.props.onPointerUp as EventListener, { signal });
  listen(container, 'keyup', activity.props.onKeyUp, { signal });
  listen(container, 'focusin', activity.props.onFocusIn, { signal });
  listen(container, 'mouseleave', activity.props.onMouseLeave, { signal });

  return activity;
}
