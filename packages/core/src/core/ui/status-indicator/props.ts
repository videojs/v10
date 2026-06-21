import type { IndicatorCoreProps } from '../input-feedback/indicator-lifecycle';
import type { InputAction, InputIndicatorLabels } from '../input-feedback/status';

export interface StatusIndicatorProps extends IndicatorCoreProps {
  actions?: readonly InputAction[] | undefined;
  labels?: Partial<InputIndicatorLabels> | undefined;
}
