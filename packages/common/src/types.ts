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

// ─── Structured Output Schemas (for LLM responseFormat) ─────────────────────

/**
 * Schema for wiki structure generation output (new flow).
 * Pages have no content yet — content is generated in a later step.
 */
export const WikiStructureOutputSchema = z.object({
  title: z.string().describe("Overall title for the wiki"),
  description: z.string().describe("Brief description of the repository"),
  commitId: z.string().describe("The commit ID"),
  pages: z.array(z.object({
    id: z.string().describe("Unique page identifier, e.g. page-1"),
    title: z.string().describe("Page title"),
    description: z.string().describe("What this page covers"),
    relevantFiles: z.array(z.object({
      filePath: z.string().describe("Path to a relevant source file from the repo"),
    })).describe("Relevant source files for this page"),
    relatedPages: z.array(z.string()).describe("IDs of related pages"),
  })).describe("All wiki pages"),
  sections: z.array(z.object({
    id: z.string().describe("Unique section identifier, e.g. section-1"),
    title: z.string().describe("Section title"),
    pages: z.array(z.string()).describe("Page IDs belonging to this section"),
  })).optional().describe("Logical groupings of pages into sections"),
});

/**
 * Schema for wiki structure update output (update flow).
 * Pages may have a status indicating whether they need content regeneration.
 */
export const WikiStructureUpdateOutputSchema = z.object({
  title: z.string().describe("Overall title for the wiki"),
  description: z.string().describe("Brief description of the repository"),
  commitId: z.string().describe("The new commit ID"),
  pages: z.array(z.object({
    id: z.string().describe("Unique page identifier"),
    title: z.string().describe("Page title"),
    description: z.string().describe("What this page covers"),
    relevantFiles: z.array(z.object({
      filePath: z.string().describe("Path to a relevant source file from the repo"),
    })).describe("Relevant source files for this page"),
    relatedPages: z.array(z.string()).describe("IDs of related pages"),
    status: z.enum(["NEW", "UPDATE"]).optional().describe("NEW for brand new pages, UPDATE for pages needing content regeneration, omit for unchanged pages"),
  })).describe("All wiki pages (omit pages that should be deleted)"),
  sections: z.array(z.object({
    id: z.string().describe("Unique section identifier"),
    title: z.string().describe("Section title"),
    pages: z.array(z.string()).describe("Page IDs belonging to this section"),
  })).optional().describe("Logical groupings of pages into sections"),
});

/**
 * Schema for the inferred important files output.
 */
export const InferredFilesOutputSchema = z.object({
  files: z.array(z.string().describe("File path from the repository file tree")),
});

/**
 * Schema for page content generation output.
 */
export const PageContentOutputSchema = z.object({
  content: z.string().describe("The full wiki page content in Markdown format, starting with an H1 heading"),
  relevantFiles: z.array(z.object({
    filePath: z.string().describe("Path to a source file used to generate the content"),
  })).describe("Source files referenced in the content"),
});

// ─── Inferred TypeScript types ──────────────────────────────────────────────

export type LlmConfig = z.infer<typeof LlmConfigSchema>;
export type WikiGeneratorConfig = z.infer<typeof WikiGeneratorConfigSchema>;
export type WikiGeneratorConfigInput = z.input<typeof WikiGeneratorConfigSchema>;
export type AgentResult<T extends z.ZodRawShape> = z.infer<z.ZodObject<T>>;
export type RelevantFile = z.infer<typeof RelevantFileSchema>;
export type WikiPage = z.infer<typeof WikiPageSchema>;
export type WikiSection = z.infer<typeof WikiSectionSchema>;
export type WikiStructureModel = z.infer<typeof WikiStructureModelSchema>;

export type WikiStructureOutput = z.infer<typeof WikiStructureOutputSchema>;
export type WikiStructureUpdateOutput = z.infer<typeof WikiStructureUpdateOutputSchema>;
export type InferredFilesOutput = z.infer<typeof InferredFilesOutputSchema>;
export type PageContentOutput = z.infer<typeof PageContentOutputSchema>;

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