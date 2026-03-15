import type { WikiStructureModel, WikiPage, WikiSection } from "@repositories-wiki/core";

export function parseWikiStructure(xmlResponse: string): WikiStructureModel {
  const wikiStructureMatch = xmlResponse.match(/<wiki_structure>([\s\S]*?)<\/wiki_structure>/);
  if (!wikiStructureMatch?.[1]) {
    throw new Error("Could not find <wiki_structure> in response");
  }

  const xml = wikiStructureMatch[1];

  const title = extractTag(xml, "title");
  const description = extractTag(xml, "description");
  const commitId = extractTag(xml, "commit_id");

  const pages = parsePages(xml);
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

function parsePages(xml: string): WikiPage[] {
  const pagesSection = xml.match(/<pages>([\s\S]*?)<\/pages>/);
  if (!pagesSection?.[1]) return [];

  const pageMatches = pagesSection[1].matchAll(/<page\s+id="([^"]+)">([\s\S]*?)<\/page>/g);
  const pages: WikiPage[] = [];

  for (const match of pageMatches) {
    const id = match[1];
    const pageXml = match[2];
    if (!id || !pageXml) continue;

    const filePaths: string[] = [];
    const fileMatches = pageXml.matchAll(/<file_path>([^<]+)<\/file_path>/g);
    for (const fm of fileMatches) {
      if (fm[1]) filePaths.push(fm[1].trim());
    }

    const relatedPages: string[] = [];
    const relatedMatches = pageXml.matchAll(/<related>([^<]+)<\/related>/g);
    for (const rm of relatedMatches) {
      if (rm[1]) relatedPages.push(rm[1].trim());
    }

    const importance = extractTag(pageXml, "importance") as "high" | "medium" | "low";

    pages.push({
      id,
      title: extractTag(pageXml, "title"),
      content: "",
      filePaths,
      importance: importance || "medium",
      relatedPages,
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

    const subsections: string[] = [];
    const subsectionMatches = sectionXml.matchAll(/<section_ref>([^<]+)<\/section_ref>/g);
    for (const sm of subsectionMatches) {
      if (sm[1]) subsections.push(sm[1].trim());
    }

    sections.push({
      id,
      title: extractTag(sectionXml, "title"),
      pages: pageRefs,
      subsections: subsections.length > 0 ? subsections : undefined,
    });
  }

  return sections;
}