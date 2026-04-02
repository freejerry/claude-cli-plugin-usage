'use strict';

const { getTheme, ansi256Bg, ansi256Fg, reset, buildTransition } = require('./theme.js');

function buildProgressBar(percent, width) {
  const filled = Math.round((percent / 100) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function buildSegment(text, bgColor, fgColor) {
  return `${ansi256Bg(bgColor)}${ansi256Fg(fgColor)}${text}${reset()}`;
}

function getContextBgColor(percent, thresholds, theme) {
  if (percent >= thresholds.danger) return theme.contextDanger;
  if (percent >= thresholds.warn) return theme.contextWarn;
  return theme.contextOk;
}

function getRateLimitColor(percent, thresholds, theme) {
  if (percent >= thresholds.danger) return theme.contextDanger;
  return theme.textLight;
}

function buildModelSegment(parsed, theme) {
  if (!parsed.modelName) return null;
  return { text: ` 🧠 ${parsed.modelName} `, bg: theme.model, fg: theme.textLight };
}

function buildGitSegment(parsed, theme) {
  if (!parsed.branch) return null;
  return { text: `  ${parsed.branch} `, bg: theme.git, fg: theme.textLight };
}

function buildContextSegment(parsed, config, theme) {
  if (parsed.contextPercent == null) return null;
  const pct = Math.round(parsed.contextPercent);
  const bar = buildProgressBar(pct, config.contextBar.width);
  const bg = getContextBgColor(pct, config.contextBar.thresholds, theme);
  return { text: ` ${bar} ${pct}% `, bg, fg: theme.textLight };
}

function buildRatelimitSegment(parsed, plan, config, theme) {
  if (plan === 'free') return null;
  if (plan === 'api') {
    if (parsed.costUsd == null) return null;
    const cost = `$${parsed.costUsd.toFixed(2)}`;
    return { text: ` 💰 ${cost} `, bg: theme.ratelimit, fg: theme.textLight };
  }
  // Pro/Max — show rate limits
  if (parsed.fiveHourPercent == null && parsed.sevenDayPercent == null) return null;
  const fh = parsed.fiveHourPercent != null ? Math.round(parsed.fiveHourPercent) : '—';
  const sd = parsed.sevenDayPercent != null ? Math.round(parsed.sevenDayPercent) : '—';
  const fhColor = typeof fh === 'number'
    ? ansi256Fg(getRateLimitColor(fh, config.ratelimit.thresholds, theme))
    : '';
  const sdColor = typeof sd === 'number'
    ? ansi256Fg(getRateLimitColor(sd, config.ratelimit.thresholds, theme))
    : '';
  const rlReset = fhColor || sdColor ? ansi256Fg(theme.textLight) : '';
  return {
    text: ` ⚡ 5h ${fhColor}${fh}%${rlReset} │ 7d ${sdColor}${sd}%${rlReset} `,
    bg: theme.ratelimit,
    fg: theme.textLight,
  };
}

const SEGMENT_BUILDERS = {
  model: (parsed, _plan, _config, theme) => buildModelSegment(parsed, theme),
  git: (parsed, _plan, _config, theme) => buildGitSegment(parsed, theme),
  context: (parsed, _plan, config, theme) => buildContextSegment(parsed, config, theme),
  ratelimit: (parsed, plan, config, theme) => buildRatelimitSegment(parsed, plan, config, theme),
};

function render(parsed, plan, config) {
  const theme = getTheme(config.theme);
  const segments = [];

  for (const name of config.segments) {
    const builder = SEGMENT_BUILDERS[name];
    if (!builder) continue;
    const seg = builder(parsed, plan, config, theme);
    if (seg) segments.push(seg);
  }

  if (segments.length === 0) return '';

  let output = '';
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    output += buildSegment(seg.text, seg.bg, seg.fg);
    const nextBg = i + 1 < segments.length ? segments[i + 1].bg : null;
    output += buildTransition(seg.bg, nextBg);
  }

  return output;
}

module.exports = { render, buildProgressBar, buildSegment };
