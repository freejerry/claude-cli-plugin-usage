'use strict';

const path = require('node:path');
const os = require('node:os');
const { removeSettings } = require('./postinstall.js');

const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
removeSettings(settingsPath);
console.log('🗑️  claude-cli-plugin-usage: statusLine config removed from ~/.claude/settings.json');
