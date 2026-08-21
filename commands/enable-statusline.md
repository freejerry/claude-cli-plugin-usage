---
description: Wire this plugin's powerline status line into Claude Code settings
---

Enable the `claude-cli-plugin-usage` status line for this user.

Steps:

1. Read `~/.claude/settings.json`. If it doesn't exist, start from `{}`.
2. Merge in the following key **without removing or overwriting any existing keys** (do a real JSON merge, then write the whole file back as valid JSON):

   ```json
   {
     "statusLine": {
       "type": "command",
       "command": "node ${CLAUDE_PLUGIN_ROOT}/bin/cli.js"
     }
   }
   ```

   Keep the literal string `${CLAUDE_PLUGIN_ROOT}` — Claude Code expands it to this plugin's install directory at load time. Do not resolve it yourself.
3. If a `statusLine` key already exists, tell the user what it currently is and ask before replacing it.
4. After writing, tell the user to **restart Claude Code** so it re-reads settings, and note that a [Powerline-compatible font](https://github.com/powerline/fonts) is required for the arrow glyphs.

To customize later, they can create `~/.claude/claude-cli-plugin-usage.json` — see the plugin README for the config schema.
