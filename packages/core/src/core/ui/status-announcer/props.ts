import type { IndicatorCoreProps } from '../input-feedback/indicator-lifecycle';
import type { InputIndicatorLabels } from '../input-feedback/status';

export interface StatusAnnouncerProps extends IndicatorCoreProps {
  labels?: Partial<InputIndicatorLabels> | undefined;
}
