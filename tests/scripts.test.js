const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { injectSettings, removeSettings } = require('../scripts/postinstall.js');

describe('postinstall / preuninstall', () => {
  let tmpDir;
  let settingsPath;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-test-'));
    settingsPath = path.join(tmpDir, 'settings.json');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('injectSettings', () => {
    it('creates settings file if it does not exist', () => {
      injectSettings(settingsPath);
      const content = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      assert.deepStrictEqual(content.statusLine, {
        type: 'command',
        command: 'claude-cli-plugin-usage',
        padding: 0,
      });
    });

    it('adds statusLine to existing settings without overwriting other keys', () => {
      fs.writeFileSync(settingsPath, JSON.stringify({ theme: 'dark' }));
      injectSettings(settingsPath);
      const content = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      assert.strictEqual(content.theme, 'dark');
      assert.deepStrictEqual(content.statusLine, {
        type: 'command',
        command: 'claude-cli-plugin-usage',
        padding: 0,
      });
    });

    it('returns "skipped" if statusLine already exists with different command', () => {
      fs.writeFileSync(settingsPath, JSON.stringify({
        statusLine: { type: 'command', command: 'other-tool' },
      }));
      const result = injectSettings(settingsPath);
      assert.strictEqual(result, 'skipped');
      const content = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      assert.strictEqual(content.statusLine.command, 'other-tool');
    });

    it('returns "exists" if already configured with our command', () => {
      fs.writeFileSync(settingsPath, JSON.stringify({
        statusLine: { type: 'command', command: 'claude-cli-plugin-usage' },
      }));
      const result = injectSettings(settingsPath);
      assert.strictEqual(result, 'exists');
    });
  });

  describe('removeSettings', () => {
    it('removes statusLine if it matches our command', () => {
      fs.writeFileSync(settingsPath, JSON.stringify({
        theme: 'dark',
        statusLine: { type: 'command', command: 'claude-cli-plugin-usage' },
      }));
      removeSettings(settingsPath);
      const content = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      assert.strictEqual(content.theme, 'dark');
      assert.strictEqual(content.statusLine, undefined);
    });

    it('does not remove statusLine if command is different', () => {
      fs.writeFileSync(settingsPath, JSON.stringify({
        statusLine: { type: 'command', command: 'other-tool' },
      }));
      removeSettings(settingsPath);
      const content = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      assert.strictEqual(content.statusLine.command, 'other-tool');
    });

    it('does nothing if settings file does not exist', () => {
      assert.doesNotThrow(() => removeSettings(settingsPath));
    });
  });
});
