import { getInstallationRenderer, type Renderer } from './renderers';
import type { UseCase } from './types';
import { getInstallationPreset } from './types';

export interface RendererOption {
  value: Renderer;
  label: string;
}

export function buildOptions(useCase: UseCase): RendererOption[] {
  return getInstallationPreset(useCase).renderers.map((r) => ({
    value: r,
    label: getInstallationRenderer(r).label,
  }));
}
