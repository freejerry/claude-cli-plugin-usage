const { describe, it } = require('node:test');
const assert = require('node:assert');
const { visibleLength, getTerminalWidth } = require('../src/width.js');

describe('width', () => {
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

    it('counts powerline arrow as a single cell', () => {
      assert.strictEqual(visibleLength('\ue0b0'), 1);
    });

    it('counts CJK as 2 wide', () => {
      assert.strictEqual(visibleLength('中文'), 4);
    });
  });

  describe('getTerminalWidth', () => {
    it('falls back to 80 when no columns are set', () => {
      const savedOut = process.stdout.columns;
      const savedErr = process.stderr.columns;
      process.stdout.columns = 0;
      process.stderr.columns = 0;
      try {
        assert.strictEqual(getTerminalWidth(), 80);
      } finally {
        process.stdout.columns = savedOut;
        process.stderr.columns = savedErr;
      }
    });
  });
});
