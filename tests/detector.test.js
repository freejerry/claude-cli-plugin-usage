const { describe, it } = require('node:test');
const assert = require('node:assert');
const { detectPlan } = require('../src/detector.js');

describe('detectPlan', () => {
  it('detects Max user (rate_limits + 1M context)', () => {
    const result = detectPlan({
      fiveHourPercent: 32,
      sevenDayPercent: 15,
      contextWindowSize: 1000000,
      costUsd: null,
    });
    assert.strictEqual(result, 'max');
  });

  it('detects Pro user (rate_limits + 200k context)', () => {
    const result = detectPlan({
      fiveHourPercent: 32,
      sevenDayPercent: 15,
      contextWindowSize: 200000,
      costUsd: null,
    });
    assert.strictEqual(result, 'pro');
  });

  it('detects API user (no rate_limits + has cost)', () => {
    const result = detectPlan({
      fiveHourPercent: null,
      sevenDayPercent: null,
      contextWindowSize: 200000,
      costUsd: 1.23,
    });
    assert.strictEqual(result, 'api');
  });

  it('detects Free user (no rate_limits, no cost)', () => {
    const result = detectPlan({
      fiveHourPercent: null,
      sevenDayPercent: null,
      contextWindowSize: 200000,
      costUsd: null,
    });
    assert.strictEqual(result, 'free');
  });
});
