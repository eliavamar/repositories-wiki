import type {
  GenerateOptions,
  GenerateResult,
} from "../types.js";
import type { ModelRegistry } from "./model-registry.js";

export class Agent {
  private readonly registry: ModelRegistry;

  constructor(registry: ModelRegistry) {
    this.registry = registry;
  }

  getAvailableModels(): string[] {
    return this.registry.list();
  }


  async generate<T = unknown>(options: GenerateOptions): Promise<GenerateResult<T>> {
    const { prompt, model, structuredOutput } = options;
    const chatModel = this.registry.get(model);
    const agent = (structuredOutput) ? chatModel.withStructuredOutput(structuredOutput, {includeRaw: true}) : chatModel;
    const response = await agent.invoke(prompt) as any;
    if(structuredOutput){
      return {
        answer: response.raw.toFormattedString(),
        structuredResponse: response.parsed as T
      }
    }
    return{ 
      answer: response.toFormattedString()
    }
  }
}
