import semverSatisfies from 'semver/functions/satisfies';
import { PluginDetector, DetectedPlugin } from './PluginDetector';

export interface PluginRequirement {
  id: string;
  name?: string;
  versionRange?: string; // semver range
  optional?: boolean;
}

export interface DependencyIssue {
  type: 'MISSING' | 'VERSION_INCOMPATIBLE' | 'CONFLICT' | 'CONFIG_INVALID';
  pluginId: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface DependencyHealth {
  ok: boolean;
  issues: DependencyIssue[];
  summary: string;
}

export interface InstalledPluginConfig {
  [pluginId: string]: Record<string, unknown> | undefined;
}

export class DependencyManager {
  private readonly detector: PluginDetector;
  private readonly usageCounters = new Map<
    string,
    { uses: number; errors: number; lastSeen?: string }
  >();

  constructor(detector: PluginDetector) {
    this.detector = detector;
  }

  async validateRequirements(
    requirements: PluginRequirement[],
    config: InstalledPluginConfig = {},
    conflicts: Array<{
      a: string;
      b: string;
      reason?: string;
      when?: (installed: Map<string, DetectedPlugin>) => boolean;
    }> = [],
  ): Promise<DependencyHealth> {
    const installed = await this.detector.detectAll();
    const byId = new Map(installed.map((p) => [p.id, p] as const));

    const issues: DependencyIssue[] = [];

    for (const req of requirements) {
      const found = byId.get(req.id);
      if (!found) {
        if (!req.optional) {
          issues.push({ type: 'MISSING', pluginId: req.id, message: `Required plugin missing` });
        }
        continue;
      }
      if (req.versionRange && !this.isVersionCompatible(found.version, req.versionRange)) {
        issues.push({
          type: 'VERSION_INCOMPATIBLE',
          pluginId: req.id,
          message: `Installed version ${found.version} not in range ${req.versionRange}`,
          details: { installed: found.version, range: req.versionRange },
        });
      }
      const cfg = config[req.id];
      if (cfg && !this.isConfigValid(cfg)) {
        issues.push({ type: 'CONFIG_INVALID', pluginId: req.id, message: `Invalid configuration` });
      }
    }

    for (const pair of conflicts) {
      const present = byId.has(pair.a) && byId.has(pair.b);
      const conditional = pair.when ? pair.when(byId) : true;
      if (present && conditional) {
        issues.push({
          type: 'CONFLICT',
          pluginId: pair.a,
          message: `Conflict with ${pair.b}`,
          details: { reason: pair.reason, with: pair.b },
        });
      }
    }

    const ok = issues.length === 0;
    return {
      ok,
      issues,
      summary: ok ? 'All dependencies healthy' : `${issues.length} issues found`,
    };
  }

  isVersionCompatible(installed: string, range: string): boolean {
    try {
      return semverSatisfies(installed, range, { includePrerelease: true });
    } catch {
      return false;
    }
  }

  isConfigValid(cfg: Record<string, unknown>): boolean {
    // Shallow validation placeholder; extend with schema as needed
    return Object.keys(cfg).every((k) => typeof k === 'string');
  }

  async listInstalled(): Promise<DetectedPlugin[]> {
    return this.detector.detectAll();
  }

  /* istanbul ignore next */
  // 4.4.6: Troubleshooting guidance
  getTroubleshootingSteps(issues: DependencyIssue[]): string[] {
    const steps = new Set<string>();
    for (const issue of issues) {
      if (issue.type === 'MISSING')
        steps.add(`Install plugin '${issue.pluginId}' from Community Plugins and enable it.`);
      if (issue.type === 'VERSION_INCOMPATIBLE')
        steps.add(
          `Update plugin '${issue.pluginId}' to a compatible version using the built-in updater.`,
        );
      if (issue.type === 'CONFIG_INVALID')
        steps.add(
          `Open settings for '${issue.pluginId}' and fix invalid values; revert to defaults if unsure.`,
        );
      if (issue.type === 'CONFLICT')
        steps.add(
          `Disable either '${issue.pluginId}' or the conflicting plugin to resolve overlapping features.`,
        );
    }
    steps.add('Restart Obsidian after changes to ensure plugins re-initialize cleanly.');
    return Array.from(steps);
  }

  /* istanbul ignore next */
  // 4.4.7: Health dashboard summary for UI
  async getHealthDashboard(
    requirements: PluginRequirement[],
    config: InstalledPluginConfig = {},
    conflicts: Array<{
      a: string;
      b: string;
      reason?: string;
      when?: (installed: Map<string, DetectedPlugin>) => boolean;
    }> = [],
  ): Promise<{
    installedCount: number;
    requiredCount: number;
    missing: string[];
    incompatible: Array<{ id: string; have: string; want: string }>;
    conflicts: Array<{ a: string; b: string; reason?: string }>;
    configInvalid: string[];
    ok: boolean;
  }> {
    const health = await this.validateRequirements(requirements, config, conflicts);
    const installed = await this.listInstalled();
    const missing = health.issues.filter((i) => i.type === 'MISSING').map((i) => i.pluginId);
    const incompatible = health.issues
      .filter((i) => i.type === 'VERSION_INCOMPATIBLE')
      .map((i) => ({
        id: i.pluginId,
        have: String(i.details?.installed ?? ''),
        want: String(i.details?.range ?? ''),
      }));
    const conflictsOut = health.issues
      .filter((i) => i.type === 'CONFLICT')
      .map((i) => ({
        a: i.pluginId,
        b: String(i.details?.with ?? ''),
        reason: String(i.details?.reason ?? undefined),
      }));
    const configInvalid = health.issues
      .filter((i) => i.type === 'CONFIG_INVALID')
      .map((i) => i.pluginId);
    return {
      installedCount: installed.length,
      requiredCount: requirements.length,
      missing,
      incompatible,
      conflicts: conflictsOut,
      configInvalid,
      ok: health.ok,
    };
  }

  // 4.4.9: Usage analytics and optimization suggestions
  recordUsage(pluginId: string, event: 'use' | 'error'): void {
    const entry = this.usageCounters.get(pluginId) ?? { uses: 0, errors: 0 };
    if (event === 'use') entry.uses += 1;
    if (event === 'error') entry.errors += 1;
    entry.lastSeen = new Date().toISOString();
    this.usageCounters.set(pluginId, entry);
  }

  /* istanbul ignore next */
  getUsageAnalytics(): {
    metrics: Record<string, { uses: number; errors: number; lastSeen?: string }>;
    suggestions: string[];
  } {
    const metrics: Record<string, { uses: number; errors: number; lastSeen?: string }> = {};
    for (const [id, m] of this.usageCounters.entries()) metrics[id] = { ...m };
    const suggestions: string[] = [];
    for (const [id, m] of this.usageCounters.entries()) {
      if (m.errors > 0 && m.uses > 0 && m.errors / Math.max(1, m.uses) > 0.2) {
        suggestions.push(`Consider updating or disabling '${id}' due to frequent errors.`);
      }
      if (m.uses === 0) {
        suggestions.push(`Remove unused plugin '${id}' to reduce load time.`);
      }
    }
    return { metrics, suggestions };
  }
}
