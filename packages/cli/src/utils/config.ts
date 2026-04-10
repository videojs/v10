import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const CONFIG_FILE = join(homedir(), '.videojs', 'config.json');

export type Framework = 'html' | 'react';

interface CliConfig {
  framework?: Framework;
}

export function readConfig(): CliConfig {
  if (!existsSync(CONFIG_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8')) as CliConfig;
  } catch {
    return {};
  }
}

function writeConfig(config: CliConfig): void {
  const dir = dirname(CONFIG_FILE);
  mkdirSync(dir, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

const VALID_CONFIG: Record<keyof CliConfig, readonly string[]> = {
  framework: ['html', 'react'],
};

export function getConfigValue(key: string): string | undefined {
  if (!(key in VALID_CONFIG)) {
    throw new Error(`Unknown config key: "${key}". Valid keys: ${Object.keys(VALID_CONFIG).join(', ')}`);
  }
  const config = readConfig();
  return config[key as keyof CliConfig];
}

export function setConfigValue(key: string, value: string): void {
  const validValues = VALID_CONFIG[key as keyof CliConfig];
  if (!validValues) {
    throw new Error(`Unknown config key: "${key}". Valid keys: ${Object.keys(VALID_CONFIG).join(', ')}`);
  }
  if (!validValues.includes(value)) {
    throw new Error(`Invalid value "${value}" for "${key}". Valid values: ${validValues.join(', ')}`);
  }
  const config = readConfig();
  (config as Record<string, string>)[key] = value;
  writeConfig(config);
}

export function listConfig(): CliConfig {
  return readConfig();
}
