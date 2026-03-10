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
          <a href="https://mux.com" target="_blank" rel="noopener" className="underline intent:no-underline">
            Mux
          </a>
        </p>
        <MuxUploaderPanel />
      </div>
    </div>
  );
}
