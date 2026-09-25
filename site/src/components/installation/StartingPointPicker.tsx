import type { InstallationProject, InstallationTemplate } from '@videojs/installation';

import CodeIcon from '@/assets/icons/code.svg?react';
import ComputerIcon from '@/assets/icons/computer.svg?react';
import CardRadioGroup, { type CardRadioOption } from '@/components/CardRadioGroup';
import { selectInstallationStartingPoint } from '@/stores/installation';

import { useSelection } from './useSelection';
import { withSelectionMarker } from './withSelectionMarker';

interface Props {
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

function StartingPointPicker({ serverTemplate }: Props) {
  const project = useSelection('project', 'existing');
  const template = useSelection('template', serverTemplate);
  const options = OPTIONS.map((option) => ({
    ...option,
    disabled: option.value === 'new' && template === 'none',
  }));

  return (
    <CardRadioGroup
      value={template === 'none' ? 'existing' : project}
      onChange={selectInstallationStartingPoint}
      options={options}
      aria-label="Select project starting point"
      minColumnWidth="15rem"
    />
  );
}

export default withSelectionMarker(StartingPointPicker);
