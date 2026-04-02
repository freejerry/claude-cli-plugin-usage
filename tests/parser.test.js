const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { parseInput } = require('../src/parser.js');

const loadFixture = (name) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8'));

describe('parser', () => {
  it('extracts all fields from complete input', () => {
    const raw = loadFixture('sample-input.json');
    const result = parseInput(raw);

    assert.strictEqual(result.modelName, 'Opus 4.6');
    assert.strictEqual(result.branch, 'main');
    assert.strictEqual(result.contextPercent, 78.5);
    assert.strictEqual(result.contextWindowSize, 200000);
    assert.strictEqual(result.fiveHourPercent, 32.5);
    assert.strictEqual(result.fiveHourResetsAt, 1743580800);
    assert.strictEqual(result.sevenDayPercent, 15.2);
    assert.strictEqual(result.sevenDayResetsAt, 1744012800);
    assert.strictEqual(result.costUsd, 1.23);
  });

  it('handles missing rate_limits (API user)', () => {
    const raw = loadFixture('sample-input.json');
    raw.rate_limits = null;
    const result = parseInput(raw);

    assert.strictEqual(result.fiveHourPercent, null);
    assert.strictEqual(result.sevenDayPercent, null);
    assert.strictEqual(result.costUsd, 1.23);
  });

  it('handles missing cost (free user)', () => {
    const raw = loadFixture('sample-input.json');
    raw.cost = null;
    raw.rate_limits = null;
    const result = parseInput(raw);

    assert.strictEqual(result.costUsd, null);
    assert.strictEqual(result.fiveHourPercent, null);
  });

  it('handles missing worktree/branch', () => {
    const raw = loadFixture('sample-input.json');
    raw.worktree = null;
    const result = parseInput(raw);

    assert.strictEqual(result.branch, null);
  });

  it('handles completely empty object', () => {
    const result = parseInput({});

    assert.strictEqual(result.modelName, null);
    assert.strictEqual(result.branch, null);
    assert.strictEqual(result.contextPercent, null);
    assert.strictEqual(result.fiveHourPercent, null);
    assert.strictEqual(result.costUsd, null);
  });
});
