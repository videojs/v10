import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { framework, project, skin, template, useCase } from '@/stores/installation';
import { registryStyling } from '@/stores/registry';

vi.mock('@/components/installation/PackageManagerTabs', () => ({
  default: ({ commands }: { commands: Record<string, string> }) => <pre>{commands.pnpm}</pre>,
}));

import InstallationRegistryCommandClient from '../InstallationRegistryCommandClient';
import RegistryCommandClient from '../RegistryCommandClient';

describe('RegistryCommandClient', () => {
  beforeEach(() => {
    framework.set('react');
    project.set('existing');
    skin.set('video');
    template.set('next');
    useCase.set('default-video');
    registryStyling.set('tailwind');
  });

  afterEach(() => {
    cleanup();
    registryStyling.set(null);
  });

  it('names the registry action and marks initialization as optional in code', () => {
    render(<RegistryCommandClient framework="react" items={['video']} optionalInit />);

    expect(screen.getByRole('heading', { name: 'Add the Video.js Registry' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Create components.json (optional)' })).toBeInTheDocument();
    expect(screen.getByText(/# Optional: run if components.json does not exist/)).toBeInTheDocument();
  });

  it('pre-renders stable new and existing project commands', () => {
    const { container } = render(<InstallationRegistryCommandClient framework="react" />);
    const newProject = container.querySelector('[data-installation-project-content="new"]');
    const existingProject = container.querySelector('[data-installation-project-content="existing"]');

    expect(newProject).not.toHaveTextContent(/Optional: run if components.json does not exist/);
    expect(existingProject).toHaveTextContent(/Optional: run if components.json does not exist/);
  });
});
