import { defineComponent } from '@videojs/compiler';
import type { StatusAnnouncerProps } from '../input-feedback/status-announcer-core';

export default defineComponent<StatusAnnouncerProps>()({
  name: 'StatusAnnouncer',
});
