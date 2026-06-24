import { defineComponent } from '../manifest';
import { PlayButtonDataAttrs } from './play-button-data-attrs';
import type { PlayButtonProps } from './props';

export default defineComponent<PlayButtonProps>({
  name: 'PlayButton',
  dataAttrs: PlayButtonDataAttrs,
});
