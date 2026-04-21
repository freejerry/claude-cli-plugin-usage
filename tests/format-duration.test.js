const { describe, it } = require('node:test');
const assert = require('node:assert');
const { formatResetDelta } = require('../src/format-duration.js');

describe('formatResetDelta', () => {
  const NOW = 1_700_000_000; // fixed reference

  it('returns null when resetsAt is null', () => {
    assert.strictEqual(formatResetDelta(null, NOW), null);
  });

  it('returns null when resetsAt is undefined', () => {
    assert.strictEqual(formatResetDelta(undefined, NOW), null);
  });

  it('returns null when resetsAt is not a number', () => {
    assert.strictEqual(formatResetDelta('1700000000', NOW), null);
    assert.strictEqual(formatResetDelta(NaN, NOW), null);
  });

  it('returns em-dash when delta is zero', () => {
    assert.strictEqual(formatResetDelta(NOW, NOW), '—');
  });

  it('returns em-dash when delta is negative', () => {
    assert.strictEqual(formatResetDelta(NOW - 60, NOW), '—');
  });

  it('formats sub-minute delta as <1m', () => {
    assert.strictEqual(formatResetDelta(NOW + 30, NOW), '<1m');
    assert.strictEqual(formatResetDelta(NOW + 59, NOW), '<1m');
  });

  it('formats minute-only delta as Xm', () => {
    assert.strictEqual(formatResetDelta(NOW + 60, NOW), '1m');
    assert.strictEqual(formatResetDelta(NOW + 45 * 60, NOW), '45m');
    assert.strictEqual(formatResetDelta(NOW + 59 * 60 + 59, NOW), '59m');
  });

  it('formats hour+minute delta as XhYm', () => {
    assert.strictEqual(formatResetDelta(NOW + 60 * 60, NOW), '1h0m');
    assert.strictEqual(formatResetDelta(NOW + 2 * 60 * 60 + 15 * 60, NOW), '2h15m');
    assert.strictEqual(formatResetDelta(NOW + 23 * 60 * 60 + 59 * 60, NOW), '23h59m');
  });

  it('formats day+hour delta as XdYh', () => {
    assert.strictEqual(formatResetDelta(NOW + 24 * 60 * 60, NOW), '1d0h');
    assert.strictEqual(formatResetDelta(NOW + 3 * 24 * 60 * 60 + 12 * 60 * 60, NOW), '3d12h');
    assert.strictEqual(formatResetDelta(NOW + 7 * 24 * 60 * 60, NOW), '7d0h');
  });
});
