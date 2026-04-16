import { serverMethodError } from '../server-error';
import { HTMLVideoElementHost } from '../video-host';

export class DashMedia extends HTMLVideoElementHost {
  engine = null;
  destroy(): void {
    serverMethodError('DashMedia', 'destroy');
  }
}
