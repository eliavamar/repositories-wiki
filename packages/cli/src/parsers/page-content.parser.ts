export interface ParsedPageContent {
  content: string;
  filePaths: string[];
}

export function parsePageContent(xmlResponse: string): ParsedPageContent {
  const filePaths = extractFilePaths(xmlResponse);
  const content = extractContent(xmlResponse);

  return { content, filePaths };
}

function extractFilePaths(response: string): string[] {
  const filePaths: string[] = [];

  // Try to extract from <RELEVANT_SOURCE_FILES> block
  const sourceFilesMatch = response.match(/<RELEVANT_SOURCE_FILES>([\s\S]*?)<\/RELEVANT_SOURCE_FILES>/);
  if (sourceFilesMatch?.[1]) {
    // Parse markdown links: - [path](path) or just - path
    const linkMatches = sourceFilesMatch[1].matchAll(/\[([^\]]+)\]\([^)]+\)/g);
    for (const match of linkMatches) {
      if (match[1]) filePaths.push(match[1].trim());
    }

    // If no markdown links found, try plain list items
    if (filePaths.length === 0) {
      const lineMatches = sourceFilesMatch[1].matchAll(/^[\s-]*([^\s\[\]]+\.[a-zA-Z]+)/gm);
      for (const match of lineMatches) {
        if (match[1]) filePaths.push(match[1].trim());
      }
    }
  }

  return filePaths;
}

function extractContent(response: string): string {
  // Try to extract from <content>...</content>
  const contentMatch = response.match(/<content>([\s\S]*?)<\/content>/);
  if (contentMatch?.[1]) {
    return contentMatch[1].trim();
  }

  // If no XML structure, return as-is (might be plain markdown)
  return response.trim();
}