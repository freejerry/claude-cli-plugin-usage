'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const DEFAULT_CONFIG = {
  theme: 'default',
  segments: ['model', 'git', 'context', 'ratelimit'],
  contextBar: {
    width: 10,
    thresholds: { warn: 60, danger: 80 },
  },
  ratelimit: {
    thresholds: { warn: 60, danger: 80 },
  },
  secondLine: {
    enabled: true,
    show: ['session', 'resets'],
  },
};

function mergeConfig(userConfig) {
  if (!userConfig) return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  return {
    theme: userConfig.theme ?? DEFAULT_CONFIG.theme,
    segments: userConfig.segments ?? [...DEFAULT_CONFIG.segments],
    contextBar: {
      width: userConfig.contextBar?.width ?? DEFAULT_CONFIG.contextBar.width,
      thresholds: {
        warn: userConfig.contextBar?.thresholds?.warn ?? DEFAULT_CONFIG.contextBar.thresholds.warn,
        danger: userConfig.contextBar?.thresholds?.danger ?? DEFAULT_CONFIG.contextBar.thresholds.danger,
      },
    },
    ratelimit: {
      thresholds: {
        warn: userConfig.ratelimit?.thresholds?.warn ?? DEFAULT_CONFIG.ratelimit.thresholds.warn,
        danger: userConfig.ratelimit?.thresholds?.danger ?? DEFAULT_CONFIG.ratelimit.thresholds.danger,
      },
    },
    secondLine: {
      enabled: userConfig.secondLine?.enabled ?? DEFAULT_CONFIG.secondLine.enabled,
      show: userConfig.secondLine?.show ?? [...DEFAULT_CONFIG.secondLine.show],
    },
  };
}

function loadConfig() {
  const configPath = path.join(os.homedir(), '.claude', 'claude-cli-plugin-usage.json');
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    return mergeConfig(JSON.parse(content));
  } catch {
    return mergeConfig(null);
  }
}

module.exports = { loadConfig, mergeConfig, DEFAULT_CONFIG };
