import { CustomMediaElement } from '@videojs/media/dom/custom-media-element';
import { DashMedia } from '@videojs/media/dom/dash';
import { GoogleCast } from '@videojs/media/dom/google-cast';
import { addComponent } from '@videojs/media/dom/media-host';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

export class DashVideo extends MediaAttachMixin(CustomMediaElement('video', DashMedia)) {
  constructor() {
    super();
    addComponent(this.host, new GoogleCast());
  }
}
