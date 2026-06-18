import { defineComponent } from '@videojs/compiler';
import { PosterDataAttrs } from './poster-data-attrs';

export default defineComponent()({
  name: 'Poster',
  dataAttrs: PosterDataAttrs,
});
