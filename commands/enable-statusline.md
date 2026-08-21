---
description: Wire this plugin's powerline status line into Claude Code settings
---

Enable the `claude-cli-plugin-usage` status line for this user.

**Important:** Claude Code does **not** expand `${CLAUDE_PLUGIN_ROOT}` inside `settings.json`'s `statusLine.command`, so you must write a real absolute path — not the placeholder.

Steps:

1. Resolve the absolute path to the tool's `bin/cli.js` — call it `CLI_PATH`. Try these in order and use the first that yields a path:

   **a) Plugin cache** (normal plugin install):
   ```bash
   find ~/.claude/plugins -path '*claude-cli-plugin-usage*/bin/cli.js' 2>/dev/null | sort | tail -1
   ```

   **b) Fallback — global npm install** (if the user also `npm install -g`'d it, the binary is on PATH):
   ```bash
   command -v claude-cli-plugin-usage
   ```
   Use its output as `CLI_PATH` directly — `node` follows the symlink, so it need not be resolved further.

   **c) Fallback — ask the user** for the absolute path to `bin/cli.js` (or where they cloned/installed it). If none of a/b/c yields a path, stop and tell the user it isn't installed anywhere you can find.

2. Read `~/.claude/settings.json` (start from `{}` if it doesn't exist).

3. Merge in the following, **without removing or overwriting other keys** (real JSON merge), substituting the real `CLI_PATH`:

   ```json
   { "statusLine": { "type": "command", "command": "node CLI_PATH" } }
   ```

   If a `statusLine` key already exists, show the user its current value and ask before replacing it.

4. Write the whole file back as valid JSON.

5. Tell the user to **restart Claude Code** so it re-reads settings, and note that a [Powerline-compatible font](https://github.com/powerline/fonts) is required for the arrow glyphs.

Note: the path is tied to the installed plugin version, so re-run this command after updating the plugin. To customize the status line, create `~/.claude/claude-cli-plugin-usage.json` — see the plugin README for the schema.
