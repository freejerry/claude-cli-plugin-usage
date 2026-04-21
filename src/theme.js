'use strict';

const THEMES = {
  default: {
    model: 25,       // deep blue
    git: 133,        // purple
    contextOk: 28,   // green
    contextWarn: 178, // yellow/orange
    contextDanger: 160, // red
    ratelimit: 240,  // dark gray
    textLight: 255,  // white text
    textDark: 232,   // black text
    secondaryText: 245,  // light gray
    secondaryDim: 240,   // dark gray
  },
  minimal: {
    model: 238,
    git: 238,
    contextOk: 238,
    contextWarn: 178,
    contextDanger: 160,
    ratelimit: 238,
    textLight: 255,
    textDark: 232,
    secondaryText: 245,
    secondaryDim: 240,
  },
  solarized: {
    model: 33,
    git: 136,
    contextOk: 64,
    contextWarn: 166,
    contextDanger: 124,
    ratelimit: 241,
    textLight: 230,
    textDark: 235,
    secondaryText: 245,
    secondaryDim: 240,
  },
};

function getTheme(name) {
  return THEMES[name] || THEMES.default;
}

function ansi256Bg(code) {
  return `\x1b[48;5;${code}m`;
}

function ansi256Fg(code) {
  return `\x1b[38;5;${code}m`;
}

function reset() {
  return '\x1b[0m';
}

function buildTransition(fromBg, toBg) {
  const fg = ansi256Fg(fromBg);
  const bg = toBg != null ? ansi256Bg(toBg) : '\x1b[49m';
  return `${fg}${bg}\x1b[0m`;
}

module.exports = { getTheme, ansi256Bg, ansi256Fg, reset, buildTransition, THEMES };
