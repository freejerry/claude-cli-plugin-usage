const { describe, it } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const CLI_PATH = path.join(__dirname, '..', 'bin', 'cli.js');
const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'sample-input.json');

describe('integration: cli.js end-to-end', () => {
  it('renders powerline output for Pro user fixture', () => {
    const input = fs.readFileSync(FIXTURE_PATH, 'utf8');
    const result = execFileSync('node', [CLI_PATH], {
      input,
      encoding: 'utf8',
    });

    assert.ok(result.includes('Opus 4.6'), 'should contain model name');
    assert.ok(result.includes('main'), 'should contain branch');
    assert.ok(result.includes('79%') || result.includes('78%'), 'should contain context %');
    assert.ok(result.includes('33%') || result.includes('32%'), 'should contain 5h rate limit');
    assert.ok(result.includes('15%'), 'should contain 7d rate limit');
    assert.ok(result.includes('\x1b['), 'should contain ANSI escape codes');
    assert.ok(result.includes('\x1b[48;5;'), 'should contain powerline background color transitions');
  });

  it('renders gracefully for empty JSON input', () => {
    const result = execFileSync('node', [CLI_PATH], {
      input: '{}',
      encoding: 'utf8',
    });
    assert.strictEqual(result, '');
  });

  it('renders parse error for invalid JSON', () => {
    const result = execFileSync('node', [CLI_PATH], {
      input: 'not json',
      encoding: 'utf8',
    });
    assert.ok(result.includes('[claude-cli-plugin-usage: parse error]'));
  });

  it('renders cost for API user (no rate_limits)', () => {
    const fixture = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
    fixture.rate_limits = null;
    const result = execFileSync('node', [CLI_PATH], {
      input: JSON.stringify(fixture),
      encoding: 'utf8',
    });
    assert.ok(result.includes('$1.23'), 'should show cost');
    assert.ok(!result.includes('5h'), 'should not show rate limits');
  });
});
