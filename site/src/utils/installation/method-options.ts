import type { InstallationMethod } from '@videojs/installation';

export interface InstallationMethodOption {
  id: InstallationMethod;
  label: string;
  description: string;
  details: string;
}

export const INSTALLATION_METHOD_OPTIONS = [
  {
    id: 'packaged',
    label: 'Packaged',
    description: 'Install packages and use a ready-made skin.',
    details: 'Install packages and use a ready-made skin.',
  },
  {
    id: 'shadcn',
    label: 'Shadcn',
    description: 'Add editable skin source to your project.',
    details: 'Add editable React or HTML skin source to your project.',
  },
  {
    id: 'cdn',
    label: 'CDN',
    description: 'Load the HTML player from jsDelivr.',
    details: 'Load the HTML player from jsDelivr without a package manager or build step.',
  },
] as const satisfies readonly InstallationMethodOption[];
