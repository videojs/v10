import * as $ from '@videojs/core/vjsc';
import { SpinnerIcon } from '@videojs/icons/vjsc';
import { type PropsOf, Slot } from 'vjsc/components';

import styles from './skin.styles';

export function Poster({ renderImage }: { renderImage?: PropsOf<typeof $.Poster.Image>['children'] } = {}) {
  return (
    <$.Poster.Root className={styles.poster}>
      <Slot name="poster">
        <$.Poster.Image className={styles.posterImage}>{renderImage}</$.Poster.Image>
      </Slot>
    </$.Poster.Root>
  );
}

export function BufferingIndicator() {
  return (
    <$.BufferingIndicator className={styles.buffering}>
      <SpinnerIcon className={styles.spinner} />
    </$.BufferingIndicator>
  );
}
