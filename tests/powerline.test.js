const { describe, it } = require('node:test');
const assert = require('node:assert');
const { render, buildProgressBar, buildSegment } = require('../src/powerline.js');
const { DEFAULT_CONFIG } = require('../src/config.js');
const { getTheme } = require('../src/theme.js');

describe('powerline', () => {
  describe('buildProgressBar', () => {
    it('renders 0%', () => {
      const bar = buildProgressBar(0, 10);
      assert.strictEqual(bar, '░░░░░░░░░░');
    });

    it('renders 100%', () => {
      const bar = buildProgressBar(100, 10);
      assert.strictEqual(bar, '██████████');
    });

    it('renders 50%', () => {
      const bar = buildProgressBar(50, 10);
      assert.strictEqual(bar, '█████░░░░░');
    });

    it('renders with custom width', () => {
      const bar = buildProgressBar(50, 6);
      assert.strictEqual(bar, '███░░░');
    });
  });

  describe('buildSegment', () => {
    it('renders text with bg and fg color', () => {
      const result = buildSegment(' hello ', 25, 255);
      assert.ok(result.includes('\x1b[48;5;25m'));
      assert.ok(result.includes('\x1b[38;5;255m'));
      assert.ok(result.includes(' hello '));
    });
  });

  describe('render', () => {
    const theme = getTheme('default');

    it('renders full powerline for Pro user', () => {
      const parsed = {
        modelName: 'Opus 4.6',
        branch: 'main',
        contextPercent: 45,
        contextWindowSize: 200000,
        fiveHourPercent: 32,
        sevenDayPercent: 15,
        fiveHourResetsAt: 1743580800,
        sevenDayResetsAt: 1744012800,
        costUsd: null,
      };
      const result = render(parsed, 'pro', DEFAULT_CONFIG);
      assert.ok(result.includes('Opus 4.6'));
      assert.ok(result.includes('main'));
      assert.ok(result.includes('45%'));
      assert.ok(result.includes('32%'));
      assert.ok(result.includes('15%'));
    });

    it('hides git segment when branch is null', () => {
      const parsed = {
        modelName: 'Sonnet 4.6',
        branch: null,
        contextPercent: 60,
        contextWindowSize: 200000,
        fiveHourPercent: 50,
        sevenDayPercent: 20,
        fiveHourResetsAt: null,
        sevenDayResetsAt: null,
        costUsd: null,
      };
      const result = render(parsed, 'pro', DEFAULT_CONFIG);
      assert.ok(result.includes('Sonnet 4.6'));
      assert.ok(!result.includes('\ue0a0'));
    });

    it('shows cost instead of rate limits for API user', () => {
      const parsed = {
        modelName: 'Opus 4.6',
        branch: 'dev',
        contextPercent: 30,
        contextWindowSize: 200000,
        fiveHourPercent: null,
        sevenDayPercent: null,
        fiveHourResetsAt: null,
        sevenDayResetsAt: null,
        costUsd: 4.56,
      };
      const result = render(parsed, 'api', DEFAULT_CONFIG);
      assert.ok(result.includes('$4.56'));
      assert.ok(!result.includes('5h'));
    });

    it('hides last segment for free user', () => {
      const parsed = {
        modelName: 'Sonnet 4.6',
        branch: 'main',
        contextPercent: 20,
        contextWindowSize: 200000,
        fiveHourPercent: null,
        sevenDayPercent: null,
        fiveHourResetsAt: null,
        sevenDayResetsAt: null,
        costUsd: null,
      };
      const result = render(parsed, 'free', DEFAULT_CONFIG);
      assert.ok(result.includes('Sonnet 4.6'));
      assert.ok(result.includes('20%'));
      assert.ok(!result.includes('5h'));
      assert.ok(!result.includes('$'));
    });

    it('respects custom segment order', () => {
      const parsed = {
        modelName: 'Opus 4.6',
        branch: 'main',
        contextPercent: 50,
        contextWindowSize: 200000,
        fiveHourPercent: 10,
        sevenDayPercent: 5,
        fiveHourResetsAt: null,
        sevenDayResetsAt: null,
        costUsd: null,
      };
      const config = { ...DEFAULT_CONFIG, segments: ['context', 'model'] };
      const result = render(parsed, 'pro', config);
      const ctxIdx = result.indexOf('50%');
      const modelIdx = result.indexOf('Opus 4.6');
      assert.ok(ctxIdx < modelIdx, 'context should appear before model');
    });
  });
});
