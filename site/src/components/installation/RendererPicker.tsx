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
        <p className="font-medium">Or upload your media for free to Mux</p>
        <MuxUploaderPanel />
      </div>
    </div>
  );
}
