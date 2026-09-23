import type { InstallationDiscoveryCompatibility } from './options';
import { installationParameterForKey } from './parameters';
import type { InstallationDiscovery, InstallationPlan } from './plan';
import { INSTALLATION_FRAMEWORKS, type SelectionError } from './selection';

function fenced(language: string, value: string): string {
  const longestRun = Math.max(2, ...[...value.matchAll(/`+/g)].map((match) => match[0].length));
  const marker = '`'.repeat(longestRun + 1);

  return `${marker}${language}\n${value}\n${marker}`;
}

function inlineCode(value: string): string {
  const longestRun = Math.max(0, ...[...value.matchAll(/`+/g)].map((match) => match[0].length));
  const marker = '`'.repeat(longestRun + 1);
  const padding = /^[` ]|[` ]$/.test(value) ? ' ' : '';

  return `${marker}${padding}${value}${padding}${marker}`;
}

export function renderInstallationCompatibilityMarkdown(compatibility: InstallationDiscoveryCompatibility): string {
  const mediaCompatibility = Object.entries(compatibility.mediaByPreset)
    .map(([preset, media]) => `- \`${preset}\`: ${media.map((value) => `\`${value}\``).join(', ')}`)
    .join('\n');
  const frameworks = INSTALLATION_FRAMEWORKS.filter(
    (framework) => compatibility.methodsByFramework[framework] !== undefined
  );
  const shadcnCompatibility = frameworks
    .map((framework) => {
      const templates = (compatibility.shadcn.templatesByFramework[framework] ?? [])
        .map((value) => `\`${value}\``)
        .join(', ');
      const stylings = (compatibility.shadcn.stylingsByFramework[framework] ?? [])
        .map((value) => `\`${value}\``)
        .join(', ');

      return `- \`${framework}\`: templates ${templates}; styling ${stylings}`;
    })
    .join('\n');

  const packageDescription = frameworks.includes('react')
    ? frameworks.length === 1
      ? '- `@videojs/react` generates React instructions.'
      : '- `@videojs/react` generates React instructions. `@videojs/html` generates HTML, Vue, or Svelte instructions.'
    : '- `@videojs/html` generates HTML, Vue, or Svelte instructions.';
  const cdnDescription = frameworks.some((framework) => compatibility.methodsByFramework[framework]?.includes('cdn'))
    ? '\n- CDN is plain HTML only.'
    : '';
  const shadcnDescription = frameworks.includes('react')
    ? frameworks.length === 1
      ? '- Shadcn installs editable React skin source.'
      : '- Shadcn installs editable React or HTML skin source. Vue and Svelte use the HTML source catalog.'
    : '- Shadcn installs editable HTML skin source. Vue and Svelte use the HTML source catalog.';

  return `${packageDescription}${cdnDescription}
${shadcnDescription}
- Shadcn presets: ${compatibility.shadcn.presets.map((value) => `\`${value}\``).join(', ')}.
- Shadcn skins: ${compatibility.shadcn.skins.map((value) => `\`${value}\``).join(', ')}.

### Media sources by preset

${mediaCompatibility}

### Shadcn templates and styling by framework

${shadcnCompatibility}`;
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

## Compatibility

${renderInstallationCompatibilityMarkdown(discovery.compatibility)}

## Examples

${discovery.examples.map((example) => fenced('sh', example)).join('\n\n')}
`;
}

export function renderInstallationMarkdown(plan: InstallationPlan): string {
  const title = { react: 'React', html: 'HTML', vue: 'Vue', svelte: 'Svelte' }[plan.selection.framework];

  return `# ${title} installation instructions

Generated for \`${plan.package}@${plan.packageVersion}\`. The selections below correspond to CLI flags and installation-page query parameters. Change them with the command shown under **Reproduce or change these instructions**, or see the bare command for every valid option.

${renderInstallationPlanSections(plan)}
## Next steps

${plan.next.map(({ label, url }) => `- [${label}](${url})`).join('\n')}
`;
}

export function renderInstallationPlanSections(plan: InstallationPlan): string {
  const relevantDefaulted = plan.selection.defaulted.filter(
    (key) =>
      (key !== 'packageManager' || plan.selection.method !== 'cdn') &&
      (key !== 'skin' || plan.selection.useCase !== 'background-video')
  );
  const defaulted =
    relevantDefaulted.length > 0
      ? relevantDefaulted.map((key) => installationParameterForKey(key).query).join(', ')
      : 'none';
  const selected: Array<[string, string]> = [
    ['method', plan.selection.method],
    ['framework', plan.selection.framework],
    ['preset', plan.selection.preset],
    ['media', plan.selection.media],
    ['source-url', plan.resolvedSourceUrl],
  ];

  if (plan.selection.useCase !== 'background-video') selected.splice(3, 0, ['skin', plan.selection.skinFlag]);

  if (plan.selection.method !== 'cdn') selected.push(['package-manager', plan.selection.packageManager]);

  if (plan.selection.template) selected.push(['template', plan.selection.template]);

  if (plan.selection.styling) selected.push(['styling', plan.selection.styling]);

  const selection = selected.map(([key, value]) => `- \`${key}\`: ${inlineCode(value)}`).join('\n');
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

> ${plan.notice}
`;
}

export function renderSelectionErrors(errors: readonly SelectionError[]): string {
  return `Invalid installation options:\n${errors
    .map((error) => {
      const field = error.field === 'arguments' ? 'arguments' : installationParameterForKey(error.field).flag;

      return `- ${field}: ${error.message}`;
    })
    .join('\n')}`;
}
