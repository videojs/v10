'use client';

import type {
  FeatureAvailabilityProps as CoreFeatureAvailabilityProps,
  FeatureAvailabilityCondition,
  MediaFeatureAvailability,
} from '@videojs/core';
import { logMissingFeature, selectVolume } from '@videojs/core/dom';
import type { ReactNode } from 'react';

import { usePlayer } from '../../player/context';

type AvailabilitySelector = (state: object) => MediaFeatureAvailability | undefined;

const FEATURE_AVAILABILITY_SELECTORS = {
  volume: (state: object) => selectVolume(state)?.volumeAvailability,
} satisfies Record<CoreFeatureAvailabilityProps['is'], AvailabilitySelector>;

export type FeatureAvailabilityProps = CoreFeatureAvailabilityProps & {
  children?: ReactNode;
};

function conditionIncludes(condition: FeatureAvailabilityCondition, availability: MediaFeatureAvailability): boolean {
  return Array.isArray(condition) ? condition.includes(availability) : condition === availability;
}

export function FeatureAvailability({ is, children, ...props }: FeatureAvailabilityProps): ReactNode {
  const availability = usePlayer(FEATURE_AVAILABILITY_SELECTORS[is]);

  if (!availability) {
    if (__DEV__) logMissingFeature('FeatureAvailability', is);
    return null;
  }

  if ('when' in props) {
    return conditionIncludes(props.when, availability) ? children : null;
  }

  return conditionIncludes(props.except, availability) ? null : children;
}

export namespace FeatureAvailability {
  export type Props = FeatureAvailabilityProps;
}
