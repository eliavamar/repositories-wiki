import { createAgent } from "./coding-agent-v2";

export async function run(): Promise<void> {
  const providerID = "sap-ai-core";
  const models = ["anthropic--claude-4.6-sonnet"];
  const agent = await createAgent(models, providerID);
  const res = await agent.generate({model: "anthropic--claude-4.6-sonnet", prompt: "Summarize the readme page.", projectPath: "/Users/i563567/projects/devx-wing/vscode-service-center"});
  console.log("done")
}

run().then(() => {
  process.exit(0);
}).catch((e) => {
  process.exit(1);
});