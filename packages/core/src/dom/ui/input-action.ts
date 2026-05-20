import { IndicatorVisibilityCoordinator } from '../../core/ui/input-feedback/indicator-lifecycle';
import type { InputActionEvent, MediaSnapshot } from '../../core/ui/input-feedback/status';
import { getGestureCoordinator } from '../gesture/coordinator';
import type { GestureActivateEvent } from '../gesture/gesture';
import type { HotkeyActivateEvent } from '../hotkey/coordinator';
import { getHotkeyCoordinator } from '../hotkey/hotkey';
import {
  selectFullscreen,
  selectPiP,
  selectPlayback,
  selectTextTrack,
  selectTime,
  selectVolume,
} from '../store/selectors';

/** Activation event from either the gesture or hotkey coordinator. */
export type CoordinatorEvent = GestureActivateEvent | HotkeyActivateEvent;

/** Minimal store shape consumed by {@link getMediaSnapshot}. */
export interface MediaSnapshotStore {
  /** Current store state. */
  readonly state: object;
}

/**
 * Normalize a coordinator event into the canonical {@link InputActionEvent} shape.
 *
 * @param event - Gesture or hotkey activation event.
 */
export function toInputActionEvent(event: CoordinatorEvent): InputActionEvent {
  return {
    action: event.action,
    value: event.value,
    source: event.source,
    key: 'key' in event.event ? event.event.key : undefined,
  };
}

/**
 * Capture a {@link MediaSnapshot} of paused/volume/muted/etc. from the player store.
 *
 * @param store - Player store, or `undefined` for an empty snapshot.
 */
export function getMediaSnapshot(store: MediaSnapshotStore | undefined): MediaSnapshot {
  if (!store) return {};

  const state = store.state;
  const time = selectTime(state);

  return {
    paused: selectPlayback(state)?.paused,
    volume: selectVolume(state)?.volume,
    muted: selectVolume(state)?.muted,
    fullscreen: selectFullscreen(state)?.fullscreen,
    subtitlesShowing: selectTextTrack(state)?.subtitlesShowing,
    pip: selectPiP(state)?.pip,
    currentTime: time?.currentTime,
    duration: time?.duration,
  };
}

/**
 * Subscribe to gesture and hotkey activations on a container and forward them as {@link InputActionEvent}s.
 *
 * @param container - Player container element.
 * @param callback - Called for every input-action event.
 */
export function subscribeToInputActions(
  container: HTMLElement,
  callback: (event: InputActionEvent) => void
): () => void {
  const handleEvent = (event: CoordinatorEvent) => callback(toInputActionEvent(event));
  const gestureUnsubscribe = getGestureCoordinator(container).subscribe(handleEvent);
  const hotkeyUnsubscribe = getHotkeyCoordinator(container).subscribe(handleEvent);

  return () => {
    gestureUnsubscribe();
    hotkeyUnsubscribe();
  };
}

const indicatorVisibilityCoordinators = new WeakMap<HTMLElement, IndicatorVisibilityCoordinator>();

/** Return the shared indicator visibility coordinator for `container`, creating one on first access. */
export function getIndicatorVisibilityCoordinator(container: HTMLElement): IndicatorVisibilityCoordinator {
  let coordinator = indicatorVisibilityCoordinators.get(container);
  if (!coordinator) {
    coordinator = new IndicatorVisibilityCoordinator();
    indicatorVisibilityCoordinators.set(container, coordinator);
  }
  return coordinator;
}
