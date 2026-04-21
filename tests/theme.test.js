const { describe, it } = require('node:test');
const assert = require('node:assert');
const { getTheme, ansi256Bg, ansi256Fg, reset, buildTransition } = require('../src/theme.js');

describe('theme', () => {
  describe('getTheme', () => {
    it('returns default theme colors', () => {
      const theme = getTheme('default');
      assert.ok(theme.model, 'should have model color');
      assert.ok(theme.git, 'should have git color');
      assert.ok(theme.contextOk, 'should have contextOk color');
      assert.ok(theme.contextWarn, 'should have contextWarn color');
      assert.ok(theme.contextDanger, 'should have contextDanger color');
      assert.ok(theme.ratelimit, 'should have ratelimit color');
    });

    it('returns default theme when name is unknown', () => {
      const theme = getTheme('nonexistent');
      const def = getTheme('default');
      assert.deepStrictEqual(theme, def);
    });

    it('default theme has secondaryText and secondaryDim', () => {
      const theme = getTheme('default');
      assert.strictEqual(theme.secondaryText, 245);
      assert.strictEqual(theme.secondaryDim, 240);
    });

    it('minimal theme has secondaryText and secondaryDim', () => {
      const theme = getTheme('minimal');
      assert.strictEqual(typeof theme.secondaryText, 'number');
      assert.strictEqual(typeof theme.secondaryDim, 'number');
    });

    it('solarized theme has secondaryText and secondaryDim', () => {
      const theme = getTheme('solarized');
      assert.strictEqual(typeof theme.secondaryText, 'number');
      assert.strictEqual(typeof theme.secondaryDim, 'number');
    });
  });

  describe('ansi helpers', () => {
    it('ansi256Bg wraps color code correctly', () => {
      const result = ansi256Bg(25);
      assert.strictEqual(result, '\x1b[48;5;25m');
    });

    it('ansi256Fg wraps color code correctly', () => {
      const result = ansi256Fg(25);
      assert.strictEqual(result, '\x1b[38;5;25m');
    });

    it('reset returns reset sequence', () => {
      assert.strictEqual(reset(), '\x1b[0m');
    });
  });

  describe('buildTransition', () => {
    it('renders powerline arrow with correct fg/bg', () => {
      const result = buildTransition(25, 133);
      assert.strictEqual(result, '\x1b[38;5;25m\x1b[48;5;133m\x1b[0m');
    });

    it('renders trailing arrow with no next bg', () => {
      const result = buildTransition(240, null);
      assert.strictEqual(result, '\x1b[38;5;240m\x1b[49m\x1b[0m');
    });
  });
});
