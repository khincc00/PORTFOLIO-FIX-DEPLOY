import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { rpc, single } = vi.hoisted(() => ({ rpc: vi.fn(), single: vi.fn() }));
vi.mock("@/lib/supabase-admin", () => ({
  isAdminDbConfigured: true,
  supabaseAdmin: {
    from: () => ({ select: () => ({ eq: () => ({ single }) }) }),
    rpc,
  },
}));
const snapshot = {
  schemaVersion: 1,
  news: [{ title: "Public only" }],
  portfolio: [],
};
const row = {
  version: 4,
  synced_version: 3,
  last_error: null,
  lease_until: null,
};

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("CONTENT_GITHUB_TOKEN", "test-token-not-real");
  vi.stubEnv("CONTENT_GITHUB_BRANCH", "content-sync");
  vi.stubGlobal("fetch", vi.fn());
  single.mockReset().mockResolvedValue({ data: row, error: null });
  rpc.mockReset().mockImplementation((method: string) =>
    Promise.resolve({
      data: method === "claim_studio_sync" ? { version: 4, snapshot } : null,
      error: null,
    }),
  );
});
describe("GitHub archive transport", () => {
  it("writes base64 snapshot to the configured branch using the existing SHA", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ sha: "old-sha", content: "" })),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            commit: { html_url: "https://github.com/test/repo/commit/abc" },
          }),
        ),
      );
    await (await import("@/lib/github-sync")).syncPublishedContent();
    const [, init] = vi.mocked(fetch).mock.calls[1];
    const payload = JSON.parse(init!.body as string);
    expect(payload.branch).toBe("content-sync");
    expect(payload.sha).toBe("old-sha");
    expect(
      JSON.parse(Buffer.from(payload.content, "base64").toString()),
    ).toEqual(snapshot);
    expect(rpc).toHaveBeenLastCalledWith(
      "finish_studio_sync",
      expect.objectContaining({ captured_version: 4, error_message: null }),
    );
  });
  it("does not create a commit for an unchanged snapshot", async () => {
    const content = Buffer.from(
      JSON.stringify(snapshot, null, 2) + "\n",
    ).toString("base64");
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ sha: "same", content })),
    );
    await (await import("@/lib/github-sync")).syncPublishedContent();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("retries a SHA conflict with a fresh read", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ sha: "old", content: "" })),
      )
      .mockResolvedValueOnce(new Response("{}", { status: 409 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ sha: "new", content: "" })),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            commit: { html_url: "https://github.com/test/repo/commit/new" },
          }),
        ),
      );
    await (await import("@/lib/github-sync")).syncPublishedContent();
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(
      JSON.parse(vi.mocked(fetch).mock.calls[3][1]!.body as string).sha,
    ).toBe("new");
  });
  it("records a failed GitHub request without throwing away the CMS save", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 403 }));
    await (await import("@/lib/github-sync")).trySyncPublishedContent();
    expect(rpc).toHaveBeenLastCalledWith(
      "finish_studio_sync",
      expect.objectContaining({
        error_message: expect.stringContaining("403"),
      }),
    );
  });
  it("makes no network call when another worker has the lease", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    const result = await (
      await import("@/lib/github-sync")
    ).syncPublishedContent();
    expect(result.status).toBe("syncing");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("stays disabled with no runtime credential", async () => {
    vi.stubEnv("CONTENT_GITHUB_TOKEN", "");
    const result = await (
      await import("@/lib/github-sync")
    ).syncPublishedContent();
    expect(result.status).toBe("setup");
    expect(fetch).not.toHaveBeenCalled();
  });
});
