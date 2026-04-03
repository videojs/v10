import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const CONFIG_FILE = join(homedir(), '.videojs', 'config.json');

interface CliConfig {
  framework?: 'html' | 'react';
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

export function getConfigValue(key: string): string | undefined {
  const config = readConfig();
  return config[key as keyof CliConfig];
}

export function setConfigValue(key: string, value: string): void {
  const config = readConfig();
  (config as Record<string, string>)[key] = value;
  writeConfig(config);
}

export function listConfig(): CliConfig {
  return readConfig();
}
