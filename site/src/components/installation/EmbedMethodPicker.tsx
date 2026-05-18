import { useStore } from '@nanostores/react';
import { Code2, Package } from 'lucide-react';
import type { ImageRadioOption } from '@/components/ImageRadioGroup';
import ImageRadioGroup from '@/components/ImageRadioGroup';
import { embedMethod } from '@/stores/installation';
import type { EmbedMethod } from '@/utils/installation/types';

const OPTIONS: ImageRadioOption<EmbedMethod>[] = [
  { value: 'packaged', label: 'Packaged', image: <Package size={32} /> },
  { value: 'ejected', label: 'Ejected', image: <Code2 size={32} /> },
];

export default function EmbedMethodPicker() {
  const $embedMethod = useStore(embedMethod);
  return (
    <ImageRadioGroup
      value={$embedMethod}
      onChange={(value) => embedMethod.set(value)}
      options={OPTIONS}
      aria-label="Select embed method"
    />
  );
}
