import { createAgent, toolStrategy } from "langchain";
import type {
  GenerateOptions,
  GenerateResult,
} from "../types.js";
import type { ModelRegistry } from "./model-registry.js";
import { buildDeepAgent, buildReactAgent } from "./deep-agent.js";


export class Agent {
  private readonly registry: ModelRegistry;

  constructor(registry: ModelRegistry) {
    this.registry = registry;
  }

  getAvailableModels(): string[] {
    return this.registry.list();
  }


  async generate<T = unknown>(options: GenerateOptions): Promise<GenerateResult<T>> {
    const { prompt, model, projectPath, structuredOutput } = options;
    const chatModel = this.registry.get(model);
    // Wrap the Zod schema in a toolStrategy for the deepagent responseFormat
    const responseFormat = structuredOutput
      ? toolStrategy(structuredOutput)
      : undefined;

    // if project path existing create deep agent with access to project, else create react agent.
    const agent = (projectPath) ?  buildDeepAgent(chatModel, projectPath, responseFormat) : buildReactAgent(chatModel, responseFormat);
    const result = await agent.invoke({
      messages: [{ role: "user", content: prompt }],
    });

    const lastMessage = result.messages[result.messages.length - 1];
    const answer =
      typeof lastMessage.content === "string"
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);

    // When structured output is requested, return the structured response
    if (structuredOutput && result.structuredResponse) {
      return {
        answer,
        structuredResponse: result.structuredResponse as T,
      };
    }

    return { answer };
  }
}
