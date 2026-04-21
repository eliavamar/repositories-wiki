import { z } from "zod";

export interface CloneOptions {
  token?: string;
  commitId?: string;
  /** When provided, clone into this directory instead of creating a random temp dir */
  targetDir?: string;
  /** When provided, checkout this branch after cloning */
  branch?: string;
}

export interface CloneResult {
  repoPath: string;
  commitId: string;
  repoName: string;
}

export const ProviderConfigSchema = z.object({
  providerID: z.string(),
});

export const LlmConfigSchema = z.object({
  modelID: z.string(),
});

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

export const WikiGeneratorConfigSchema = z.object({
  repositoryUrl: z.string().url().optional(),
  localRepoPath: z.string().optional(),
  githubToken: z.string().optional(),
  wikiBranch: z.string().optional(),
  commitId: z.string().optional(),
  providerConfig: ProviderConfigSchema,
  llmPlaner: LlmConfigSchema,
  llmExploration: LlmConfigSchema,
  llmBuilder: LlmConfigSchema,
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


export const RelevantFileSchema = z.object({
  filePath: z.string().describe("Path to a relevant source file in the repository"),
  importance: z.enum(["low", "medium", "high"]).optional().describe("Importance level of the file relative to the page"),
});

export const WikiPageSchema = z.object({
  title: z.string().describe("Title of the wiki page"),
  pageId: z.string().describe("Unique identifier for the page"),
  content: z.string().optional().describe("Full wiki page content in Markdown format"),
  relevantFiles: z.array(RelevantFileSchema).describe("Source files relevant to this page's topic"),
  relatedPages: z.array(z.string().describe("ID of a related wiki page")).describe("Other wiki pages related to this page"),
  importance: z.enum(["low", "medium", "high"]).describe("Importance level of this page (high, medium, or low)"),
});

export const WikiSectionSchema = z.object({
  title: z.string().describe("Title of the wiki section"),
  pages: z.array(WikiPageSchema).describe("Wiki pages belonging to this section"),
});

export const WikiStructureModelSchema = z.object({
  commitId: z.string().describe("Git commit ID the wiki was generated from"),
  title: z.string().describe("Overall title for the wiki"),
  description: z.string().describe("Brief description of the repository (1-2 sentences, max 200 characters)"),
  sections: z.array(WikiSectionSchema).describe("Top-level sections organizing the wiki pages"),
});

// start types for generateWikiStructure
const WikiPageOutputSchema = WikiPageSchema.omit({ content: true }).extend({
  relevantFiles: z.array(z.string().describe("Path to a relevant source file in the repository")).describe("Source files relevant to this page's topic"),
});

const WikiSectionOutputSchema = WikiSectionSchema.extend({
  pages: z.array(WikiPageOutputSchema).describe("Wiki pages belonging to this section"),
});

export const WikiStructureOutputSchema = WikiStructureModelSchema.extend({
  sections: z.array(WikiSectionOutputSchema).describe("Top-level sections organizing the wiki pages"),
});
// end types for generateWikiStructure


export const InferredFilesOutputSchema = z.object({
  files: z.array(z.string().describe("File path from the repository file tree")),
});


export type LlmConfig = z.infer<typeof LlmConfigSchema>;
export type WikiGeneratorConfig = z.infer<typeof WikiGeneratorConfigSchema>;
export type AgentResult<T extends z.ZodRawShape> = z.infer<z.ZodObject<T>>;
export type RelevantFile = z.infer<typeof RelevantFileSchema>;
export type WikiPage = z.infer<typeof WikiPageSchema>;
export type WikiSection = z.infer<typeof WikiSectionSchema>;
export type WikiStructureModel = z.infer<typeof WikiStructureModelSchema>;
export type WikiStructureOutput = z.infer<typeof WikiStructureOutputSchema>;

export type InferredFilesOutput = z.infer<typeof InferredFilesOutputSchema>;


export interface ParsedGithubUrl {
  owner: string;
  repo: string;
  enterpriseApiUrl: string | null;
}

