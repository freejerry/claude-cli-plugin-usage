'use strict';

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function formatResetDelta(resetsAt, now) {
  if (typeof resetsAt !== 'number' || !Number.isFinite(resetsAt)) {
    return null;
  }
  const delta = resetsAt - now;
  if (delta <= 0) return '—';

  if (delta >= DAY) {
    const days = Math.floor(delta / DAY);
    const hours = Math.floor((delta % DAY) / HOUR);
    return `${days}d${hours}h`;
  }
  if (delta >= HOUR) {
    const hours = Math.floor(delta / HOUR);
    const minutes = Math.floor((delta % HOUR) / MINUTE);
    return `${hours}h${minutes}m`;
  }
  if (delta >= MINUTE) {
    const minutes = Math.floor(delta / MINUTE);
    return `${minutes}m`;
  }
  return '<1m';
}

module.exports = { formatResetDelta };
