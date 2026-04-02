'use strict';

function detectPlan(parsed) {
  // 1M context is exclusive to Max subscribers
  if (parsed.contextWindowSize >= 1000000) {
    return 'max';
  }

  const hasRateLimits = parsed.fiveHourPercent != null || parsed.sevenDayPercent != null;
  if (hasRateLimits) {
    return 'pro';
  }

  // cost alone doesn't distinguish API from subscription —
  // subscription users also have cost tracking.
  // Only classify as API when cost > 0 and no rate_limits ever appeared.
  if (parsed.costUsd != null && parsed.costUsd > 0) {
    return 'api';
  }

  return 'free';
}

module.exports = { detectPlan };
