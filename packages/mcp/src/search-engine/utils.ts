import type { WikiSection } from "@repositories-wiki/common";

export function buildSectionLookup(
  wiki: { sections?: WikiSection[] },
): Map<string, WikiSection> {
  const lookup = new Map<string, WikiSection>();
  if (wiki.sections) {
    for (const section of wiki.sections) {
      for (const pageId of section.pages) {
        lookup.set(pageId, section);
      }
    }
  }
  return lookup;
}
