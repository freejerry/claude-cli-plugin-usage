---
description: Wire this plugin's powerline status line into Claude Code settings
---

Enable the `claude-cli-plugin-usage` status line for this user.

**Important:** Claude Code does **not** expand `${CLAUDE_PLUGIN_ROOT}` inside `settings.json`'s `statusLine.command`, so you must write a real absolute path — not the placeholder.

Steps:

1. Locate this plugin's `bin/cli.js` (it lives under the Claude Code plugins cache, in a versioned directory). Run:

   ```bash
   find ~/.claude/plugins -path '*claude-cli-plugin-usage*/bin/cli.js' 2>/dev/null | sort | tail -1
   ```

   Take the single absolute path it prints — call it `CLI_PATH`. If it prints nothing, the plugin isn't installed where expected; tell the user and stop.

2. Read `~/.claude/settings.json` (start from `{}` if it doesn't exist).

3. Merge in the following, **without removing or overwriting other keys** (real JSON merge), substituting the real `CLI_PATH`:

   ```json
   { "statusLine": { "type": "command", "command": "node CLI_PATH" } }
   ```

   If a `statusLine` key already exists, show the user its current value and ask before replacing it.

4. Write the whole file back as valid JSON.

5. Tell the user to **restart Claude Code** so it re-reads settings, and note that a [Powerline-compatible font](https://github.com/powerline/fonts) is required for the arrow glyphs.

Note: the path is tied to the installed plugin version, so re-run this command after updating the plugin. To customize the status line, create `~/.claude/claude-cli-plugin-usage.json` — see the plugin README for the schema.
