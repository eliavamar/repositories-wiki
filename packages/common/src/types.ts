import { z } from "zod";

export interface CloneOptions {
  token?: string;
  commitId?: string;
}

export interface CloneResult {
  repoPath: string;
  commitId: string;
  repoName: string;
}

export const ProviderConfigSchema = z.object({
  provider: z.string(),
  apiKey: z.string(),
});

export const LlmConfigSchema = z.object({
  providerID: z.string(),
  modelID: z.string(),
});

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;


export const WikiGeneratorConfigSchema = z.object({
  repositoryUrl: z.string().url(),
  githubToken: z.string().optional(),
  wikiBranch: z.string().default("memory"),
  commitId: z.string().optional(),
  providerConfig: ProviderConfigSchema.optional(),
  llm: LlmConfigSchema,
  llmExploration: LlmConfigSchema.optional(),
})


// === Relevant File Schema ===
export const RelevantFileSchema = z.object({
  filePath: z.string(),
  importance: z.enum(["low", "medium", "high"]).optional(),
});

// === Page Status (for update flow) ===
export const PageStatusSchema = z.enum(["NEW", "UPDATE"]);
export type PageStatus = z.infer<typeof PageStatusSchema>;

// === Wiki Page Schema ===
export const WikiPageSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  content: z.string(),
  relevantFiles: z.array(RelevantFileSchema),
  relatedPages: z.array(z.string()),
  status: PageStatusSchema.optional(), 
});

// === Wiki Section Schema ===
export const WikiSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  pages: z.array(z.string()),
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
export type RelevantFile = z.infer<typeof RelevantFileSchema>;
export type WikiPage = z.infer<typeof WikiPageSchema>;
export type WikiSection = z.infer<typeof WikiSectionSchema>;
export type WikiStructureModel = z.infer<typeof WikiStructureModelSchema>;

export interface ChangedFile {
  path: string;
  changeType: "added" | "modified" | "deleted";
  diff: string;
}

export interface ChangedFilesResult {
  files: ChangedFile[];
}
