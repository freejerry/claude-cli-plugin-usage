'use strict';

function parseInput(raw) {
  return {
    modelName: raw?.model?.display_name ?? null,
    branch: raw?.worktree?.branch ?? null,
    contextPercent: raw?.context_window?.used_percentage ?? null,
    contextWindowSize: raw?.context_window?.context_window_size ?? null,
    fiveHourPercent: raw?.rate_limits?.five_hour?.used_percentage ?? null,
    fiveHourResetsAt: raw?.rate_limits?.five_hour?.resets_at ?? null,
    sevenDayPercent: raw?.rate_limits?.seven_day?.used_percentage ?? null,
    sevenDayResetsAt: raw?.rate_limits?.seven_day?.resets_at ?? null,
    costUsd: raw?.cost?.total_cost_usd ?? null,
  };
}

module.exports = { parseInput };
