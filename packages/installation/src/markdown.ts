import { serializeInstallationExtensions } from './extensions';
import type { InstallationDiscoveryCompatibility } from './options';
import { installationParameterForKey } from './parameters';
import type { InstallationDiscovery, InstallationPlan } from './plan';
import { INSTALLATION_FRAMEWORKS } from './projects';
import { containsControlCharacter, selectionToInput, type SelectionError } from './selection';

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
      const shadcnStylings = stylings ? `; Shadcn styling ${stylings}` : '';

      return `- \`${framework}\`: app setups ${templates}${shadcnStylings}`;
    })
    .join('\n');

  const packageDescription = frameworks.includes('react')
    ? frameworks.length === 1
      ? '- React instructions install `@videojs/react`.'
      : '- React instructions install `@videojs/react`. HTML, Vue, and Svelte instructions install `@videojs/html`.'
    : '- HTML, Vue, and Svelte instructions install `@videojs/html`.';
  const cdnDescription = frameworks.some((framework) => compatibility.methodsByFramework[framework]?.includes('cdn'))
    ? '\n- CDN is plain HTML only. Use `--project existing --template none` for an existing page or `--project new --template vite` to scaffold a minimal app.'
    : '';
  const shadcnDescription = frameworks.includes('react')
    ? frameworks.length === 1
      ? '- Shadcn installs editable React skin source.'
      : '- Shadcn installs editable React or plain HTML skin source. Vue and Svelte use packaged installation.'
    : '- Shadcn installs editable plain HTML skin source. Vue and Svelte use packaged installation.';

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

export interface InstallationMarkdownOptions {
  /** A warning shown before the selections, such as a mismatch with the project's installed player version. */
  versionNotice?: string;
}

export function renderInstallationMarkdown(plan: InstallationPlan, options: InstallationMarkdownOptions = {}): string {
  const title = { react: 'React', html: 'HTML', vue: 'Vue', svelte: 'Svelte' }[plan.selection.framework];
  const versionNotice = options.versionNotice ? `> **Version mismatch.** ${options.versionNotice}\n\n` : '';

  return `# ${title} installation instructions

Generated by \`${plan.package}@${plan.packageVersion}\` for \`${plan.playerPackage}\`. The selections below correspond to CLI flags. Change them with the command shown under **Reproduce or change these instructions**, or run the bare \`agents init\` command for every valid option.

${versionNotice}${renderInstallationPlanSections(plan)}
## Next steps

${plan.next.map(({ label, url }) => `- [${label}](${url})`).join('\n')}
`;
}

export function renderInstallationPlanSections(plan: InstallationPlan): string {
  const relevantDefaulted = plan.selection.defaulted.filter(
    (key) => key !== 'skin' || plan.selection.useCase !== 'background-video'
  );
  const input = selectionToInput(plan.selection);
  const defaulted =
    relevantDefaulted.length > 0
      ? relevantDefaulted
          .map((key) => {
            const query = installationParameterForKey(key).query;
            const source = plan.selection.defaultSources[key];

            return source ? `${query} (${input[key]} from ${source})` : query;
          })
          .join(', ')
      : 'none';
  const selected: Array<[string, string]> = [
    ['method', plan.selection.method],
    ['framework', plan.selection.framework],
    ['project', plan.selection.project],
    ['preset', plan.selection.preset],
    ['media', plan.selection.media],
    ['extensions', serializeInstallationExtensions(plan.selection.extensions)],
    ['source-url', plan.resolvedSourceUrl],
  ];

  if (plan.selection.useCase !== 'background-video') selected.splice(3, 0, ['skin', plan.selection.skinFlag]);

  if (plan.selection.method !== 'cdn' || plan.selection.template !== 'none') {
    selected.push(['package-manager', plan.selection.packageManager]);
  }

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
        step.condition === 'when-components-json-missing' ? '\n_Only when components.json is missing._\n' : '';

      return `## ${step.title}\n${condition}${description}${blocks ? `\n${blocks}` : ''}`;
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

const MAX_ERROR_VALUE_LENGTH = 80;

/** Quote a rejected value on one line so line breaks and control characters cannot shape the terminal output. */
function errorValue(value: string): string {
  const characters = Array.from(value);
  const shown =
    characters.length > MAX_ERROR_VALUE_LENGTH ? [...characters.slice(0, MAX_ERROR_VALUE_LENGTH - 1), '…'] : characters;
  const escaped = shown
    .map((character) => {
      if (character === '"' || character === '\\') return `\\${character}`;

      if (!containsControlCharacter(character)) return character;

      return `\\u${character.codePointAt(0)!.toString(16).padStart(4, '0')}`;
    })
    .join('');

  return `"${escaped}"`;
}

export function renderSelectionErrors(errors: readonly SelectionError[]): string {
  return `Invalid installation options:\n${errors
    .map((error) => {
      const field = error.field === 'arguments' ? 'arguments' : installationParameterForKey(error.field).flag;
      const value = error.value === undefined ? '' : ` ${errorValue(error.value)}`;
      const hint = error.hint ? ` ${error.hint}` : '';

      return `- ${field}${value}: ${error.message}${hint}`;
    })
    .join('\n')}`;
}
