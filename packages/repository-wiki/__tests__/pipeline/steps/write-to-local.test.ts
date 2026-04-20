import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import type { WikiStructureModel } from "@repositories-wiki/common";
import {
  writeAgentsMd,
  generateAgentsMdSection,
  generateIndexMd,
} from "../../../src/pipeline/steps/write-to-local.step.js";

// ─── Fixtures ───────────────────────────────────────────────────────────────

const WIKI_SECTION = generateAgentsMdSection("A test repo.", "repository-wiki");

function makeStructure(overrides?: Partial<WikiStructureModel>): WikiStructureModel {
  return {
    commitId: "abc123",
    title: "Test Wiki",
    description: "A test repo.",
    sections: [
      {
        title: "Core Architecture",
        pages: [
          {
            title: "System Overview",
            pageId: "system-overview",
            importance: "high",
            relevantFiles: [
              { filePath: "src/index.ts", importance: "high" },
              { filePath: "src/config.ts" },
            ],
            relatedPages: ["api-layer"],
          },
        ],
      },
    ],
    ...overrides,
  };
}

// ─── writeAgentsMd ──────────────────────────────────────────────────────────

describe("writeAgentsMd", () => {
  let tmpDir: string;
  let agentsMdPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "write-agents-"));
    agentsMdPath = path.join(tmpDir, "AGENTS.md");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates a new file when AGENTS.md does not exist", () => {
    writeAgentsMd(agentsMdPath, WIKI_SECTION);

    const content = fs.readFileSync(agentsMdPath, "utf-8");
    expect(content).toContain("## Repository Wiki");
    expect(content).toContain("update-wiki");
  });

  it("appends wiki section to existing AGENTS.md without one", () => {
    fs.writeFileSync(agentsMdPath, "## Coding Guidelines\n\nUse TypeScript.\n");

    writeAgentsMd(agentsMdPath, WIKI_SECTION);

    const content = fs.readFileSync(agentsMdPath, "utf-8");
    expect(content).toContain("## Coding Guidelines");
    expect(content).toContain("## Repository Wiki");
  });

  it("replaces existing wiki section on re-run", () => {
    // First write
    writeAgentsMd(agentsMdPath, WIKI_SECTION);
    // Second write with updated section
    const updatedSection = generateAgentsMdSection("Updated description.", "repository-wiki");
    writeAgentsMd(agentsMdPath, updatedSection);

    const content = fs.readFileSync(agentsMdPath, "utf-8");
    expect(content).toContain("Updated description.");
    expect(content).not.toContain("A test repo.");
    // Should only have one wiki section
    expect(content.split("## Repository Wiki").length).toBe(2);
  });

  it("preserves other sections when replacing wiki section", () => {
    const existing =
      "## Coding Guidelines\n\nUse TypeScript.\n\n## Repository Wiki\n\nOld wiki content.\n\n## Testing\n\nRun vitest.\n";
    fs.writeFileSync(agentsMdPath, existing);

    writeAgentsMd(agentsMdPath, WIKI_SECTION);

    const content = fs.readFileSync(agentsMdPath, "utf-8");
    expect(content).toContain("## Coding Guidelines");
    expect(content).toContain("## Testing");
    expect(content).not.toContain("Old wiki content.");
    expect(content).toContain("## Repository Wiki");
  });
});

// ─── generateIndexMd ────────────────────────────────────────────────────────

describe("generateIndexMd", () => {
  it("generates correct structure with title, commit, sections and pages", () => {
    const result = generateIndexMd(makeStructure(), "repository-wiki");

    expect(result).toContain("# Test Wiki");
    expect(result).toContain("`abc123`");
    expect(result).toContain("## Core Architecture");
    expect(result).toContain("[System Overview](sections/core-architecture/system-overview.md)");
    expect(result).toContain("`src/index.ts`");
    expect(result).toContain("| high |");
  });

  it("handles multiple sections and pages", () => {
    const structure = makeStructure({
      sections: [
        {
          title: "Section A",
          pages: [
            {
              title: "Page One",
              pageId: "p1",
              importance: "high",
              relevantFiles: [{ filePath: "a.ts" }],
              relatedPages: [],
            },
            {
              title: "Page Two",
              pageId: "p2",
              importance: "low",
              relevantFiles: [{ filePath: "b.ts" }],
              relatedPages: [],
            },
          ],
        },
        {
          title: "Section B",
          pages: [
            {
              title: "Page Three",
              pageId: "p3",
              importance: "medium",
              relevantFiles: [{ filePath: "c.ts" }, { filePath: "d.ts" }],
              relatedPages: [],
            },
          ],
        },
      ],
    });

    const result = generateIndexMd(structure, "repository-wiki");

    expect(result).toContain("## Section A");
    expect(result).toContain("## Section B");
    expect(result).toContain("[Page One]");
    expect(result).toContain("[Page Two]");
    expect(result).toContain("[Page Three]");
    expect(result).toContain("`c.ts`, `d.ts`");
  });

  it("handles empty sections", () => {
    const structure = makeStructure({
      sections: [{ title: "Empty Section", pages: [] }],
    });

    const result = generateIndexMd(structure, "repository-wiki");

    expect(result).toContain("## Empty Section");
    expect(result).toContain("| Page | Importance |");
  });

  it("slugifies special characters in section and page names", () => {
    const structure = makeStructure({
      sections: [
        {
          title: "API & Auth Layer",
          pages: [
            {
              title: "OAuth 2.0 Flow",
              pageId: "oauth",
              importance: "high",
              relevantFiles: [{ filePath: "auth.ts" }],
              relatedPages: [],
            },
          ],
        },
      ],
    });

    const result = generateIndexMd(structure, "repository-wiki");

    expect(result).toContain("sections/api-auth-layer/oauth-2-0-flow.md");
  });
});
