import { DependencyManager, PluginRequirement } from '../../integration/DependencyManager';
import { PluginDetector, DetectedPlugin } from '../../integration/PluginDetector';

describe('DependencyManager - 4.4.x', () => {
  const installed: DetectedPlugin[] = [
    { id: 'textgen.plugin', name: 'TextGen', version: '3.1.0' },
    { id: 'imagegen.plugin', name: 'ImageGen', version: '1.2.0' },
    { id: 'helper.plugin', name: 'Helper', version: '0.9.0-beta.1' },
  ];

  const detector = new PluginDetector({ listInstalled: async () => installed });
  const manager = new DependencyManager(detector);

  test('validates missing required plugin', async () => {
    const req: PluginRequirement[] = [
      { id: 'textgen.plugin', versionRange: '>=3.0.0' },
      { id: 'missing.plugin', versionRange: '^1.0.0' },
    ];
    const health = await manager.validateRequirements(req);
    expect(health.ok).toBe(false);
    expect(
      health.issues.find((i) => i.type === 'MISSING' && i.pluginId === 'missing.plugin'),
    ).toBeTruthy();
  });

  test('detects version incompatibility', async () => {
    const req: PluginRequirement[] = [{ id: 'imagegen.plugin', versionRange: '>=2.0.0' }];
    const health = await manager.validateRequirements(req);
    expect(health.ok).toBe(false);
    expect(health.issues.some((i) => i.type === 'VERSION_INCOMPATIBLE')).toBe(true);
  });

  test('accepts prerelease within range with includePrerelease', async () => {
    const req: PluginRequirement[] = [{ id: 'helper.plugin', versionRange: '>=0.9.0-beta.1' }];
    const health = await manager.validateRequirements(req);
    expect(health.ok).toBe(true);
  });

  test('detects conflicts when both present', async () => {
    const req: PluginRequirement[] = [];
    const conflicts = [
      { a: 'textgen.plugin', b: 'helper.plugin', reason: 'overlapping hotkeys', when: () => true },
    ];
    const health = await manager.validateRequirements(req, {}, conflicts);
    expect(health.ok).toBe(false);
    expect(health.issues.some((i) => i.type === 'CONFLICT')).toBe(true);
  });

  test('validates basic configuration', async () => {
    const req: PluginRequirement[] = [{ id: 'textgen.plugin' }];
    const cfg = { 'textgen.plugin': { endpoint: 'https://api' } } as const;
    const health = await manager.validateRequirements(req, cfg);
    expect(health.ok).toBe(true);
  });

  test('troubleshooting returns actionable steps', async () => {
    const req: PluginRequirement[] = [
      { id: 'missing.plugin' },
      { id: 'imagegen.plugin', versionRange: '>=2.0.0' },
    ];
    const health = await manager.validateRequirements(req);
    const steps = manager.getTroubleshootingSteps(health.issues);
    expect(steps.find((s) => s.includes('Install plugin'))).toBeTruthy();
    expect(steps.find((s) => s.includes('Update plugin'))).toBeTruthy();
  });

  test('health dashboard summarizes status', async () => {
    const req: PluginRequirement[] = [
      { id: 'textgen.plugin', versionRange: '>=3.0.0' },
      { id: 'missing.plugin' },
    ];
    const dash = await manager.getHealthDashboard(req);
    expect(dash.requiredCount).toBe(2);
    expect(dash.installedCount).toBeGreaterThanOrEqual(3);
    expect(dash.missing.includes('missing.plugin')).toBe(true);
  });

  test('usage analytics collects metrics and suggests optimizations', () => {
    manager.recordUsage('textgen.plugin', 'use');
    manager.recordUsage('textgen.plugin', 'error');
    const { metrics, suggestions } = manager.getUsageAnalytics();
    expect(metrics['textgen.plugin']).toBeTruthy();
    expect(Array.isArray(suggestions)).toBe(true);
  });
});
