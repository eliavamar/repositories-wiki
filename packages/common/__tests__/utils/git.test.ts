import { describe, it, expect, vi, beforeEach } from "vitest";
import { GitService } from "../../src/utils/git.js";

// ─── Mock simple-git ────────────────────────────────────────────────────────

const mockClone = vi.fn().mockResolvedValue(undefined);
const mockCheckout = vi.fn().mockResolvedValue(undefined);
const mockRevparse = vi.fn().mockResolvedValue("abc123def456");

vi.mock("simple-git", () => ({
  simpleGit: vi.fn(() => ({
    clone: mockClone,
    checkout: mockCheckout,
    revparse: mockRevparse,
  })),
}));

vi.mock("fs", async () => {
  const actual = await vi.importActual<typeof import("fs")>("fs");
  return {
    ...actual,
    default: {
      ...actual,
      mkdtempSync: vi.fn(() => "/tmp/fake-repo-xyz"),
    },
  };
});


describe("GitService.cloneRepository", () => {
  let service: GitService;

  beforeEach(() => {
    service = new GitService();
    vi.clearAllMocks();
    mockRevparse.mockResolvedValue("abc123def456");
  });

  it("clones to a temp dir when no targetDir is provided", async () => {
    const result = await service.cloneRepository("https://github.com/owner/my-repo");

    expect(mockClone).toHaveBeenCalledWith(
      "https://github.com/owner/my-repo",
      "/tmp/fake-repo-xyz"
    );
    expect(result.repoPath).toBe("/tmp/fake-repo-xyz");
  });

  it("clones to targetDir when provided", async () => {
    const result = await service.cloneRepository("https://github.com/owner/my-repo", {
      targetDir: "/custom/clone/dir",
    });

    expect(mockClone).toHaveBeenCalledWith(
      "https://github.com/owner/my-repo",
      "/custom/clone/dir"
    );
    expect(result.repoPath).toBe("/custom/clone/dir");
  });

  it("injects token into clone URL", async () => {
    await service.cloneRepository("https://github.com/owner/my-repo", {
      token: "ghp_secret123",
    });

    expect(mockClone).toHaveBeenCalledOnce();
    const clonedUrl = String(mockClone.mock.calls[0]![0]);
    const parsed = new URL(clonedUrl);
    expect(parsed.username).toBe("ghp_secret123");
    expect(parsed.password).toBe("x-oauth-basic");
    expect(parsed.hostname).toBe("github.com");
    expect(parsed.pathname).toBe("/owner/my-repo");
  });

  it("injects token into enterprise GitHub clone URL", async () => {
    await service.cloneRepository(
      "https://github.mycompany.com/org/internal-repo",
      { token: "ghe_enterprise_token" }
    );

    expect(mockClone).toHaveBeenCalledOnce();
    const clonedUrl = String(mockClone.mock.calls[0]![0]);
    const parsed = new URL(clonedUrl);
    expect(parsed.username).toBe("ghe_enterprise_token");
    expect(parsed.password).toBe("x-oauth-basic");
    expect(parsed.hostname).toBe("github.mycompany.com");
    expect(parsed.pathname).toBe("/org/internal-repo");
  });

  it("falls back to original URL when token injection fails on invalid URL", async () => {
    await service.cloneRepository("not-a-valid-url", {
      token: "ghp_secret123",
    });

    // Should pass the original URL unchanged since new URL() would throw
    expect(mockClone).toHaveBeenCalledOnce();
    expect(mockClone.mock.calls[0]![0]).toBe("not-a-valid-url");
  });

  it("checks out branch when provided", async () => {
    await service.cloneRepository("https://github.com/owner/my-repo", {
      branch: "feature/cool",
    });

    expect(mockCheckout).toHaveBeenCalledWith("feature/cool");
  });

  it("checks out commitId when provided", async () => {
    await service.cloneRepository("https://github.com/owner/my-repo", {
      commitId: "deadbeef",
    });

    expect(mockCheckout).toHaveBeenCalledWith("deadbeef");
  });

  it("checks out branch before commitId when both are provided", async () => {
    const callOrder: string[] = [];
    mockCheckout.mockImplementation((ref: string) => {
      callOrder.push(ref);
      return Promise.resolve();
    });

    await service.cloneRepository("https://github.com/owner/my-repo", {
      branch: "main",
      commitId: "deadbeef",
    });

    expect(callOrder).toEqual(["main", "deadbeef"]);
  });

  it("does not call checkout when neither branch nor commitId is provided", async () => {
    await service.cloneRepository("https://github.com/owner/my-repo");

    expect(mockCheckout).not.toHaveBeenCalled();
  });

  it("returns correct CloneResult shape", async () => {
    mockRevparse.mockResolvedValue("cafe1234");

    const result = await service.cloneRepository("https://github.com/owner/my-repo", {
      targetDir: "/some/dir",
    });

    expect(result).toEqual({
      repoPath: "/some/dir",
      commitId: "cafe1234",
      repoName: "my-repo",
    });
  });

  it("propagates clone failure", async () => {
    mockClone.mockRejectedValueOnce(new Error("Authentication failed"));

    await expect(
      service.cloneRepository("https://github.com/owner/my-repo")
    ).rejects.toThrow("Authentication failed");
  });
});
