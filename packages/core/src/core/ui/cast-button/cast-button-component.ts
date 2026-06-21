import { defineComponent } from '../manifest';
import { CastButtonDataAttrs } from './cast-button-data-attrs';
import type { CastButtonProps } from './props';

export default defineComponent<CastButtonProps>()({
  name: 'CastButton',
  dataAttrs: CastButtonDataAttrs,
});
