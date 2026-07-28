import { CustomMediaElement } from '@videojs/media/dom/custom-media-element';
import { DashMedia } from '@videojs/media/dom/dash';
import { GoogleCast } from '@videojs/media/dom/google-cast';
import { addMediaComponent } from '@videojs/media/dom/media-host';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

export class DashVideo extends MediaAttachMixin(CustomMediaElement('video', DashMedia)) {
  constructor() {
    super();
    addMediaComponent(this.host, new GoogleCast());
  }
}
