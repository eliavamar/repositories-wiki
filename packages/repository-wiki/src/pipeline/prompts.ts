import type { WikiPage } from "@repositories-wiki/common";
import { FileContentsMap } from "../utils/types";

export function generateWikiStructurePrompt(
  repoName: string,
  commitId: string,
  fileTree: string,
  preloadedCoreFiles?: FileContentsMap
): string {
  const coreFilesSection = buildCoreFilesSection(preloadedCoreFiles);

  return `You are an expert technical writer and software architect. Your task is to analyze a GitHub repository and design the most appropriate wiki structure for comprehensive documentation.

<repository_name>${repoName}</repository_name>
<commit_id>${commitId}</commit_id>

<file_tree>
${fileTree}
</file_tree>
${coreFilesSection}

## Guidelines

**Wiki Structure Strategy:**
- Design a custom wiki structure tailored specifically to this repository's actual codebase.
- Sections and pages must emerge naturally from the repository's content and complexity.
- Ensure every page covers a distinct aspect and earns its place.
- Include pages that benefit from visual diagrams (e.g., architecture overviews, data flows, component relationships, state machines).
- Section names should be specific and meaningful to this domain.

**Scale and Scope:**
- Scale the number of pages organically to match the repository's true complexity. 
- There is no minimum or maximum page limit. A huge monograph may require dozens of pages, while a small repository may only need a few pages.
- Every page must earn its place. Do not create filler pages, redundant pages, duplicate pages, or pages for trivial components just to increase the count.

**Why Scale and Scope Strictness is Critical:**
Strictly matching the wiki size to the project's actual complexity is crucial because:
- **Quality (Usability):** Too many pages bury important info in "fluff," while too few leave dangerous knowledge gaps.
- **Performance:** Generating unnecessary pages slows down the AI, increases timeout risks, and degrades reasoning quality.
- **Cost Efficiency:** Redundant or trivial content wastes output tokens. Every single page must serve a real purpose.

**Page Requirements:**
- Each page must reference at least 5 relevant files to ensure comprehensive documentation coverage.
- Relevant files must use exact paths visible in the provided <file_tree>.

## Instructions

1. Infer what kind of project this is (e.g., CLI tool, web app, library, data pipeline, monorepo).
2. Identify its key subsystems and responsibilities.
3. Determine what a developer needs to understand to work with it effectively.
4. Plan your sections and pages based on the repository's actual scale.

Base on the information above, return as an output only the wiki structure of the repository.
`;
}

export function inferImportantFilesPrompt(fileTree: string, maxFiles: number = 30): string {
  return `You are analyzing a repository's file tree to identify the most architecturally important source files.

## File Tree

<file_tree>
${fileTree}
</file_tree>

## Your Task

From the file tree above, select up to ${maxFiles} files that are most important for understanding this project's architecture, design, and key functionality. These files will be pre-loaded as context for generating wiki documentation.

**Prioritize:**
1. Entry points (main files, index files, app files)
2. Configuration files (package.json, tsconfig, build configs, environment configs)
3. Core type definitions, interfaces, schemas, and models
4. Route definitions, API endpoints, controllers
5. Key service/business logic files
6. Core utility and helper modules
7. Database schemas, migrations, ORM models

**Exclude:**
- Test files (*.test.*, *.spec.*, __tests__/*)
- Generated/build output files
- Lock files (package-lock.json, yarn.lock)
- Asset files (images, fonts, CSS-only files)
- Documentation files (*.md)

IMPORTANT: Only include files that are visible in the file tree above. Do NOT invent paths.
`;
}


export function generatePageContentPrompt(
  page: WikiPage,
  sectionTitle: string,
  repoName: string,
  repoDescription: string,
  pageDepth: number,
  preloadedFiles?: Map<string, string>
): string {
  const preloadedFilesSection = buildPreloadedFilesSection(preloadedFiles);
  const pageDepthStr = depthToStr(pageDepth);
  return `You are an expert technical writer and software architect. Your task is to generate a comprehensive and accurate technical wiki page in Markdown format about a specific feature, system, or module within a given software project.

<project_context>
  <repository_name>${repoName}</repository_name>
  <repository_description>${repoDescription}</repository_description>
</project_context>

<page_requirements>
  <wiki_section>${sectionTitle}</wiki_section>
  <page_topic>${page.title}</page_topic>
</page_requirements>

${preloadedFilesSection}

## Content Generation Guidelines

Based ONLY on the content of the provided <source_files>, generate the wiki page following these rules:


1.  **Introduction:** Start with a concise introduction (1-2 paragraphs, up to 300 charts) explaining the purpose, scope, and high-level overview of "${page.title}" within the context of the overall project. If relevant, and if information is available in the provided files, link to other potential wiki pages using the format \`[Link Text](#page-anchor-or-id)\`.

2.  **Detailed Sections:** Break down "${page.title}" into logical sections using H2 (\`##\`) and H3 (\`###\`) Markdown headings. For each section:
    *   Explain the architecture, components, data flow, or logic relevant to the section's focus, as evidenced in the source files.
    *   Identify key functions, classes, data structures, API endpoints, or configuration elements pertinent to that section.

3.  **Mermaid Diagrams:**
    *   Use Mermaid diagrams (flowchart TD, sequenceDiagram, classDiagram, erDiagram) to visually represent architectures, flows, relationships, and schemas found in the source files.
    *   Ensure diagrams are accurate and derived from the source files. Provide a brief explanation before or after each diagram.
    *   CRITICAL diagram rules:
       - Use "graph TD" (top-down) for flow diagrams — NEVER use "graph LR" (left-right)
       - Maximum node width: 3-4 words
       - For sequence diagrams: define all participants first using "participant" keyword, use ->> for requests and -->> for responses, use +/- for activation boxes
       - Use structural elements where appropriate: loop, alt/else, opt, par/and, break
       - NEVER use flowchart-style labels like A--|label|-->B — always use A->>B: Label

4.  **Tables:**
    *   Use Markdown tables to summarize information such as:
        *   Key features or components and their descriptions.
        *   API endpoint parameters, types, and descriptions.
        *   Configuration options, their types, and default values.
        *   Data model fields, types, constraints, and descriptions.

5.  **Code Snippets (ENTIRELY OPTIONAL):**
    *   Include short, relevant code snippets (e.g., Python, Java, JavaScript, SQL, JSON, YAML) directly from the relevant source files to illustrate key implementation details, data structures, or configurations.
    *   Ensure snippets are well-formatted within Markdown code blocks with appropriate language identifiers.

6.  **Source Citations (EXTREMELY IMPORTANT):**
    *   For EVERY piece of significant information, explanation, diagram, table entry, or code snippet, you MUST cite the specific source file(s) and relevant line numbers from which the information was derived.
    *   Place citations at the end of the paragraph, under the diagram/table, or after the code snippet.
    *   Use the exact format: \`Sources: [filename.ext:start_line-end_line](${pageDepthStr}filename.ext#L{start_line}-L{end_line})\` for a range, or \`Sources: [filename.ext:line_number](${pageDepthStr}filename.ext#Lline_number)\` for a single line. Multiple files can be cited: \`Sources: [file1.ext:1-10](${pageDepthStr}file1.ext#L1-L10), [file2.ext:5](${pageDepthStr}file2.ext#L5), [dir/file3.ext](${pageDepthStr}dir/file3.ext)\` (if the whole file is relevant and line numbers are not applicable or too broad).
    *   If an entire section is overwhelmingly based on one or two files, you can cite them under the section heading in addition to more specific citations within the section.
    *   IMPORTANT: You MUST cite AT LEAST 5 different source files throughout the wiki page to ensure comprehensive coverage.

7.  **Technical Accuracy:** All information must be derived SOLELY from the relevant source files. Do not infer, invent, or use external knowledge about similar systems or common practices unless it's directly supported by the provided code. If information is not present in the provided files, do not include it or explicitly state its absence if crucial to the topic.

8.  **Clarity and Conciseness:** Use clear, professional, and concise technical language suitable for other developers working on or learning about the project. Avoid unnecessary jargon, but use correct technical terms where appropriate.

9.  **Conclusion/Summary:** End with a brief summary paragraph if appropriate for "${page.title}", reiterating the key aspects covered and their significance within the project.

Return ONLY the wiki page content in Markdown format, wrapped in <content> tags. Do not include any other text outside the tags.
Example: <content>wiki page content in Markdown format</content>`;
}

function depthToStr(depth: number) {
  return "../".repeat(depth);
}

export function structureTimeoutRetryPrompt(): string {
  return "Your previous response was cut off due to a timeout. Please provide a complete but more concise wiki structure response.";
}

export function inferFilesTimeoutRetryPrompt(): string {
  return "Your previous response was cut off due to a timeout. Please provide a complete but shorter list of important files.";
}

export function pageContentTimeoutRetryPrompt(pageTitle: string): string {
  return `Your previous response for page "${pageTitle}" was cut off due to a timeout. Please provide a complete but more concise wiki page.`;
}

// ─── Utilities ──────────────────────────────────────────────────────────────

/** Map of file extensions to Markdown code block language identifiers */
const EXTENSION_LANG_MAP: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".py": "python",
  ".java": "java",
  ".go": "go",
  ".rs": "rust",
  ".rb": "ruby",
  ".php": "php",
  ".cs": "csharp",
  ".cpp": "cpp",
  ".c": "c",
  ".h": "c",
  ".hpp": "cpp",
  ".swift": "swift",
  ".kt": "kotlin",
  ".scala": "scala",
  ".sh": "bash",
  ".bash": "bash",
  ".zsh": "bash",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".json": "json",
  ".xml": "xml",
  ".html": "html",
  ".css": "css",
  ".scss": "scss",
  ".less": "less",
  ".sql": "sql",
  ".md": "markdown",
  ".toml": "toml",
  ".ini": "ini",
  ".cfg": "ini",
  ".env": "bash",
  ".dockerfile": "dockerfile",
  ".graphql": "graphql",
  ".gql": "graphql",
  ".proto": "protobuf",
  ".vue": "vue",
  ".svelte": "svelte",
};

/**
 * Get the Markdown code block language identifier for a file path.
 */
function getLanguageForFile(filePath: string): string {
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  return EXTENSION_LANG_MAP[ext] || "";
}

function buildPreloadedFilesSection(preloadedFiles?: Map<string, string>): string {
  if (!preloadedFiles || preloadedFiles.size === 0) return "";

  const parts: string[] = [
    "\n<source_files>",
    "",
  ];

  for (const [filePath, content] of preloadedFiles) {
    const lang = getLanguageForFile(filePath);
    parts.push(`<file path="${filePath}" language="${lang}">`);
    parts.push(content);
    parts.push(`</file>`);
  }

  parts.push("</source_files>\n");

  return parts.join("\n");
}

function buildCoreFilesSection(preloadedFiles?: FileContentsMap): string {
  if (!preloadedFiles || preloadedFiles.size === 0) return "";

  const parts: string[] = [
    "\n<core_files>",
    "",
  ];

  for (const [filePath, content] of preloadedFiles) {
    const lang = getLanguageForFile(filePath);
    parts.push(`<file path="${filePath}" language="${lang}">`);
    parts.push(content);
    parts.push("</file>");
  }

  parts.push("</core_files>\n");

  return parts.join("\n");
}
