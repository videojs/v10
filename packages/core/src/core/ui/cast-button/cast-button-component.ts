import { defineComponent } from '../manifest';
import type { CastButtonProps } from './cast-button-core';
import { CastButtonDataAttrs } from './cast-button-data-attrs';

export default defineComponent<CastButtonProps>()({
  name: 'CastButton',
  dataAttrs: CastButtonDataAttrs,
});
