'use strict';

function detectPlan(parsed) {
  const hasRateLimits = parsed.fiveHourPercent != null || parsed.sevenDayPercent != null;

  if (hasRateLimits) {
    return parsed.contextWindowSize >= 1000000 ? 'max' : 'pro';
  }
  if (parsed.costUsd != null) {
    return 'api';
  }
  return 'free';
}

module.exports = { detectPlan };
