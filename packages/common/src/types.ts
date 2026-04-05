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
  repositoryUrl: z.string().url().optional(),
  localRepoPath: z.string().optional(),
  githubToken: z.string().optional(),
  wikiBranch: z.string().optional(),
  commitId: z.string().optional(),
  providerConfig: ProviderConfigSchema.optional(),
  llm: LlmConfigSchema,
  llmExploration: LlmConfigSchema,
  outputDirPath: z.string().optional(),
  pushToGithub: z.boolean().optional(),
}).refine(
  (data) => !!data.repositoryUrl || !!data.localRepoPath,
  { message: "Either 'repositoryUrl' or 'localRepoPath' must be provided." }
).refine(
  (data) => !(data.repositoryUrl && data.localRepoPath),
  { message: "Cannot specify both 'repositoryUrl' and 'localRepoPath'. Choose one input source." }
).refine(
  (data) => !(data.repositoryUrl || data.pushToGithub) || !!data.githubToken,
  { message: "'githubToken' is required when 'repositoryUrl' is provided or 'pushToGithub' is true." }
)


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
  importance: z.enum(["low", "medium", "high"]).optional(),
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
// === Inferred TypeScript types ===
export type LlmConfig = z.infer<typeof LlmConfigSchema>;
export type WikiGeneratorConfig = z.infer<typeof WikiGeneratorConfigSchema>;
export type WikiGeneratorConfigInput = z.input<typeof WikiGeneratorConfigSchema>;
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

export interface ParsedGithubUrl {
  owner: string;
  repo: string;
  enterpriseApiUrl: string | null;
}

export const DEFAULT_WIKI_BRANCH = "memory"