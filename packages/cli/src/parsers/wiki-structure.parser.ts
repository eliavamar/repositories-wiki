import type { WikiStructureModel, WikiPage, WikiSection, PageStatus } from "@repositories-wiki/core";

export function parseWikiStructure(xmlResponse: string): WikiStructureModel {
  const wikiStructureMatch = xmlResponse.match(/<wiki_structure>([\s\S]*?)<\/wiki_structure>/);
  if (!wikiStructureMatch?.[1]) {
    throw new Error("Could not find <wiki_structure> in response");
  }

  const xml = wikiStructureMatch[1];

  const title = extractTag(xml, "title");
  const description = extractTag(xml, "description");
  const commitId = extractTag(xml, "commit_id");

  const pages = parseWikiStructurePages(xml);
  const sections = parseSections(xml);
  const rootSections = sections
    .filter((s) => !xml.includes(`<section_ref>${s.id}</section_ref>`))
    .map((s) => s.id);

  return {
    commitId,
    title,
    description,
    pages,
    sections: sections.length > 0 ? sections : undefined,
    rootSections: rootSections.length > 0 ? rootSections : undefined,
  };
}

export function parseUpdateWikiStructure(
  xmlResponse: string,
  previousStructure: WikiStructureModel
): WikiStructureModel {
  const wikiStructureMatch = xmlResponse.match(/<wiki_structure>([\s\S]*?)<\/wiki_structure>/);
  if (!wikiStructureMatch?.[1]) {
    throw new Error("Could not find <wiki_structure> in response");
  }

  const xml = wikiStructureMatch[1];

  const title = extractTag(xml, "title");
  const description = extractTag(xml, "description");
  const commitId = extractTag(xml, "commit_id");

  // Parse pages with status attribute
  const pages = parseWikiStructurePagesWithStatus(xml, previousStructure);
  const sections = parseSections(xml);
  const rootSections = sections
    .filter((s) => !xml.includes(`<section_ref>${s.id}</section_ref>`))
    .map((s) => s.id);

  return {
    commitId,
    title,
    description,
    pages,
    sections: sections.length > 0 ? sections : undefined,
    rootSections: rootSections.length > 0 ? rootSections : undefined,
  };
}

function extractTag(xml: string, tagName: string): string {
  const match = xml.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`));
  return match?.[1]?.trim() ?? "";
}

function parseWikiStructurePages(xml: string): WikiPage[] {
  // Find the <pages> block that contains actual <page> elements (not <page_ref>)
  const allPagesMatches = [...xml.matchAll(/<pages>([\s\S]*?)<\/pages>/g)];
  const pagesSection = allPagesMatches.find((m) => m[1]?.includes("<page "));
  if (!pagesSection?.[1]) return [];

  const pageMatches = pagesSection[1].matchAll(/<page\s+id="([^"]+)">([\s\S]*?)<\/page>/g);
  const pages: WikiPage[] = [];

  for (const match of pageMatches) {
    const id = match[1];
    const pageXml = match[2];
    if (!id || !pageXml) continue;

    const relevantFiles: { filePath: string }[] = [];
    const fileMatches = pageXml.matchAll(/<file_path>([^<]+)<\/file_path>/g);
    for (const fm of fileMatches) {
      if (fm[1]) relevantFiles.push({ filePath: fm[1].trim() });
    }

    const relatedPages: string[] = [];
    const relatedMatches = pageXml.matchAll(/<related>([^<]+)<\/related>/g);
    for (const rm of relatedMatches) {
      if (rm[1]) relatedPages.push(rm[1].trim());
    }

    pages.push({
      id,
      title: extractTag(pageXml, "title"),
      description: extractTag(pageXml, "description"),
      content: "",
      relevantFiles,
      relatedPages,
    });
  }

  return pages;
}

/**
 * Parse pages with status attribute for update flow.
 * - Pages with status="NEW" or status="UPDATE" will have empty content (to be generated)
 * - Pages without status will preserve content from previousStructure
 */
function parseWikiStructurePagesWithStatus(
  xml: string,
  previousStructure: WikiStructureModel
): WikiPage[] {
  // Find the <pages> block that contains actual <page> elements (not <page_ref>)
  const allPagesMatches = [...xml.matchAll(/<pages>([\s\S]*?)<\/pages>/g)];
  const pagesSection = allPagesMatches.find((m) => m[1]?.includes("<page "));
  if (!pagesSection?.[1]) return [];

  // Updated regex to capture optional status attribute
  // Matches: <page id="xxx"> or <page id="xxx" status="NEW"> or <page id="xxx" status="UPDATE">
  const pageMatches = pagesSection[1].matchAll(
    /<page\s+id="([^"]+)"(?:\s+status="([^"]+)")?\s*>([\s\S]*?)<\/page>/g
  );
  const pages: WikiPage[] = [];

  // Create a map of previous pages for quick lookup
  const previousPagesMap = new Map<string, WikiPage>();
  for (const page of previousStructure.pages) {
    previousPagesMap.set(page.id, page);
  }

  for (const match of pageMatches) {
    const id = match[1];
    const statusAttr = match[2] as PageStatus | undefined;
    const pageXml = match[3];
    if (!id || !pageXml) continue;

    const relevantFiles: { filePath: string }[] = [];
    const fileMatches = pageXml.matchAll(/<file_path>([^<]+)<\/file_path>/g);
    for (const fm of fileMatches) {
      if (fm[1]) relevantFiles.push({ filePath: fm[1].trim() });
    }

    const relatedPages: string[] = [];
    const relatedMatches = pageXml.matchAll(/<related>([^<]+)<\/related>/g);
    for (const rm of relatedMatches) {
      if (rm[1]) relatedPages.push(rm[1].trim());
    }

    // Determine content based on status
    let content = "";
    let status: PageStatus | undefined = statusAttr;

    if (!status) {
      // No status means keep existing content
      const previousPage = previousPagesMap.get(id);
      if (previousPage) {
        content = previousPage.content;
      }
      // status remains undefined
    }
    // If status is "NEW" or "UPDATE", content will be generated later (leave empty)

    pages.push({
      id,
      title: extractTag(pageXml, "title"),
      description: extractTag(pageXml, "description"),
      content,
      relevantFiles,
      relatedPages,
      status,
    });
  }

  return pages;
}

function parseSections(xml: string): WikiSection[] {
  const sectionsBlock = xml.match(/<sections>([\s\S]*?)<\/sections>/);
  if (!sectionsBlock?.[1]) return [];

  const sectionMatches = sectionsBlock[1].matchAll(/<section\s+id="([^"]+)">([\s\S]*?)<\/section>/g);
  const sections: WikiSection[] = [];

  for (const match of sectionMatches) {
    const id = match[1];
    const sectionXml = match[2];
    if (!id || !sectionXml) continue;

    const pageRefs: string[] = [];
    const pageRefMatches = sectionXml.matchAll(/<page_ref>([^<]+)<\/page_ref>/g);
    for (const pm of pageRefMatches) {
      if (pm[1]) pageRefs.push(pm[1].trim());
    }



    sections.push({
      id,
      title: extractTag(sectionXml, "title"),
      pages: pageRefs,
    });
  }

  return sections;
}