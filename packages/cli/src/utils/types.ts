import { createByModelName } from "@microsoft/tiktokenizer";

/** Map of file path to file content */
export type FileContentsMap = Map<string, string>;
export type Tokenizer = Awaited<ReturnType<typeof createByModelName>>;

export interface WalkEntry {
  relativePath: string;
  isDirectory: boolean;
}

export type PriorityTier = 1 | 2 | 3 | 4 | 5;

export interface FilePattern {
  tier: PriorityTier;
  globs: string[];
}

export interface TechDefinition {
  id: string;
  name: string;
  patterns: FilePattern[];
}
