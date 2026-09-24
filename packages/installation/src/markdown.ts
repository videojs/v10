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
      const templates = (compatibility.templatesByFramework[framework] ?? []).map((value) => `\`${value}\``).join(', ');
      const stylings = (compatibility.shadcn.stylingsByFramework[framework] ?? [])
        .map((value) => `\`${value}\``)
        .join(', ');

      return `- \`${framework}\`: app setups ${templates}; Shadcn styling ${stylings}`;
    })
    .join('\n');

  const packageDescription = frameworks.includes('react')
    ? frameworks.length === 1
      ? '- `@videojs/react` generates React instructions.'
      : '- `@videojs/react` generates React instructions. `@videojs/html` generates HTML, Vue, or Svelte instructions.'
    : '- `@videojs/html` generates HTML, Vue, or Svelte instructions.';
  const cdnDescription = frameworks.some((framework) => compatibility.methodsByFramework[framework]?.includes('cdn'))
    ? '\n- CDN is plain HTML only. Use `none` for an existing page or `vite` only when scaffolding a missing app.'
    : '';
  const shadcnDescription = frameworks.includes('react')
    ? frameworks.length === 1
      ? '- Shadcn installs editable React skin source.'
      : '- Shadcn installs editable React or HTML skin source. Vue and Svelte use the HTML source catalog.'
    : '- Shadcn installs editable HTML skin source. Vue and Svelte use the HTML source catalog.';

  return `${packageDescription}${cdnDescription}
${shadcnDescription}
- The \`none\` app setup is available only for plain HTML with Packaged or CDN. Shadcn requires a named app setup.
- Shadcn presets: ${compatibility.shadcn.presets.map((value) => `\`${value}\``).join(', ')}.
- Shadcn skins: ${compatibility.shadcn.skins.map((value) => `\`${value}\``).join(', ')}.

### Media sources by preset

${mediaCompatibility}

### App setup and Shadcn styling by framework

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

  const decisions = discovery.decisionOrder
    .map(({ title, guidance }, index) => `${index + 1}. **${title}.** ${guidance}`)
    .join('\n');

  return `# Video.js installation instruction options

Package: \`${discovery.package}@${discovery.packageVersion}\`

${discovery.notice}

## Usage

${fenced('sh', discovery.command)}

Running the command above without selection flags shows this option reference and exits successfully. Add any selection flag to receive complete instructions; omitted choices use the defaults below.

## Decide in this order

${decisions}

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

Generated for \`${plan.package}@${plan.packageVersion}\`. The selections below correspond to CLI flags. On the installation site, the page route chooses the method and usually the framework; query parameters choose the remaining options. Change them with the command shown under **Reproduce or change these instructions**, or see the bare command for every valid option.

${renderInstallationPlanSections(plan)}
## Next steps

${plan.next.map(({ label, url }) => `- [${label}](${url})`).join('\n')}
`;
}

export function renderInstallationPlanSections(plan: InstallationPlan): string {
  const relevantDefaulted = plan.selection.defaulted.filter(
    (key) => key !== 'skin' || plan.selection.useCase !== 'background-video'
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

  selected.push(['package-manager', plan.selection.packageManager]);
  selected.push(['template', plan.selection.template]);

  if (plan.selection.styling) selected.push(['styling', plan.selection.styling]);

  const selection = selected.map(([key, value]) => `- \`${key}\`: ${inlineCode(value)}`).join('\n');
  const steps = plan.steps
    .map((step) => {
      const description = step.description ? `\n${step.description}\n` : '';
      const blocks = step.blocks
        .map((block) => {
          const heading = block.filename ? `### \`${block.filename}\`\n\n` : '';
          const operation =
            block.operation === 'create'
              ? '_Create this file._\n\n'
              : block.operation === 'replace'
                ? `_Replace ${block.anchor ? inlineCode(block.anchor) : 'the matching placeholder'} with this block._\n\n`
                : block.operation === 'merge'
                  ? '_Merge this into the existing file, or create the file when it is missing._\n\n'
                  : '';

          return `${heading}${operation}${fenced(block.language, block.code)}`;
        })
        .join('\n\n');

      const condition =
        step.condition === 'when-no-compatible-app'
          ? '\n_Only when the project needs an app scaffold._\n'
          : step.condition === 'when-components-json-missing'
            ? '\n_Only when components.json is missing._\n'
            : step.condition === 'when-existing-app'
              ? '\n_Only when adapting an existing app._\n'
              : step.condition === 'when-existing-app-without-components-json'
                ? '\n_Only for an existing app without components.json._\n'
                : '';

      return `## ${step.title}\n${condition}${description}\n${blocks}`;
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
