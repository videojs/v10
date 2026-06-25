import type { MediaFeatureAvailability } from '../../media/types';

export type FeatureAvailabilityFeature = 'volume';
export type FeatureAvailabilityCondition = MediaFeatureAvailability | readonly MediaFeatureAvailability[];

interface FeatureAvailabilityBaseProps {
  is: FeatureAvailabilityFeature;
}

interface FeatureAvailabilityWhenProps extends FeatureAvailabilityBaseProps {
  when: FeatureAvailabilityCondition;
  except?: never;
}

interface FeatureAvailabilityExceptProps extends FeatureAvailabilityBaseProps {
  except: FeatureAvailabilityCondition;
  when?: never;
}

export type FeatureAvailabilityProps = FeatureAvailabilityWhenProps | FeatureAvailabilityExceptProps;
