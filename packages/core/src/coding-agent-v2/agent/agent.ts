import type {
  GenerateOptions,
  GenerateResult,
} from "../types.js";
import type { ModelRegistry } from "./model-registry.js";
import type { DeepAgentPool } from "./deep-agent-pool.js";


export class Agent {
  private readonly registry: ModelRegistry;
  private readonly deepAgentPool: DeepAgentPool;

  constructor(registry: ModelRegistry, deepAgentPool: DeepAgentPool) {
    this.registry = registry;
    this.deepAgentPool = deepAgentPool;
  }

  getAvailableModels(): string[] {
    return this.registry.list();
  }


  async generate(options: GenerateOptions): Promise<GenerateResult> {
    const { prompt, model, projectPath } = options;

    if (projectPath) {
      const deepAgent = this.deepAgentPool.getOrCreate(model, projectPath);
      const result = await deepAgent.invoke({
        messages: [{ role: "user", content: prompt }],
      });

      const lastMessage = result.messages[result.messages.length - 1];
      const answer =
        typeof lastMessage.content === "string"
          ? lastMessage.content
          : JSON.stringify(lastMessage.content);

      return { answer };
    }

    const llm = this.registry.get(model);
    const res = await llm.invoke(prompt);
    const answer = res.toFormattedString();
    return { answer };
  }
}
