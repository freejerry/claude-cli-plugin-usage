'use strict';

const { getTheme, ansi256Bg, ansi256Fg, reset, buildTransition } = require('./theme.js');
const { formatResetDelta } = require('./format-duration.js');
const { visibleLength, getTerminalWidth } = require('./width.js');

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

function hasRateLimits(plan) {
  return plan !== 'free' && plan !== 'api';
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
  if (plan === 'api') {
    if (parsed.costUsd == null) return null;
    const cost = `$${parsed.costUsd.toFixed(2)}`;
    return { text: ` 💰 ${cost} `, bg: theme.ratelimit, fg: theme.textLight };
  }
  if (!hasRateLimits(plan)) return null;
  // Pro/Max — always show rate limits, use — as placeholder if not yet loaded
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

function renderFirstLine(parsed, plan, config, theme) {
  const segments = [];

  for (const name of config.segments) {
    const builder = SEGMENT_BUILDERS[name];
    if (!builder) continue;
    const seg = builder(parsed, plan, config, theme);
    if (seg) segments.push(seg);
  }

  if (segments.length === 0) return '';

  // Build content: segments with arrows between them, NO trailing arrow
  let contentParts = [];
  let contentVisLen = 0;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const segStr = buildSegment(seg.text, seg.bg, seg.fg);
    contentParts.push(segStr);
    contentVisLen += visibleLength(seg.text);

    if (i + 1 < segments.length) {
      const arrow = buildTransition(seg.bg, segments[i + 1].bg);
      contentParts.push(arrow);
      // ponytail: 箭頭寬度假設待查 — buildTransition 目前無 glyph，但 width.visibleLength('')===2
      contentVisLen += 1; // arrow  is 1 visible char
    }
  }

  let output = contentParts.join('');

  // Pad remaining width with last segment's bg, then trailing arrow
  const termWidth = getTerminalWidth();
  const lastBg = segments[segments.length - 1].bg;
  const remaining = termWidth - contentVisLen - 1; // -1 for trailing arrow
  if (remaining > 0) {
    output += `${ansi256Bg(lastBg)}${' '.repeat(remaining)}`;
  }
  // Trailing arrow: last segment bg → default terminal bg
  output += buildTransition(lastBg, null);

  return output;
}

function renderSecondLine(parsed, plan, config, theme, now) {
  if (!config.secondLine?.enabled) return '';
  const show = config.secondLine.show || [];
  if (show.length === 0) return '';

  const text = ansi256Fg(theme.secondaryText);
  const dim = ansi256Fg(theme.secondaryDim);
  const sep = `${dim} │ ${text}`;

  const blocks = [];
  for (const name of show) {
    if (name === 'session' && parsed.sessionName) {
      blocks.push(`📁 ${parsed.sessionName}`);
    } else if (name === 'resets' && hasRateLimits(plan)) {
      const fiveHourDelta = formatResetDelta(parsed.fiveHourResetsAt, now);
      const sevenDayDelta = formatResetDelta(parsed.sevenDayResetsAt, now);
      const parts = [];
      if (fiveHourDelta != null) parts.push(`5h ${fiveHourDelta}`);
      if (sevenDayDelta != null) parts.push(`7d ${sevenDayDelta}`);
      if (parts.length > 0) {
        blocks.push(`↻ ${parts.join(sep)}`);
      }
    }
  }

  if (blocks.length === 0) return '';
  return `${text}${blocks.join(sep)}${reset()}`;
}

function render(parsed, plan, config, now = Math.floor(Date.now() / 1000)) {
  const theme = getTheme(config.theme);
  const first = renderFirstLine(parsed, plan, config, theme);
  const second = renderSecondLine(parsed, plan, config, theme, now);
  if (!first && !second) return '';
  if (!second) return first;
  if (!first) return second;
  return `${first}\n${second}`;
}

module.exports = { render, renderFirstLine, renderSecondLine, buildProgressBar, buildSegment };
