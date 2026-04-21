'use strict';

function getBasename(p) {
  if (typeof p !== 'string' || !p) return null;
  const trimmed = p.replace(/[/\\]+$/, '');
  if (!trimmed) return null;
  const idx = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'));
  const base = idx >= 0 ? trimmed.slice(idx + 1) : trimmed;
  return base || null;
}

function resolveSessionName(raw) {
  const worktreeName = raw?.worktree?.name;
  if (typeof worktreeName === 'string' && worktreeName) return worktreeName;

  const projectBase = getBasename(raw?.workspace?.project_dir);
  if (projectBase) return projectBase;

  const currentBase = getBasename(raw?.workspace?.current_dir);
  if (currentBase) return currentBase;

  return null;
}

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
    sessionName: resolveSessionName(raw),
  };
}

module.exports = { parseInput };
