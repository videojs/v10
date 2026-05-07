import { Minus, Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { ImageRadioOption } from '@/components/ImageRadioGroup';
import ImageRadioGroup from '@/components/ImageRadioGroup';

type Variant = 'default' | 'minimal';

const OPTIONS: ImageRadioOption<Variant>[] = [
  { value: 'default', label: 'Default', image: <Sparkles size={32} /> },
  { value: 'minimal', label: 'Minimal', image: <Minus size={32} /> },
];

interface Props {
  children: React.ReactNode;
}

export default function EjectedSkinToggleClient({ children }: Props) {
  const [variant, setVariant] = useState<Variant>('default');

  return (
    <div className="flex flex-col gap-6" data-active-variant={variant}>
      <ImageRadioGroup
        value={variant}
        onChange={setVariant}
        options={OPTIONS}
        aria-label="Select skin variant to eject"
      />
      {children}
    </div>
  );
}
