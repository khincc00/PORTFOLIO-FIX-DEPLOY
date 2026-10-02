import { beforeEach, describe, expect, it, vi } from "vitest";
const { cookieValue } = vi.hoisted(() => ({ cookieValue: { value: "" } }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => cookieValue }),
}));
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("ADMIN_USERNAME", "test-admin");
  vi.stubEnv("ADMIN_PASSWORD", "test-fixture-only");
  vi.stubEnv("ADMIN_SESSION_SECRET", "test-fixture-secret-not-for-production");
  cookieValue.value = "";
});
describe("Admin authentication after async request API migration", () => {
  it("rejects empty sessions and incorrect credentials", async () => {
    const auth = await import("@/lib/admin-auth");
    expect(await auth.isAdminRequest()).toBe(false);
    expect(auth.verifyCredentials("test-admin", "wrong")).toBe(false);
    expect(auth.verifyCredentials("test-admin", "test-fixture-only")).toBe(
      true,
    );
  });
  it("accepts a signed session and rejects a tampered signature", async () => {
    const auth = await import("@/lib/admin-auth");
    cookieValue.value = auth.createSessionToken();
    expect(await auth.isAdminRequest()).toBe(true);
    expect(auth.isValidSession(cookieValue.value + "tamper")).toBe(false);
  });
  it("rejects expired sessions", async () => {
    const auth = await import("@/lib/admin-auth");
    vi.spyOn(Date, "now").mockReturnValue(1000000);
    const token = auth.createSessionToken();
    vi.mocked(Date.now).mockReturnValue(1000000 + 13 * 60 * 60 * 1000);
    expect(auth.isValidSession(token)).toBe(false);
    vi.restoreAllMocks();
  });
});
