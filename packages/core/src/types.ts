import { z } from "zod";

// === Git Clone Types ===
export interface CloneOptions {
  token?: string;
  commitId?: string;
}

export interface CloneResult {
  repoPath: string;
  commitId: string;
  repoName: string;
}

// === LLM Config (user-provided) ===
export const LlmConfigSchema = z.object({
  provider: z.string(),
  model: z.string(),
  apiKey: z.string().optional(),
});

export interface AgentInput{
  repoPath: string;
  prompt: string;
  title?: string;
}


export const WikiGeneratorConfigSchema = z.object({
  repositoryUrl: z.string().url(),
  githubToken: z.string().optional(),
  wikiBranch: z.string().default("repository-wiki-memory"),
  commitId: z.string().optional(),
  llm: LlmConfigSchema,
});


// === Wiki Page Schema ===
export const WikiPageSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  filePaths: z.array(z.string()),
  importance: z.enum(["high", "medium", "low"]),
  relatedPages: z.array(z.string()),
});

// === Wiki Section Schema ===
export const WikiSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  pages: z.array(z.string()),
  subsections: z.array(z.string()).optional(),
});

// === Wiki Structure Model Schema ===
export const WikiStructureModelSchema = z.object({
  commitId: z.string(),
  title: z.string(),
  description: z.string(),
  pages: z.array(WikiPageSchema),
  sections: z.array(WikiSectionSchema).optional(),
  rootSections: z.array(z.string()).optional(),
});

// === Inferred TypeScript types ===
export type LlmConfig = z.infer<typeof LlmConfigSchema>;
export type WikiGeneratorConfig = z.infer<typeof WikiGeneratorConfigSchema>;
export type AgentResult<T extends z.ZodRawShape> = z.infer<z.ZodObject<T>>;
export type WikiPage = z.infer<typeof WikiPageSchema>;
export type WikiSection = z.infer<typeof WikiSectionSchema>;
export type WikiStructureModel = z.infer<typeof WikiStructureModelSchema>;
