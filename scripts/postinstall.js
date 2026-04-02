'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const STATUSLINE_CONFIG = {
  type: 'command',
  command: 'claude-cli-plugin-usage',
};

function injectSettings(settingsPath) {
  let settings = {};
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch {
    // File doesn't exist or is invalid — start fresh
  }

  if (settings.statusLine) {
    if (settings.statusLine.command === STATUSLINE_CONFIG.command) {
      return 'exists';
    }
    return 'skipped';
  }

  settings.statusLine = { ...STATUSLINE_CONFIG };
  const dir = path.dirname(settingsPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  return 'injected';
}

function removeSettings(settingsPath) {
  let settings;
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch {
    return;
  }

  if (settings.statusLine?.command !== STATUSLINE_CONFIG.command) return;

  delete settings.statusLine;
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
}

// Run when executed directly (npm postinstall)
if (require.main === module) {
  const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
  const result = injectSettings(settingsPath);
  if (result === 'injected') {
    console.log('✅ claude-cli-plugin-usage: statusLine configured in ~/.claude/settings.json');
  } else if (result === 'skipped') {
    console.log('⚠️  claude-cli-plugin-usage: statusLine already configured with a different command.');
    console.log('   To use this plugin, manually set statusLine.command to "claude-cli-plugin-usage" in ~/.claude/settings.json');
  } else {
    console.log('✅ claude-cli-plugin-usage: already configured');
  }
}

module.exports = { injectSettings, removeSettings };
