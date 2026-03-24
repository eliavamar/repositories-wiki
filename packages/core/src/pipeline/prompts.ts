import type { WikiPage, WikiStructureModel, ChangedFilesResult } from "@repositories-wiki/common";
import { FileContentsMap } from "../utils/types";

function getWikiStructureSchema(commitId?: string){
  if(commitId){
    return `
<wiki_structure>
  <title>[Overall title for the wiki]</title>
  <description>[Brief description of the repository]</description>
  <commit_id>${commitId}</commit_id>
  <sections>
    <section id="section-1">
      <title>[Section title]</title>
      <pages>
        <page_ref>page-1</page_ref>
        <page_ref>page-2</page_ref>
      </pages>

    </section>
    <!-- More sections as needed -->
  </sections>
  <pages>
    <page id="page-1">
      <title>[Page title]</title>
      <description>[What this page covers, and whether a diagram would help]</description>
      <relevant_files>
        <file_path>[Path to a relevant file from the repo]</file_path>
        <!-- More file paths as needed -->
      </relevant_files>
      <related_pages>
        <related>page-2</related>
      </related_pages>
      <parent_section>section-1</parent_section>
    </page>
    <!-- More pages as needed -->
  </pages>
</wiki_structure>
  `
  }
    return `
<wiki_structure>
  <title>[Overall title for the wiki]</title>
  <description>[Brief description of the repository]</description>
  <commit_id>[The commit id]</commit_id>
  <sections>
    <section id="section-1">
      <title>[Section title]</title>
      <pages>
        <page_ref>page-1</page_ref>
        <page_ref>page-2</page_ref>
      </pages>

    </section>
    <!-- More sections as needed -->
  </sections>
  <pages>
    <page id="page-1">
      <title>[Page title]</title>
      <description>[What this page covers, and whether a diagram would help]</description>
      <relevant_files>
        <file_path>[Path to a relevant file from the repo]</file_path>
        <!-- More file paths as needed -->
      </relevant_files>
      <related_pages>
        <related>page-2</related>
      </related_pages>
      <parent_section>section-1</parent_section>
    </page>
    <!-- More pages as needed -->
  </pages>
</wiki_structure>
  ` 
}
export function generateWikiStructurePrompt(
  repoName: string,
  commitId: string,
  fileTree: string,
  preloadedCoreFiles?: FileContentsMap
): string {
  const coreFilesSection = buildCoreFilesSection(preloadedCoreFiles);

  return `
Analyze this GitHub repository ${repoName} and design the most appropriate wiki structure for it.

## Repository File Structure

<file_tree>
${fileTree}
</file_tree>
${coreFilesSection}

## Your Task

Then design a wiki from scratch — **do not use a fixed template**. The sections and pages should emerge naturally from the repository's actual content and complexity.

## Guidelines

**Pages** 
- When designing the wiki structure, include pages that would benefit from visual diagrams, such as:
    - Architecture overviews
    - Data flow descriptions
    - Component relationships
    - Process workflows
    - State machines
    - Class hierarchies
- A small/focused repo may need only 4–6 pages
- A medium repo typically warrants 6–12 pages
- A large or complex repo may justify up to 12–17 pages
- NEVER generate more than 20 pages total.

**Sections** should reflect the real conceptual boundaries of *this* project. Common themes to consider (use only what applies):
- How the system is structured and why
- How data moves through it
- What the major features or modules do
- How to set it up, run it, and deploy it
- How to extend or integrate with it
- Any domain-specific concerns (AI models, auth, real-time systems, etc.)

Invent section names that are specific and meaningful for this repo. Avoid generic titles like "Miscellaneous" or "Other."

Avoid creating pages that would be redundant, near-empty, or that repeat each other. Every page should earn its place.

**Diagrams:** Flag pages that would benefit from a visual by noting it in their description. Good candidates include: architecture overviews, data flows, component relationships, process workflows, state machines, and class hierarchies.

## Output Format
  ${getWikiStructureSchema(commitId)}

Return your analysis in the following XML format:

IMPORTANT:
1. Section and page titles must be derived from the actual repository — do not copy generic template names
2. Page count must be proportional to the repository's size and complexity, not a fixed number
3. Every page's relevant_files must reference real paths visible in the file tree above
4. Each page should cover a distinct aspect — no overlap, no filler pages
5. Each page Should have at least 5 relevant_files to ensure comprehensive documentation coverage.
6. The output MUST be in the XML format specified above — return the complete <wiki_structure> element with all required nested elements
7. Do NOT include any other text, explanations, or commentary outside the XML structure — return ONLY the <wiki_structure> XML block
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
- Documentation files (*.md) except README.md

## Output Format

Return ONLY a list of file paths, one per line, wrapped in XML tags. No explanations, no other text.

<important_files>
path/to/file1.ts
path/to/file2.ts
</important_files>

IMPORTANT: Only include files that are visible in the file tree above. Do NOT invent paths.
Do NOT access the codebase — base your selection entirely on the file tree.`;
}

export function generateUpdateWikiStructurePrompt(
  repoName: string,
  commitId: string,
  fileTree: string,
  previousStructure: WikiStructureModel,
  changedFiles: ChangedFilesResult,
  changedFilesDirPath?: string
): string {
  // Strip content from pages for the prompt (keep structure only)
  const structureWithoutContent = {
    ...previousStructure,
    pages: previousStructure.pages.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      relevantFiles: p.relevantFiles,
      relatedPages: p.relatedPages,
    })),
  };

  const changedFilesList = changedFiles.files
    .map((f) => `- ${f.changeType.toUpperCase()}: ${f.path}`)
    .join("\n");

  const diffDirInfo = changedFilesDirPath
    ? `\nThe full diffs for each changed file are available in the directory: ${changedFilesDirPath}\nEach file in that directory contains the diff content for the corresponding changed file (filename format: path__to__file.ext.diff).`
    : "";

  return `
You are an expert technical documentation specialist with deep understanding of software architecture and codebase evolution. Your task is to maintain a wiki for the repository "${repoName}".

## Current Wiki Structure (without page content)

The following is the existing wiki structure. Page content is omitted - only the structure and metadata are shown:

<current_structure>
${JSON.stringify(structureWithoutContent, null, 2)}
</current_structure>

## Repository File Structure

The following is the current file tree of the repository:

<file_tree>
${fileTree}
</file_tree>

## Changes Since Last Wiki Update

The following files have changed between commit ${previousStructure.commitId} and ${commitId}:

<changed_files>
${changedFilesList || "No files changed"}
</changed_files>
${diffDirInfo}

## Your Task

1. **Quick Brief**: Take a quick look at the current wiki structure and the codebase file tree to understand how they relate to each other.

2. **Understand the Changes**: Analyze the code changes listed above and understand how they affect the codebase - what functionality was added, modified, or removed.

3. **Assess Wiki Impact**: Based on your understanding of the changes, determine how they should affect the wiki structure.

4. **Make Your Decision**: For each page, decide:
   - **UPDATE**: The page needs updating because:
     - New files with related functionality should be added to this page, OR
     - Existing files that this page documents have changed in ways that affect the documentation
   - **NEW**: New functionality was introduced that doesn't fit in any existing page - create a new page for it
   - **REMOVE**: Based on the changes, this page is no longer relevant (simply omit it from the output)
   - **UNCHANGED**: The page is not affected by the recent changes (no status attribute)

5. **Section Management**:
   - If a **NEW page** is added and it doesn't fit any existing section, create a new section for it
   - If an **UPDATED page** no longer fits its current section due to the changes, move it to a more appropriate section or create a new one
   - If pages are **REMOVED** and a section becomes empty, omit that section from the output

### Wiki Structure Concepts

When designing or updating the wiki structure, include pages that would benefit from visual diagrams, such as:
- Architecture overviews
- Data flow descriptions
- Component relationships
- Process workflows
- State machines
- Class hierarchies

The wiki should ideally have the following main sections:
- **Overview** (general information about the project)
- **System Architecture** (how the system is designed)
- **Core Features** (key functionality)
- **Data Management/Flow**: If applicable, how data is stored, processed, accessed, and managed (e.g., database schema, data pipelines, state management)
- **Frontend Components** (UI elements, if applicable)
- **Backend Systems** (server-side components, if applicable)
- **Model Integration** (AI model connections, if applicable)
- **Deployment/Infrastructure** (how to deploy, what's the infrastructure like, if applicable)
- **Extensibility and Customization**: If the project architecture supports it, explain how to extend or customize its functionality (e.g., plugins, theming, custom modules, hooks)

Each section should contain relevant pages. For example, the "Frontend Components" section might include pages for "Home Page", "Repository Wiki Page", "Ask Component", etc.

### Important Guidelines

- Keep existing page IDs when possible for consistency
- Only mark pages as UPDATE if the changes actually affect their content
- When adding new pages, assign unique IDs (e.g., "page-13", "new-feature-page")
- If a section becomes empty after removing pages, remove the section too

## Output Format

Return the updated wiki structure in the following XML format:

<wiki_structure>
  <title>[Overall title for the wiki]</title>
  <description>[Brief description of the repository]</description>
  <commit_id>${commitId}</commit_id>
  <sections>
    <section id="section-1">
      <title>[Section title]</title>
      <pages>
        <page_ref>page-1</page_ref>
        <page_ref>page-2</page_ref>
      </pages>
    </section>
    <!-- More sections as needed -->
  </sections>
  <pages>
    <!-- Page needing update (content will be regenerated) -->
    <page id="existing-page-id" status="UPDATE">
      <title>[Page title]</title>
      <description>[Brief description of what this page will cover]</description>
      <relevant_files>
        <file_path>[Path to a relevant file]</file_path>
      </relevant_files>
      <related_pages>
        <related>page-2</related>
      </related_pages>
    </page>
    
    <!-- Brand new page -->
    <page id="new-page-id" status="NEW">
      <title>[New Page title]</title>
      <description>[Brief description of what this page will cover]</description>
      <relevant_files>
        <file_path>[Path to a relevant file]</file_path>
      </relevant_files>
      <related_pages>
        <related>page-1</related>
      </related_pages>
    </page>
    
    <!-- Unchanged page (no status = keep existing content) -->
    <page id="existing-page-id">
      <title>[Page title]</title>
      <description>[Brief description of what this page will cover]</description>
      <relevant_files>
        <file_path>[Path to a relevant file]</file_path>
      </relevant_files>
      <related_pages>
        <related>page-3</related>
      </related_pages>
    </page>
    
    <!-- Pages that should be deleted are simply NOT included -->
  </pages>
</wiki_structure>

IMPORTANT:
1. Only include pages that should exist in the updated wiki
2. Use status="NEW" for brand new pages that need full content generation
3. Use status="UPDATE" for existing pages whose content needs to be regenerated
4. Omit the status attribute for pages that should keep their existing content
5. Do not include pages that should be deleted - just leave them out
`;
}

export function generatePageContentPrompt(
  page: WikiPage,
  sectionTitle: string,
  repoName: string,
  repoDescription: string,
  preloadedFiles?: Map<string, string>
): string {
  // Build the pre-loaded files section if files are provided
  const preloadedFilesSection = buildPreloadedFilesSection(preloadedFiles);

  return `You are an expert technical writer and software architect.
Your task is to generate a comprehensive and accurate technical wiki page in Markdown format about a specific feature, system, or module within a given software project.



You will be given:
1. The "[WIKI_PAGE_TOPIC]" for the page you need to create.
2. A list of \"[RELEVANT_SOURCE_FILES]\" from the project that you MUST use as the sole basis for the content. The content of the relevant source files is pre-loaded below. Use these as your primary source of truth.

**Project Context:**
- **Repository Name:** ${repoName}
- **Repository Description:** ${repoDescription}

**What This Page Should Cover:**
- **Wiki Section:** ${sectionTitle}
- **Page Topic:** ${page.title}
- **Page Description:** ${page.description}

CRITICAL OUTPUT FORMAT INSTRUCTION:
Your response MUST be wrapped in the following XML structure inside a \`<details>\` block. Do not provide any acknowledgements, disclaimers, apologies, or any other preface. JUST START with the \`<details>\` block.

Format your response EXACTLY like this:
<details>
<RELEVANT_SOURCE_FILES>
${page.relevantFiles.map(f => `- [${f.filePath}](${f.filePath})`).join('\\n')}
</RELEVANT_SOURCE_FILES>
<content>
# ${page.title}

[Your full wiki page content goes here in Markdown format]
</content>
</details>

IMPORTANT:
- The \`<RELEVANT_SOURCE_FILES>\` section MUST list ALL source files you used to generate the content.
- The \`<content>\` section contains the actual wiki page in Markdown format, starting with the H1 heading \`# ${page.title}\`.

Based ONLY on the content of the \`[RELEVANT_SOURCE_FILES]\`:

1.  **Introduction:** Start with a concise introduction (1-2 paragraphs) explaining the purpose, scope, and high-level overview of "${page.title}" within the context of the overall project. If relevant, and if information is available in the provided files, link to other potential wiki pages using the format \`[Link Text](#page-anchor-or-id)\`.

2.  **Detailed Sections:** Break down "${page.title}" into logical sections using H2 (\`##\`) and H3 (\`###\`) Markdown headings. For each section:
    *   Explain the architecture, components, data flow, or logic relevant to the section's focus, as evidenced in the source files.
    *   Identify key functions, classes, data structures, API endpoints, or configuration elements pertinent to that section.

3.  **Mermaid Diagrams:**
    *   Use Mermaid diagrams (flowchart TD, sequenceDiagram, classDiagram, erDiagram) to visually represent architectures, flows, relationships, and schemas found in the source files.
    *   Ensure diagrams are accurate and derived from the source files. Provide a brief explanation before or after each diagram.
    *   CRITICAL diagram rules:
       - Use \"graph TD\" (top-down) for flow diagrams — NEVER use \"graph LR\" (left-right)
       - Maximum node width: 3-4 words
       - For sequence diagrams: define all participants first using \"participant\" keyword, use ->> for requests and -->> for responses, use +/- for activation boxes
       - Use structural elements where appropriate: loop, alt/else, opt, par/and, break
       - NEVER use flowchart-style labels like A--|label|-->B — always use A->>B: Label

4.  **Tables:**
    *   Use Markdown tables to summarize information such as:
        *   Key features or components and their descriptions.
        *   API endpoint parameters, types, and descriptions.
        *   Configuration options, their types, and default values.
        *   Data model fields, types, constraints, and descriptions.

5.  **Code Snippets (ENTIRELY OPTIONAL):**
    *   Include short, relevant code snippets (e.g., Python, Java, JavaScript, SQL, JSON, YAML) directly from the \`[RELEVANT_SOURCE_FILES]\` to illustrate key implementation details, data structures, or configurations.
    *   Ensure snippets are well-formatted within Markdown code blocks with appropriate language identifiers.

6.  **Source Citations (EXTREMELY IMPORTANT):**
    *   For EVERY piece of significant information, explanation, diagram, table entry, or code snippet, you MUST cite the specific source file(s) and relevant line numbers from which the information was derived.
    *   Place citations at the end of the paragraph, under the diagram/table, or after the code snippet.
    *   Use the exact format: \`Sources: [filename.ext:start_line-end_line]()\` for a range, or \`Sources: [filename.ext:line_number]()\` for a single line. Multiple files can be cited: \`Sources: [file1.ext:1-10](), [file2.ext:5](), [dir/file3.ext]()\` (if the whole file is relevant and line numbers are not applicable or too broad).
    *   If an entire section is overwhelmingly based on one or two files, you can cite them under the section heading in addition to more specific citations within the section.
    *   IMPORTANT: You MUST cite AT LEAST 5 different source files throughout the wiki page to ensure comprehensive coverage.

7.  **Technical Accuracy:** All information must be derived SOLELY from the \`[RELEVANT_SOURCE_FILES]\`. Do not infer, invent, or use external knowledge about similar systems or common practices unless it's directly supported by the provided code. If information is not present in the provided files, do not include it or explicitly state its absence if crucial to the topic.

8.  **Clarity and Conciseness:** Use clear, professional, and concise technical language suitable for other developers working on or learning about the project. Avoid unnecessary jargon, but use correct technical terms where appropriate.

9.  **Conclusion/Summary:** End with a brief summary paragraph if appropriate for \"${page.title}\", reiterating the key aspects covered and their significance within the project.

${preloadedFilesSection}`;
}

export function structureTimeoutRetryPrompt(): string {
  return "Your previous response was cut off due to a timeout. Please provide a complete but more concise response. Make sure to wrap the entire wiki structure in <wiki_structure>...</wiki_structure> XML tags.";
}

export function structureParsingRetryPrompt(): string {
  return `Your previous response could not be parsed. Please provide your response again using the exact XML format below:

  ${getWikiStructureSchema()}

IMPORTANT: Return ONLY the <wiki_structure> XML block with no other text outside it.`;
}

export function inferFilesTimeoutRetryPrompt(): string {
  return "Your previous response was cut off due to a timeout. Please provide a complete but more concise response. Make sure to wrap the file list in <important_files>...</important_files> XML tags.";
}

export function inferFilesParsingRetryPrompt(): string {
  return `Your previous response could not be parsed. Please provide your response again using the exact XML format below:

<important_files>
path/to/file1.ts
path/to/file2.ts
path/to/file3.ts
</important_files>

IMPORTANT: Return ONLY file paths (one per line) wrapped in <important_files> tags. No explanations, no other text.`;
}

export function pageContentTimeoutRetryPrompt(pageTitle: string): string {
  return `Your previous response for page "${pageTitle}" was cut off due to a timeout. Please provide a complete but more concise response. Make sure to include <content>...</content> tags with the full page content.`;
}

export function pageContentParsingRetryPrompt(pageTitle: string): string {
  return `Your previous response for page "${pageTitle}" could not be parsed. Please provide your response again using the exact XML format below:

<details>
<RELEVANT_SOURCE_FILES>
- [path/to/file1.ts](path/to/file1.ts)
- [path/to/file2.ts](path/to/file2.ts)
</RELEVANT_SOURCE_FILES>
<content>
# ${pageTitle}

[Your full wiki page content goes here in Markdown format]
</content>
</details>

IMPORTANT:
- The <RELEVANT_SOURCE_FILES> section MUST list ALL source files you used to generate the content.
- The <content> section contains the actual wiki page in Markdown format, starting with the H1 heading # ${pageTitle}.
- Do not include any text outside the <details> block.`;
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

/**
 * Build the pre-loaded source files section to append to the prompt.
 * Returns an empty string if no files are provided.
 */
function buildPreloadedFilesSection(preloadedFiles?: Map<string, string>): string {
  if (!preloadedFiles || preloadedFiles.size === 0) return "";

  const parts: string[] = [
    "\n\n## Pre-loaded Source Files\n",
    "The following source files have been pre-loaded for your reference. Use these as your primary source of truth for writing the wiki page.\n",
  ];

  for (const [filePath, content] of preloadedFiles) {
    const lang = getLanguageForFile(filePath);
    parts.push(`### ${filePath}`);
    parts.push(`\`\`\`${lang}`);
    parts.push(content);
    parts.push("```\n");
  }

  return parts.join("\n");
}

/**
 * Build the pre-loaded core repository files section for the structure generation prompt.
 * These are key files (entry points, configs, types, etc.) automatically detected
 * based on the repository's technology stack.
 * Returns an empty string if no files are provided.
 */
function buildCoreFilesSection(preloadedFiles?: Map<string, string>): string {
  if (!preloadedFiles || preloadedFiles.size === 0) return "";

  const parts: string[] = [
    "\n## Pre-loaded Core Repository Files\n",
    "The following core files from the repository have been pre-loaded for your reference. Use these to understand the project's technology stack, architecture, and key components.\n",
  ];

  for (const [filePath, content] of preloadedFiles) {
    const lang = getLanguageForFile(filePath);
    parts.push(`### ${filePath}`);
    parts.push(`\`\`\`${lang}`);
    parts.push(content);
    parts.push("```\n");
  }

  parts.push(`
Using the file tree and pre-loaded core files above, infer:
  - What kind of project this is (e.g., CLI tool, web app, library, data pipeline, monorepo)
  - What its key subsystems and responsibilities are
  - What a developer would need to understand to work with it effectively
If you need more information you can accses code base.`)

  return parts.join("\n");
}