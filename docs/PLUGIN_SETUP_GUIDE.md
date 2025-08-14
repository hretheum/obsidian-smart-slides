# Plugin Setup Guide (Integration Layer)

This guide explains how to set up, configure, and troubleshoot required/optional plugins used by Smart Slides, along with how to use the dependency health dashboard and resolve conflicts.

## 1. Prerequisites

- Obsidian v1.6+ recommended
- Smart Slides plugin installed and enabled
- Internet access for external APIs (if using AI adapters)

## 2. Required and Optional Plugins

The integration layer works with external plugins discovered at runtime. Examples (IDs are illustrative):

- Required
  - `textgen.plugin`: Text generation backend for titles, outlines, and slides
  - `imagegen.plugin`: Image generation backend for slide visuals
- Optional
  - `helper.plugin`: Auxiliary features (templating/shortcuts)

Your environment may define different IDs. Consult your team/project config for the canonical list.

## 3. Installation

1. Open Obsidian → Settings → Community Plugins
2. Browse and install required plugins by ID/name
3. Enable each installed plugin
4. Restart Obsidian after initial installation

## 4. Configuration

Each required plugin may expose its own settings (API keys, endpoints, defaults). After installation:

- Open Settings → Plugin → [Plugin Name]
- Enter API credentials if needed
- Prefer safest defaults (rate limits, timeouts)
- Save and restart Obsidian

Smart Slides internally validates minimal configuration via the Dependency Manager.

## 5. Dependency Health Dashboard

Smart Slides aggregates dependency status to help you see whether everything is ready:

- Missing plugins are listed by ID
- Incompatible versions show both installed and required ranges
- Configuration issues highlight which plugin needs attention
- Detected conflicts are summarized with reason

When all checks pass, the system reports the environment as healthy.

## 6. Troubleshooting

If the health dashboard reports issues, try the following actions:

- Missing: Install and enable the plugin via Community Plugins
- Version incompatible: Update the plugin using Obsidian’s built-in updater
- Invalid configuration: Open the plugin’s settings and correct invalid values (revert to defaults if unsure)
- Conflict: Disable either the reported plugin or the conflicting one and decide which features you need
- Always restart Obsidian after changes to ensure clean re-initialization

If issues persist, capture logs and create a minimal reproduction:

- Note plugin versions, Smart Slides version, and Obsidian version
- Provide the health dashboard summary and the exact error message

## 7. Conflict Detection and Resolution

Conflicts can be unconditional (two plugins clash) or conditional (only under certain installed plugin combinations). Typical strategies:

- Prefer a single source of truth for overlapping features (e.g., only one image generator)
- Configure distinct hotkeys to avoid collisions
- Keep both plugins up to date to receive compatibility fixes

## 8. Usage Analytics and Optimization

Smart Slides records high-level usage/error counts per plugin to help you optimize your setup:

- Plugins with frequent errors are candidates for update, reconfiguration, or temporary disablement
- Unused plugins can be removed to reduce startup time and memory footprint

Note: The analytics is local and intended for troubleshooting and tuning.

## 9. Security Considerations

- Treat API keys as secrets
- Avoid pasting keys in plaintext notes
- Prefer environment-specific configurations
- Review third-party plugin permissions and provenance

## 10. FAQ

- Q: "The dashboard says version incompatible, but I just updated."
  - A: Restart Obsidian to ensure the new version is detected
- Q: "Two plugins fight over hotkeys."
  - A: Customize hotkeys in Settings → Hotkeys to disambiguate
- Q: "Images look inconsistent between slides."
  - A: Ensure style presets are aligned and avoid mixing multiple generators mid-deck

## 11. Support

- File issues with a clear health dashboard snapshot and versions
- Include steps tried from Troubleshooting above
