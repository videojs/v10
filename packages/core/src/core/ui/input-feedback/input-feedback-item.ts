import type { StateAttrMap } from '../types';
import type { InputFeedbackDataState } from './input-feedback-data-attrs';

export const INPUT_FEEDBACK_GROUP_ACTIONS = {
  volume: ['volumeStep', 'toggleMuted'],
  captions: ['toggleSubtitles'],
  seek: ['seekStep', 'seekToPercent'],
  playback: ['togglePaused'],
} as const;

export type InputFeedbackGroup = keyof typeof INPUT_FEEDBACK_GROUP_ACTIONS;
export type InputFeedbackAction = (typeof INPUT_FEEDBACK_GROUP_ACTIONS)[InputFeedbackGroup][number];

export interface InputFeedbackItemDefinition {
  action?: InputFeedbackAction | undefined;
  group?: InputFeedbackGroup | undefined;
}

export type InputFeedbackVolumeLevel = NonNullable<InputFeedbackDataState['volumeLevel']>;

export interface InputFeedbackItemDataState {
  active: boolean;
  action: InputFeedbackAction | null;
  group: InputFeedbackGroup | null;
  generation: number;
  region: InputFeedbackDataState['region'];
  direction: InputFeedbackDataState['direction'];
  paused: InputFeedbackDataState['paused'];
  volumeLevel: InputFeedbackDataState['volumeLevel'];
  captions: InputFeedbackDataState['captions'];
  boundary: InputFeedbackDataState['boundary'];
  value: string | null;
  transitionStarting: boolean;
  transitionEnding: boolean;
}

export const InputFeedbackItemDataAttrs = {
  active: 'data-active',
  action: 'data-action',
  group: 'data-group',
  region: 'data-region',
  direction: 'data-direction',
  paused: 'data-paused',
  volumeLevel: 'data-volume-level',
  captions: 'data-captions',
  boundary: 'data-boundary',
  value: 'data-value',
  transitionStarting: 'data-starting-style',
  transitionEnding: 'data-ending-style',
} as const satisfies StateAttrMap<InputFeedbackItemDataState>;

export const EMPTY_INPUT_FEEDBACK_ITEM_STATE: InputFeedbackItemDataState = {
  active: false,
  action: null,
  group: null,
  generation: 0,
  region: null,
  direction: null,
  paused: null,
  volumeLevel: null,
  captions: null,
  boundary: null,
  value: null,
  transitionStarting: false,
  transitionEnding: false,
};

export interface InputFeedbackItemTransitionState {
  active: boolean;
  status: 'idle' | 'starting' | 'ending';
}

export function isInputFeedbackItemPresent(
  current: Pick<InputFeedbackItemDataState, 'active'>,
  transition: Pick<InputFeedbackItemTransitionState, 'active'>
): boolean {
  return current.active || transition.active;
}

export function isInputFeedbackAction(action: string | null | undefined): action is InputFeedbackAction {
  return (
    action === 'togglePaused' ||
    action === 'toggleMuted' ||
    action === 'toggleSubtitles' ||
    action === 'seekStep' ||
    action === 'seekToPercent' ||
    action === 'volumeStep'
  );
}

export function resolveInputFeedbackGroup(action: InputFeedbackAction | null): InputFeedbackGroup | null {
  if (!action) return null;

  for (const group of Object.keys(INPUT_FEEDBACK_GROUP_ACTIONS) as InputFeedbackGroup[]) {
    if (getInputFeedbackGroupActions(group).includes(action)) {
      return group;
    }
  }

  return null;
}

export function getInputFeedbackItemDefinition(
  action: InputFeedbackAction | undefined,
  group: InputFeedbackGroup | undefined
): InputFeedbackItemDefinition | null {
  if ((action && group) || (!action && !group)) return null;
  return action ? { action } : { group };
}

export function matchesInputFeedbackItem(
  definition: InputFeedbackItemDefinition,
  action: InputFeedbackAction | null
): boolean {
  if (!action) return false;
  if (definition.action) return definition.action === action;
  if (definition.group) return getInputFeedbackGroupActions(definition.group).includes(action);
  return false;
}

export function getInputFeedbackItemState(
  rootState: InputFeedbackDataState,
  definition: InputFeedbackItemDefinition,
  currentVolumeLevel: InputFeedbackVolumeLevel | null
): InputFeedbackItemDataState {
  const matchedAction = isInputFeedbackAction(rootState.action) ? rootState.action : null;
  const group = resolveInputFeedbackItemGroup(definition, matchedAction);
  const action = resolveInputFeedbackItemAction(definition, group, matchedAction);
  const region = resolveInputFeedbackItemRegion(group, action, rootState.direction, rootState.region);

  if (!matchesInputFeedbackItem(definition, matchedAction)) {
    return {
      ...EMPTY_INPUT_FEEDBACK_ITEM_STATE,
      group,
      generation: rootState.generation,
      region,
      volumeLevel: group === 'volume' ? currentVolumeLevel : null,
    };
  }

  return {
    active: rootState.active,
    action,
    group,
    generation: rootState.generation,
    region,
    direction: rootState.direction,
    paused: rootState.paused,
    volumeLevel: rootState.volumeLevel,
    captions: rootState.captions,
    boundary: rootState.boundary,
    value: formatInputFeedbackItemValue(rootState, group, action),
    transitionStarting: false,
    transitionEnding: false,
  };
}

export function getRenderedInputFeedbackItemState(
  current: InputFeedbackItemDataState,
  snapshot: InputFeedbackItemDataState,
  transition: InputFeedbackItemTransitionState
): InputFeedbackItemDataState {
  const payload = current.active ? current : snapshot;
  const region = transition.active
    ? (payload.region ?? current.region ?? 'center')
    : (current.region ?? payload.region ?? 'center');

  return {
    ...payload,
    group: current.group ?? payload.group,
    action: current.action ?? payload.action,
    generation: current.active ? current.generation : payload.generation,
    region,
    direction: current.direction ?? payload.direction,
    paused: current.paused ?? payload.paused,
    volumeLevel: current.volumeLevel ?? payload.volumeLevel,
    captions: current.captions ?? payload.captions,
    boundary: current.boundary ?? payload.boundary,
    value: current.value ?? payload.value,
    active: current.active && transition.active,
    transitionStarting: transition.status === 'starting',
    transitionEnding: transition.status === 'ending',
  };
}

export function isVolumeInputFeedbackItem(definition: InputFeedbackItemDefinition): boolean {
  return definition.group === 'volume' || definition.action === 'volumeStep' || definition.action === 'toggleMuted';
}

function formatInputFeedbackItemValue(
  state: InputFeedbackDataState,
  group: InputFeedbackGroup | null,
  action: InputFeedbackAction | null
): string | null {
  switch (group) {
    case 'volume':
      return state.volumeLabel ?? state.label;
    case 'captions':
      return state.captionsLabel ?? state.label;
    case 'seek':
      if (action !== 'seekStep' || state.seekTotal <= 0) return null;
      return `${state.seekTotal}s`;
    default:
      return null;
  }
}

function resolveInputFeedbackItemAction(
  definition: InputFeedbackItemDefinition,
  group: InputFeedbackGroup | null,
  action: InputFeedbackAction | null
): InputFeedbackAction | null {
  if (definition.action) return definition.action;
  if (definition.group === 'seek' || group === 'seek') return action;
  return null;
}

function resolveInputFeedbackItemGroup(
  definition: InputFeedbackItemDefinition,
  action: InputFeedbackAction | null
): InputFeedbackGroup | null {
  if (definition.group) return definition.group;
  if (definition.action) return resolveInputFeedbackGroup(definition.action);
  return resolveInputFeedbackGroup(action);
}

function resolveInputFeedbackItemRegion(
  group: InputFeedbackGroup | null,
  action: InputFeedbackAction | null,
  direction: InputFeedbackDataState['direction'],
  region: InputFeedbackDataState['region']
): NonNullable<InputFeedbackDataState['region']> {
  if (region) return region;

  if (group === 'seek' || action === 'seekStep' || action === 'seekToPercent') {
    if (direction === 'backward') return 'left';
    if (direction === 'forward') return 'right';
  }

  return 'center';
}

function getInputFeedbackGroupActions(group: InputFeedbackGroup): readonly InputFeedbackAction[] {
  return INPUT_FEEDBACK_GROUP_ACTIONS[group] as readonly InputFeedbackAction[];
}
