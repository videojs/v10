import { MUX_URL } from '@/consts';
import MuxUploaderPanel from './MuxUploaderPanel';
import RendererSelect from './RendererSelect';

export default function RendererPicker() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="flex flex-col gap-4">
        <p className="font-bold">Select your source</p>
        <RendererSelect />
      </div>
      <div className="flex flex-col gap-4">
        <p className="font-bold">
          Or upload your media for free to{' '}
          <a href={MUX_URL} target="_blank" rel="noopener" className="underline intent:decoration-gold">
            Mux
          </a>
        </p>
        <MuxUploaderPanel />
      </div>
    </div>
  );
}
