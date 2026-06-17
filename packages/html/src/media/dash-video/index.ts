import { CustomMediaElement } from '@videojs/core/dom/media/custom-media-element';
import { DashMedia } from '@videojs/core/dom/media/dash';
import { GoogleCast } from '@videojs/core/dom/media/google-cast';
import { addComponent } from '@videojs/core/dom/media/media-host';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

export class DashVideo extends MediaAttachMixin(CustomMediaElement('video', DashMedia)) {
  constructor() {
    super();
    addComponent(this.host, new GoogleCast());
  }
}
