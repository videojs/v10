import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { framework, template } from '@/stores/installation';
import { registryStyling } from '@/stores/registry';

vi.mock('@/components/Code/ClientCode', () => ({
  default: ({ code }: { code: string }) => <pre>{code}</pre>,
}));

vi.mock('@/components/installation/PackageManagerTabs', () => ({
  default: ({ commands }: { commands: Record<string, string> }) => <pre>{commands.pnpm}</pre>,
}));

import RegistryInitCommandClient from '../RegistryInitCommandClient';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('RegistryInitCommandClient', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  });

  afterEach(() => {
    cleanup();
    framework.set('react');
    registryStyling.set(null);
    template.set('next');
    vi.unstubAllGlobals();
  });

  it('renders alias-free initialization without a one-item stepper', () => {
    registryStyling.set('tailwind');

    const { container } = render(<RegistryInitCommandClient framework="react" installation />);

    expect(screen.queryByRole('heading', { name: 'Initialize Shadcn' })).not.toBeInTheDocument();
    expect(screen.getByText(/# Optional: run if components.json does not exist/)).toBeInTheDocument();
    expect(container.querySelector('[data-installation-project-content="existing"]')).toBeInTheDocument();
  });

  it('shows numbered alias setup for an existing React Vite and Tailwind app', () => {
    registryStyling.set('tailwind');
    template.set('vite');

    render(<RegistryInitCommandClient framework="react" installation />);

    expect(screen.getByRole('heading', { name: 'Configure tsconfig.json' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Initialize Shadcn' })).toBeInTheDocument();
    expect(screen.getByText(/# Optional: run if components.json does not exist/)).toBeInTheDocument();
  });

  it('does not number a single configuration block', () => {
    registryStyling.set('css');
    template.set('start');

    render(<RegistryInitCommandClient framework="react" installation />);

    expect(screen.queryByRole('heading', { name: 'Create components.json' })).not.toBeInTheDocument();
    expect(screen.getByText(/"components": "@\/components"/)).toBeInTheDocument();
  });

  it('shows every HTML alias and components configuration as a step', () => {
    framework.set('html');
    registryStyling.set('css');
    template.set('vite');

    render(<RegistryInitCommandClient framework="html" installation />);

    expect(screen.getByRole('heading', { name: 'Configure tsconfig.json' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Configure vite.config.ts' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Create components.json' })).toBeInTheDocument();
  });
});
