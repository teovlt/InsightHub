import { describe, expect, it, vi } from "vitest";
import https from "https";

// saveAvatarFromUrl is mocked globally (vitest.setup.ts); these tests exercise the real module
const { isAllowedAvatarUrl, saveAvatarFromUrl } = await vi.importActual("../../../src/utils/saveAvatarFromUrl.js");

describe("Saving avatar from an url", () => {
  it("should allow DiceBear and Google avatar hosts over https", () => {
    expect(isAllowedAvatarUrl("https://api.dicebear.com/9.x/identicon/svg?seed=user")).toBe(true);
    expect(isAllowedAvatarUrl("https://lh3.googleusercontent.com/a/photo")).toBe(true);
  });

  it("should refuse any other host, scheme or malformed URL (SSRF)", () => {
    expect(isAllowedAvatarUrl("https://evil.example/x.png")).toBe(false);
    expect(isAllowedAvatarUrl("http://api.dicebear.com/9.x/identicon/svg")).toBe(false);
    expect(isAllowedAvatarUrl("https://169.254.169.254/latest/meta-data")).toBe(false);
    expect(isAllowedAvatarUrl("https://googleusercontent.com.evil.example/x")).toBe(false);
    expect(isAllowedAvatarUrl("invalid-url")).toBe(false);
  });

  it("should reject a disallowed URL without making any request", async () => {
    const getSpy = vi.spyOn(https, "get");

    await expect(saveAvatarFromUrl("https://evil.example/x.png", "123456")).rejects.toThrow("Avatar URL host is not allowed");
    expect(getSpy).not.toHaveBeenCalled();

    getSpy.mockRestore();
  });
});
