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

  constructor(detector: PluginDetector) {
    this.detector = detector;
  }

  async validateRequirements(
    requirements: PluginRequirement[],
    config: InstalledPluginConfig = {},
    conflicts: Array<{ a: string; b: string; reason?: string }> = [],
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
        });
      }
      const cfg = config[req.id];
      if (cfg && !this.isConfigValid(cfg)) {
        issues.push({ type: 'CONFIG_INVALID', pluginId: req.id, message: `Invalid configuration` });
      }
    }

    for (const pair of conflicts) {
      if (byId.has(pair.a) && byId.has(pair.b)) {
        issues.push({
          type: 'CONFLICT',
          pluginId: pair.a,
          message: `Conflict with ${pair.b}`,
          details: { reason: pair.reason },
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
}
