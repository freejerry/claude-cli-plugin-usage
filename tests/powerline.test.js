const { describe, it } = require('node:test');
const assert = require('node:assert');
const { render, buildProgressBar, buildSegment, visibleLength, stripAnsi } = require('../src/powerline.js');
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

  describe('stripAnsi', () => {
    it('removes ANSI escape codes', () => {
      assert.strictEqual(stripAnsi('\x1b[48;5;25mhello\x1b[0m'), 'hello');
    });

    it('returns plain text unchanged', () => {
      assert.strictEqual(stripAnsi('hello'), 'hello');
    });
  });

  describe('visibleLength', () => {
    it('counts plain ASCII as 1 each', () => {
      assert.strictEqual(visibleLength('hello'), 5);
    });

    it('counts emoji as 2 wide', () => {
      assert.strictEqual(visibleLength('🧠'), 2);
    });

    it('ignores ANSI codes', () => {
      assert.strictEqual(visibleLength('\x1b[48;5;25mAB\x1b[0m'), 2);
    });

    it('counts powerline arrow as 2 wide', () => {
      assert.strictEqual(visibleLength('\ue0b0'), 2);
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

    it('renders second line with session name', () => {
      const parsed = {
        modelName: 'Opus 4.6',
        branch: 'main',
        contextPercent: 45,
        contextWindowSize: 200000,
        fiveHourPercent: null,
        sevenDayPercent: null,
        fiveHourResetsAt: null,
        sevenDayResetsAt: null,
        costUsd: null,
        sessionName: 'mvp',
      };
      const result = render(parsed, 'free', DEFAULT_CONFIG);
      assert.ok(result.includes('\n'), 'output should contain a newline');
      assert.ok(result.includes('📁 mvp'), 'second line should show session');
    });

    it('omits second line entirely when disabled', () => {
      const parsed = {
        modelName: 'Opus 4.6',
        branch: 'main',
        contextPercent: 45,
        contextWindowSize: 200000,
        fiveHourPercent: null,
        sevenDayPercent: null,
        fiveHourResetsAt: null,
        sevenDayResetsAt: null,
        costUsd: null,
        sessionName: 'mvp',
      };
      const config = {
        ...DEFAULT_CONFIG,
        secondLine: { enabled: false, show: ['session', 'resets'] },
      };
      const result = render(parsed, 'free', config);
      assert.ok(!result.includes('\n'), 'output should not contain a newline');
      assert.ok(!result.includes('📁'), 'no session icon');
    });

    it('omits second line when sessionName is null and no resets available', () => {
      const parsed = {
        modelName: 'Opus 4.6',
        branch: null,
        contextPercent: 45,
        contextWindowSize: 200000,
        fiveHourPercent: null,
        sevenDayPercent: null,
        fiveHourResetsAt: null,
        sevenDayResetsAt: null,
        costUsd: null,
        sessionName: null,
      };
      const result = render(parsed, 'free', DEFAULT_CONFIG);
      assert.ok(!result.includes('\n'), 'no newline when second line would be empty');
    });

    it('renders second line with 5h and 7d countdown for Pro user', () => {
      const NOW = 1_700_000_000;
      const parsed = {
        modelName: 'Opus 4.6',
        branch: 'main',
        contextPercent: 45,
        contextWindowSize: 200000,
        fiveHourPercent: 32,
        sevenDayPercent: 15,
        fiveHourResetsAt: NOW + 2 * 3600 + 15 * 60, // 2h15m
        sevenDayResetsAt: NOW + 3 * 86400 + 12 * 3600, // 3d12h
        costUsd: null,
        sessionName: 'mvp',
      };
      const result = render(parsed, 'pro', DEFAULT_CONFIG, NOW);
      assert.ok(result.includes('📁 mvp'));
      assert.ok(result.includes('↻ 5h 2h15m'));
      assert.ok(result.includes('7d 3d12h'));
    });

    it('hides resets block for API plan', () => {
      const NOW = 1_700_000_000;
      const parsed = {
        modelName: 'Opus 4.6',
        branch: 'main',
        contextPercent: 45,
        contextWindowSize: 200000,
        fiveHourPercent: null,
        sevenDayPercent: null,
        fiveHourResetsAt: NOW + 3600,
        sevenDayResetsAt: NOW + 86400,
        costUsd: 1.23,
        sessionName: 'mvp',
      };
      const result = render(parsed, 'api', DEFAULT_CONFIG, NOW);
      assert.ok(result.includes('📁 mvp'));
      assert.ok(!result.includes('↻'), 'no reset icon for API plan');
    });

    it('hides resets block for free plan', () => {
      const NOW = 1_700_000_000;
      const parsed = {
        modelName: 'Sonnet 4.6',
        branch: 'main',
        contextPercent: 20,
        contextWindowSize: 200000,
        fiveHourPercent: null,
        sevenDayPercent: null,
        fiveHourResetsAt: NOW + 3600,
        sevenDayResetsAt: NOW + 86400,
        costUsd: null,
        sessionName: 'mvp',
      };
      const result = render(parsed, 'free', DEFAULT_CONFIG, NOW);
      assert.ok(result.includes('📁 mvp'));
      assert.ok(!result.includes('↻'));
    });

    it('shows only 7d when 5h resets_at is null', () => {
      const NOW = 1_700_000_000;
      const parsed = {
        modelName: 'Opus 4.6',
        branch: 'main',
        contextPercent: 45,
        contextWindowSize: 200000,
        fiveHourPercent: 32,
        sevenDayPercent: 15,
        fiveHourResetsAt: null,
        sevenDayResetsAt: NOW + 2 * 86400,
        costUsd: null,
        sessionName: 'mvp',
      };
      const result = render(parsed, 'pro', DEFAULT_CONFIG, NOW);
      assert.ok(!result.includes('↻ 5h'), 'no 5h label in resets block');
      assert.ok(result.includes('↻ 7d 2d0h'));
    });

    it('shows em-dash when reset is in the past', () => {
      const NOW = 1_700_000_000;
      const parsed = {
        modelName: 'Opus 4.6',
        branch: 'main',
        contextPercent: 45,
        contextWindowSize: 200000,
        fiveHourPercent: 32,
        sevenDayPercent: 15,
        fiveHourResetsAt: NOW - 60,
        sevenDayResetsAt: NOW + 86400,
        costUsd: null,
        sessionName: 'mvp',
      };
      const result = render(parsed, 'pro', DEFAULT_CONFIG, NOW);
      assert.ok(result.includes('5h —'));
    });

    it('honors custom secondLine.show order and filtering', () => {
      const NOW = 1_700_000_000;
      const parsed = {
        modelName: 'Opus 4.6',
        branch: 'main',
        contextPercent: 45,
        contextWindowSize: 200000,
        fiveHourPercent: 32,
        sevenDayPercent: 15,
        fiveHourResetsAt: NOW + 3600,
        sevenDayResetsAt: NOW + 86400,
        costUsd: null,
        sessionName: 'mvp',
      };
      const config = {
        ...DEFAULT_CONFIG,
        secondLine: { enabled: true, show: ['resets'] },
      };
      const result = render(parsed, 'pro', config, NOW);
      assert.ok(!result.includes('📁'), 'session hidden');
      assert.ok(result.includes('↻'), 'resets shown');
    });

    it('renders second line alone when first line has no segments', () => {
      const parsed = {
        modelName: null,
        branch: null,
        contextPercent: null,
        contextWindowSize: null,
        fiveHourPercent: null,
        sevenDayPercent: null,
        fiveHourResetsAt: null,
        sevenDayResetsAt: null,
        costUsd: null,
        sessionName: 'mvp',
      };
      const config = { ...DEFAULT_CONFIG, segments: [] };
      const result = render(parsed, 'free', config);
      assert.ok(!result.startsWith('\n'), 'should not have leading newline');
      assert.ok(result.includes('📁 mvp'));
    });
  });
});
