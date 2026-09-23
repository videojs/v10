import type { InstallationDiscovery, InstallationPlan } from './plan';
import type { SelectionError } from './selection';

function fenced(language: string, value: string): string {
  const marker = value.includes('```') ? '````' : '```';

  return `${marker}${language}\n${value}\n${marker}`;
}

export function renderDiscoveryMarkdown(discovery: InstallationDiscovery): string {
  const options = discovery.options
    .map((option) => {
      const values = option.values ? ` Values: ${option.values.map((value) => `\`${value}\``).join(', ')}.` : '';
      const applies = option.appliesWhen ? ` Applies when ${option.appliesWhen}.` : '';

      return `- \`${option.flag}\`: ${option.description}${values} Default: ${option.default}.${applies}`;
    })
    .join('\n');

  return `# Video.js installation instruction options

Package: \`${discovery.package}@${discovery.packageVersion}\`

${discovery.notice}

## Usage

${fenced('sh', discovery.command)}

Running the command above without selection flags shows this option reference and exits successfully. Add any selection flag to receive complete instructions; omitted choices use the defaults below.

## Options

${options}

Compatibility rules:

- \`@videojs/react\` generates React instructions. \`@videojs/html\` generates HTML, Vue, or Svelte instructions.
- CDN is plain HTML only.
- Shadcn installs editable React or HTML skin source. Vue and Svelte use the HTML source catalog.
- Background Video and a skinless player are not available from the Shadcn registry.
- A preset limits the compatible skin and media choices.

## Examples

${discovery.examples.map((example) => fenced('sh', example)).join('\n\n')}
`;
}

export function renderInstallationMarkdown(plan: InstallationPlan): string {
  const title =
    plan.selection.framework === 'react'
      ? 'React'
      : plan.selection.framework === 'html'
        ? 'HTML'
        : plan.selection.framework === 'vue'
          ? 'Vue'
          : 'Svelte';

  return `# ${title} installation instructions

Generated for \`${plan.package}@${plan.packageVersion}\`. The selections below correspond to CLI flags and installation-page query parameters. Change them with the command shown under **Reproduce or change these instructions**, or see the bare command for every valid option.

${renderInstallationPlanSections(plan)}
`;
}

export function renderInstallationPlanSections(plan: InstallationPlan): string {
  const relevantDefaulted = plan.selection.defaulted.filter(
    (key) => key !== 'packageManager' || plan.selection.method !== 'cdn'
  );
  const defaulted =
    relevantDefaulted.length > 0
      ? relevantDefaulted
          .map((key) => (key === 'sourceUrl' ? 'source-url' : key === 'packageManager' ? 'package-manager' : key))
          .join(', ')
      : 'none';
  const selected = [
    ['method', plan.selection.method],
    ['framework', plan.selection.framework],
    ['preset', plan.selection.preset],
    ['skin', plan.selection.skinFlag],
    ['media', plan.selection.media],
    ['source-url', plan.resolvedSourceUrl],
    ...(plan.selection.method !== 'cdn' ? [['package-manager', plan.selection.packageManager]] : []),
    ...(plan.selection.template ? [['template', plan.selection.template]] : []),
    ...(plan.selection.styling ? [['styling', plan.selection.styling]] : []),
  ] as Array<[string, string]>;
  const selection = selected.map(([key, value]) => `- \`${key}\`: \`${value}\``).join('\n');
  const steps = plan.steps
    .map((step) => {
      const description = step.description ? `\n${step.description}\n` : '';
      const blocks = step.blocks
        .map((block) => `${block.filename ? `### \`${block.filename}\`\n\n` : ''}${fenced(block.language, block.code)}`)
        .join('\n\n');

      return `## ${step.title}\n${description}\n${blocks}`;
    })
    .join('\n\n');

  return `## Selected options

${selection}

Defaulted options: ${defaulted}.

## Reproduce or change these instructions

${fenced('sh', plan.reproduceCommand)}

${steps}

## What to do next

${plan.next.map((item) => `- [${item.label}](${item.url})`).join('\n')}

> ${plan.notice}
`;
}

export function renderSelectionErrors(errors: readonly SelectionError[]): string {
  return `Invalid installation options:\n${errors.map((error) => `- ${error.field}: ${error.message}`).join('\n')}`;
}
