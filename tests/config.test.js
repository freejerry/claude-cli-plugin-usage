const { describe, it } = require('node:test');
const assert = require('node:assert');
const { mergeConfig, DEFAULT_CONFIG } = require('../src/config.js');

describe('config', () => {
  it('returns defaults when no user config', () => {
    const result = mergeConfig(null);
    assert.deepStrictEqual(result, DEFAULT_CONFIG);
  });

  it('merges partial user config over defaults', () => {
    const userConfig = {
      theme: 'solarized',
      contextBar: { width: 15 },
    };
    const result = mergeConfig(userConfig);
    assert.strictEqual(result.theme, 'solarized');
    assert.strictEqual(result.contextBar.width, 15);
    assert.strictEqual(result.contextBar.thresholds.warn, 60);
    assert.deepStrictEqual(result.segments, DEFAULT_CONFIG.segments);
  });

  it('overrides segment order', () => {
    const userConfig = { segments: ['context', 'model'] };
    const result = mergeConfig(userConfig);
    assert.deepStrictEqual(result.segments, ['context', 'model']);
  });
});
