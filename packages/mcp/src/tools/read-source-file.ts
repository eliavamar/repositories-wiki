import fs from "fs";
import path from "path";
import { z } from "zod";
import type { RepoManager } from "../repo-manager.js";


export const ReadSourceFilesInputSchema = z.object({
  repository: z.string().describe("Repository identifier (e.g., 'owner/repo' for GitHub URLs or folder name for local paths)"),
  file_paths: z.array(z.string()).min(1).describe("Array of relative file paths within the repository (e.g., ['src/main.ts', 'src/utils.ts'])"),
});

export type ReadSourceFilesInput = z.infer<typeof ReadSourceFilesInputSchema>;


interface FileContent {
  file_path: string;
  content: string;
}

interface FileError {
  file_path: string;
  error: string;
}

interface ReadSourceFilesOutput {
  repository: string;
  files: FileContent[];
  errors?: FileError[];
}


export function handleReadSourceFiles(
  input: ReadSourceFilesInput,
  repoManager: RepoManager,
): string {
  const repo = repoManager.getRepo(input.repository);
  if (!repo) {
    const available = repoManager.getRepoIds().join(", ");
    return JSON.stringify({
      error: `Repository "${input.repository}" not found. Available repositories: ${available}`,
    });
  }

  const output: ReadSourceFilesOutput = {
    repository: input.repository,
    files: [],
  };
  const errors: FileError[] = [];

  for (const filePath of input.file_paths) {
    const fullPath = path.join(repo.repoPath, filePath);

    const resolvedPath = path.resolve(fullPath);
    if (!resolvedPath.startsWith(path.resolve(repo.repoPath))) {
      errors.push({ file_path: filePath, error: "Invalid path: path traversal detected." });
      continue;
    }

    if (!fs.existsSync(resolvedPath)) {
      errors.push({ file_path: filePath, error: `File not found: "${filePath}".` });
      continue;
    }

    const stat = fs.statSync(resolvedPath);
    if (!stat.isFile()) {
      errors.push({ file_path: filePath, error: `"${filePath}" is a directory, not a file.` });
      continue;
    }

    const content = fs.readFileSync(resolvedPath, "utf-8");
    output.files.push({ file_path: filePath, content });
  }

  if (errors.length > 0) {
    output.errors = errors;
  }

  return JSON.stringify(output);
}
