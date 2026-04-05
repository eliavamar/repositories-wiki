import type { DeepAgent } from "deepagents";
import type { ModelRegistry } from "./model-registry.js";
import { buildDeepAgent } from "./deep-agent.js";


export class DeepAgentPool {
  private readonly cache: Map<string, DeepAgent> = new Map();
  private readonly registry: ModelRegistry;

  constructor(registry: ModelRegistry) {
    this.registry = registry;
  }

  getOrCreate(modelId: string, projectPath: string): DeepAgent {
    const key = DeepAgentPool.buildCacheKey(projectPath, modelId);
    let agent = this.cache.get(key);
    if (!agent) {
      const chatModel = this.registry.get(modelId);
      agent = buildDeepAgent(chatModel, projectPath);
      this.cache.set(key, agent);
    }
    return agent;
  }

  get size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }

  private static buildCacheKey(
    projectPath: string,
    modelId: string,
  ): string {
    return `${projectPath}::${modelId}`;
  }
}
