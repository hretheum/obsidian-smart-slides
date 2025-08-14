export interface DetectedPlugin {
  id: string;
  name: string;
  version: string;
}

export interface DetectionEnv {
  // In real Obsidian, this would inspect app.plugins or window.app
  listInstalled: () => Promise<DetectedPlugin[]>;
}

export class PluginDetector {
  private readonly env: DetectionEnv;

  constructor(env: DetectionEnv) {
    this.env = env;
  }

  async detectById(id: string): Promise<DetectedPlugin | null> {
    const all = await this.env.listInstalled();
    return all.find((p) => p.id === id) ?? null;
  }

  async detectAll(): Promise<DetectedPlugin[]> {
    return this.env.listInstalled();
  }
}
