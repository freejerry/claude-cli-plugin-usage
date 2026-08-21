'use strict';

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function visibleLength(str) {
  const stripped = stripAnsi(str);
  // Emoji and CJK characters are typically 2 columns wide
  let len = 0;
  for (const ch of stripped) {
    const code = ch.codePointAt(0);
    if (
      code >= 0x1F000 || // emoji & symbols
      (code >= 0x2600 && code <= 0x27BF) || // misc symbols
      (code >= 0x2B50 && code <= 0x2B55) || // stars
      (code >= 0xE000 && code <= 0xF8FF) || // private use (powerline)
      (code >= 0x4E00 && code <= 0x9FFF) || // CJK
      (code >= 0x3000 && code <= 0x303F)    // CJK punctuation
    ) {
      len += 2;
    } else {
      len += 1;
    }
  }
  return len;
}

function getTerminalWidth() {
  try {
    return process.stdout.columns || process.stderr.columns || 80;
  } catch {
    return 80;
  }
}

module.exports = { visibleLength, getTerminalWidth };
