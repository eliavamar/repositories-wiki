# Content Generation Guidelines

When writing or updating wiki page content, follow these rules. Base all content ONLY on the actual source files in the repository.

## 1. Introduction

Start with a concise introduction (1-2 paragraphs, up to 300 characters) explaining the purpose, scope, and high-level overview of the page topic within the context of the overall project. If relevant, link to other wiki pages using the format `[Link Text](#page-anchor-or-id)`.

## 2. Detailed Sections

Break down the topic into logical sections using H2 (`##`) and H3 (`###`) Markdown headings. For each section:
- Explain the architecture, components, data flow, or logic relevant to the section's focus, as evidenced in the source files.
- Identify key functions, classes, data structures, API endpoints, or configuration elements pertinent to that section.

## 3. Mermaid Diagrams

Use Mermaid diagrams (flowchart TD, sequenceDiagram, classDiagram, erDiagram) to visually represent architectures, flows, relationships, and schemas found in the source files. Provide a brief explanation before or after each diagram.

CRITICAL diagram rules:
- Use `graph TD` (top-down) for flow diagrams — NEVER use `graph LR` (left-right)
- Maximum node width: 3-4 words
- For sequence diagrams: define all participants first using `participant` keyword, use `->>` for requests and `-->>` for responses, use `+`/`-` for activation boxes
- Use structural elements where appropriate: `loop`, `alt/else`, `opt`, `par/and`, `break`
- NEVER use flowchart-style labels like `A--|label|-->B` — always use `A->>B: Label`

## 4. Tables

Use Markdown tables to summarize information such as:
- Key features or components and their descriptions
- API endpoint parameters, types, and descriptions
- Configuration options, their types, and default values
- Data model fields, types, constraints, and descriptions

## 5. Code Snippets (Entirely Optional)

Include short, relevant code snippets directly from the source files to illustrate key implementation details, data structures, or configurations. Ensure snippets are well-formatted within Markdown code blocks with appropriate language identifiers.

## 6. Source Citations (Extremely Important)

For EVERY piece of significant information, explanation, diagram, table entry, or code snippet, you MUST cite the specific source file(s) and relevant line numbers.

Place citations at the end of the paragraph, under the diagram/table, or after the code snippet.

Use the exact format (adjust the relative path based on the wiki page's depth in the folder structure):
- Range: `Sources: [filename.ext:start_line-end_line](<relative_file_path>/filename.ext#Lstart_line-Lend_line)`
- Single line: `Sources: [filename.ext:line_number](<relative_file_path>/filename.ext#Lline_number)`
- Multiple files: `Sources: [file1.ext:1-10](<relative_file_path>/file1.ext#L1-L10), [file2.ext:5](<relative_file_path>/file2.ext#L5)`
- Whole file: `Sources: [dir/file3.ext](<relative_file_path>/dir/file3.ext)`

If an entire section is overwhelmingly based on one or two files, cite them under the section heading in addition to more specific citations within the section.

You MUST cite AT LEAST 5 different source files throughout a wiki page.

## 7. Technical Accuracy

All information must be derived SOLELY from the relevant source files. Do not infer, invent, or use external knowledge about similar systems or common practices unless directly supported by the code. If information is not present in the provided files, do not include it or explicitly state its absence if crucial to the topic.

## 8. Clarity and Conciseness

Use clear, professional, and concise technical language suitable for other developers working on or learning about the project. Avoid unnecessary jargon, but use correct technical terms where appropriate.

## 9. Conclusion / Summary

End with a brief summary paragraph if appropriate, reiterating the key aspects covered and their significance within the project.
