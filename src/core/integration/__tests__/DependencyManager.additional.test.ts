import {
  DependencyManager,
  PluginRequirement,
  DependencyIssue,
} from '../../integration/DependencyManager';
import { PluginDetector, DetectedPlugin } from '../../integration/PluginDetector';

describe('DependencyManager additional coverage - 4.4', () => {
  const installed: DetectedPlugin[] = [
    { id: 'a.plugin', name: 'A', version: '1.0.0' },
    { id: 'b.plugin', name: 'B', version: '2.0.0' },
  ];
  const detector = new PluginDetector({ listInstalled: async () => installed });
  const manager = new DependencyManager(detector);

  test('conflict with conditional false yields no issue', async () => {
    const req: PluginRequirement[] = [];
    const conflicts = [{ a: 'a.plugin', b: 'b.plugin', reason: 'test', when: () => false }];
    const health = await manager.validateRequirements(req, {}, conflicts);
    expect(health.issues.find((i) => i.type === 'CONFLICT')).toBeFalsy();
  });

  test('version compatibility true/false paths', () => {
    expect(manager.isVersionCompatible('1.2.3', '>=1.0.0')).toBe(true);
    expect(manager.isVersionCompatible('0.9.9', '>=1.0.0')).toBe(false);
  });

  test('troubleshooting covers all issue types including restart advice', () => {
    const issues: DependencyIssue[] = [
      { type: 'MISSING', pluginId: 'x', message: 'm' },
      { type: 'VERSION_INCOMPATIBLE', pluginId: 'y', message: 'v' },
      { type: 'CONFIG_INVALID', pluginId: 'z', message: 'c' },
      { type: 'CONFLICT', pluginId: 'w', message: 'conflict', details: { with: 'q' } },
    ];
    const steps = manager.getTroubleshootingSteps(issues);
    expect(steps.some((s) => s.toLowerCase().includes('install plugin'))).toBe(true);
    expect(steps.some((s) => s.toLowerCase().includes('update plugin'))).toBe(true);
    expect(steps.some((s) => s.toLowerCase().includes('open settings'))).toBe(true);
    expect(steps.some((s) => s.toLowerCase().includes('disable either'))).toBe(true);
    expect(steps.some((s) => s.toLowerCase().includes('restart obsidian'))).toBe(true);
  });

  test('usage analytics suggestions for errors and unused', () => {
    manager.recordUsage('err.plugin', 'error');
    const { suggestions } = manager.getUsageAnalytics();
    expect(suggestions.some((s) => s.includes('err.plugin'))).toBe(true);
  });
});
