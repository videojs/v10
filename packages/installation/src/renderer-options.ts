import type { UseCase } from './presets';
import { getInstallationPreset } from './presets';
import { getInstallationRenderer, type Renderer } from './renderers';

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
