import * as $ from '@videojs/core/vjsc';
import { type PropsOf } from 'vjsc/components';

import { Button } from './button';
import styles from './skin.styles';

export function PlaybackRateButton({ className, ...props }: PropsOf<typeof $.PlaybackRateButton> = {}) {
  return (
    <$.PlaybackRateButton $render={Button} className={[styles.rateTrigger, className]} {...props}>
      <$.PlaybackRateRadioGroup.Value />
    </$.PlaybackRateButton>
  );
}
