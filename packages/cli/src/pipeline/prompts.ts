import type { WikiPage, WikiStructureModel, ChangedFilesResult } from "@repositories-wiki/core";


export function generateWikiStructurePrompt(repoName: string, commitId: string, fileTree: string): string {
  return `
Analyze this GitHub repository ${repoName} and design the most appropriate wiki structure for it.

## Repository File Structure

<file_tree>
${fileTree}
</file_tree>

## Your Task

Study the codebase carefully and infer:
- What kind of project this is (e.g., CLI tool, web app, library, data pipeline, monorepo)
- What its key subsystems and responsibilities are
- What a developer would need to understand to work with it effectively

Then design a wiki from scratch — **do not use a fixed template**. The sections and pages should emerge naturally from the repository's actual content and complexity.

## Guidelines

**Sections** should reflect the real conceptual boundaries of *this* project. Common themes to consider (use only what applies):
- How the system is structured and why
- How data moves through it
- What the major features or modules do
- How to set it up, run it, and deploy it
- How to extend or integrate with it
- Any domain-specific concerns (AI models, auth, real-time systems, etc.)

Invent section names that are specific and meaningful for this repo. Avoid generic titles like "Miscellaneous" or "Other."

**Pages** should each cover one focused, self-contained topic. Calibrate the total page count to the repository's actual complexity:
- A small/focused repo may need only 4–6 pages
- A medium repo typically warrants 8–14 pages
- A large or complex repo may justify up to 17–22 pages

Avoid creating pages that would be redundant, near-empty, or that repeat each other. Every page should earn its place.

**Diagrams:** Flag pages that would benefit from a visual by noting it in their description. Good candidates include: architecture overviews, data flows, component relationships, process workflows, state machines, and class hierarchies.

## Output Format

Return your analysis in the following XML format:

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
      <subsections>
        <section_ref>section-2</section_ref>
      </subsections>
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

IMPORTANT:
1. Section and page titles must be derived from the actual repository — do not copy generic template names
2. Page count must be proportional to the repository's size and complexity, not a fixed number
3. Every page's relevant_files must reference real paths visible in the file tree above
4. Each page should cover a distinct aspect — no overlap, no filler pages
`;
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
- Maintain the section hierarchy (rootSections -> sections -> subsections)

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
      <subsections>
        <section_ref>section-2</section_ref>
      </subsections>
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
2. A list of "[RELEVANT_SOURCE_FILES]" from the project that you MUST use as the sole basis for the content. The content of the relevant source files is pre-loaded below. Use these as your primary source of truth. If you need additional context from files not provided below, you can still access the codebase. You MUST use AT LEAST 5 relevant source files for comprehensive coverage - if fewer are provided, search for additional related files in the codebase.

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
${page.relevantFiles.map(f => `- [${f.filePath}](${f.filePath})`).join('\n')}
<!-- Add additional relevant files if fewer than 5 were provided -->
</RELEVANT_SOURCE_FILES>
<content>
# ${page.title}

[Your full wiki page content goes here in Markdown format]
</content>
</details>

IMPORTANT:
- The \`<RELEVANT_SOURCE_FILES>\` section MUST list ALL source files you used to generate the content. There MUST be AT LEAST 5 source files listed.
- The \`<content>\` section contains the actual wiki page in Markdown format, starting with the H1 heading \`# ${page.title}\`.

Based ONLY on the content of the \`[RELEVANT_SOURCE_FILES]\`:

1.  **Introduction:** Start with a concise introduction (1-2 paragraphs) explaining the purpose, scope, and high-level overview of "${page.title}" within the context of the overall project. If relevant, and if information is available in the provided files, link to other potential wiki pages using the format \`[Link Text](#page-anchor-or-id)\`.

2.  **Detailed Sections:** Break down "${page.title}" into logical sections using H2 (\`##\`) and H3 (\`###\`) Markdown headings. For each section:
    *   Explain the architecture, components, data flow, or logic relevant to the section's focus, as evidenced in the source files.
    *   Identify key functions, classes, data structures, API endpoints, or configuration elements pertinent to that section.

3.  **Mermaid Diagrams:**
    *   EXTENSIVELY use Mermaid diagrams (e.g., \`flowchart TD\`, \`sequenceDiagram\`, \`classDiagram\`, \`erDiagram\`, \`graph TD\`) to visually represent architectures, flows, relationships, and schemas found in the source files.
    *   Ensure diagrams are accurate and directly derived from information in the \`[RELEVANT_SOURCE_FILES]\`.
    *   Provide a brief explanation before or after each diagram to give context.
    *   CRITICAL: All diagrams MUST follow strict vertical orientation:
       - Use "graph TD" (top-down) directive for flow diagrams
       - NEVER use "graph LR" (left-right)
       - Maximum node width should be 3-4 words
       - For sequence diagrams:
         - Start with "sequenceDiagram" directive on its own line
         - Define ALL participants at the beginning using "participant" keyword
         - Optionally specify participant types: actor, boundary, control, entity, database, collections, queue
         - Use descriptive but concise participant names, or use aliases: "participant A as Alice"
         - Use the correct Mermaid arrow syntax (8 types available):
           - -> solid line without arrow (rarely used)
           - --> dotted line without arrow (rarely used)
           - ->> solid line with arrowhead (most common for requests/calls)
           - -->> dotted line with arrowhead (most common for responses/returns)
           - ->x solid line with X at end (failed/error message)
           - -->x dotted line with X at end (failed/error response)
           - -) solid line with open arrow (async message, fire-and-forget)
           - --) dotted line with open arrow (async response)
           - Examples: A->>B: Request, B-->>A: Response, A->xB: Error, A-)B: Async event
         - Use +/- suffix for activation boxes: A->>+B: Start (activates B), B-->>-A: End (deactivates B)
         - Group related participants using "box": box GroupName ... end
         - Use structural elements for complex flows:
           - loop LoopText ... end (for iterations)
           - alt ConditionText ... else ... end (for conditionals)
           - opt OptionalText ... end (for optional flows)
           - par ParallelText ... and ... end (for parallel actions)
           - critical CriticalText ... option ... end (for critical regions)
           - break BreakText ... end (for breaking flows/exceptions)
         - Add notes for clarification: "Note over A,B: Description", "Note right of A: Detail"
         - Use autonumber directive to add sequence numbers to messages
         - NEVER use flowchart-style labels like A--|label|-->B. Always use a colon for labels: A->>B: My Label

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

9.  **Conclusion/Summary:** End with a brief summary paragraph if appropriate for "${page.title}", reiterating the key aspects covered and their significance within the project.


Remember:
- Ground every claim in the provided source files.
- Prioritize accuracy and direct representation of the code's functionality and structure.
- Structure the document logically for easy understanding by other developers.
- Your response MUST start with \`<details>\` and use the exact XML structure: \`<RELEVANT_SOURCE_FILES>\` followed by \`<content>\`.
- Do NOT include any text before the \`<details>\` block.
${preloadedFilesSection}`;
}

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