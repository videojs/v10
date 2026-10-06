import type { InstallationProject, InstallationTemplate } from '@videojs/installation';

import CodeIcon from '@/assets/icons/code.svg?react';
import ComputerIcon from '@/assets/icons/computer.svg?react';
import CardRadioGroup, { type CardRadioOption } from '@/components/CardRadioGroup';
import { selectCdnStartingPoint, selectInstallationStartingPoint } from '@/stores/installation';

import { useSelection } from './useSelection';
import { withSelectionMarker } from './withSelectionMarker';

interface Props {
  /** On the CDN guide, the starting point also picks the app setup. */
  method?: 'cdn';
  serverTemplate: InstallationTemplate;
}

const OPTIONS = [
  {
    value: 'new',
    label: 'New project',
    description: 'Create a new app',
    media: <ComputerIcon className="size-7" />,
  },
  {
    value: 'existing',
    label: 'Existing project',
    description: 'Add to an existing app',
    media: <CodeIcon className="size-7" />,
  },
] satisfies CardRadioOption<InstallationProject>[];

const CDN_OPTIONS = [
  {
    value: 'new',
    label: 'New app',
    description: 'Create a minimal Vite app',
    media: <ComputerIcon className="size-7" />,
  },
  {
    value: 'existing',
    label: 'Existing page',
    description: 'Add to an existing HTML page',
    media: <CodeIcon className="size-7" />,
  },
] satisfies CardRadioOption<InstallationProject>[];

function StartingPointPicker({ method, serverTemplate }: Props) {
  const project = useSelection('project', 'existing');
  const template = useSelection('template', serverTemplate);
  const options =
    method === 'cdn'
      ? CDN_OPTIONS
      : OPTIONS.map((option) => ({
          ...option,
          disabled: option.value === 'new' && template === 'none',
        }));

  return (
    <CardRadioGroup
      value={template === 'none' ? 'existing' : project}
      onChange={method === 'cdn' ? selectCdnStartingPoint : selectInstallationStartingPoint}
      options={options}
      aria-label="Select project starting point"
      minColumnWidth="15rem"
    />
  );
}

export default withSelectionMarker(StartingPointPicker);
