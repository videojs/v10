import MuxUploaderPanel from './MuxUploaderPanel';
import RendererSelect from './RendererSelect';

export default function RendererPicker() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="flex flex-col gap-4">
        <p className="font-medium">Select your source</p>
        <RendererSelect />
      </div>
      <div className="flex flex-col gap-4">
        <p className="font-medium">
          Or upload your media for free to
          {' '}
          <a
            href="https://www.mux.com/?utm_source=videojs&utm_campaign=vjs10"
            className="underline intent:no-underline"
          >
            Mux
          </a>
        </p>
        <MuxUploaderPanel />
      </div>
    </div>
  );
}
