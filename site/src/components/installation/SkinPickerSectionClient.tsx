import SkinPicker from './SkinPicker';
import { useSelection } from './useSelection';

interface Props {
  children: React.ReactNode;
  includeNoSkin?: boolean;
}

export default function SkinPickerSection({ children, includeNoSkin = true }: Props) {
  const $useCase = useSelection('useCase');
  // Hide for background-video use case
  if ($useCase === 'background-video') return null;

  // The heading and intro render inside this island so the whole section can disappear together. The picker takes the
  // same gap from its intro as the other pickers get from their ContentWidth frame.
  return (
    <>
      {children}
      <div className="mt-8">
        <SkinPicker includeNoSkin={includeNoSkin} />
      </div>
    </>
  );
}
