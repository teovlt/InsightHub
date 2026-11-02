import crypto from "crypto";
import { describe, it, expect } from "vitest";
import { decrypt, encrypt } from "../../../src/utils/crypto.js";

describe("Token encryption", () => {
  it("should round-trip a value", () => {
    expect(decrypt(encrypt("gho_secret-token"))).toBe("gho_secret-token");
  });

  it("should use a fresh IV for every encryption", () => {
    const first = encrypt("same value");
    const second = encrypt("same value");

    expect(first).not.toBe(second);
    expect(first.split(":")[1]).not.toBe(second.split(":")[1]);
  });

  it("should detect tampering", () => {
    const [version, iv, tag, data] = encrypt("gho_secret-token").split(":");
    const tampered = [version, iv, tag, (data[0] === "0" ? "1" : "0") + data.slice(1)].join(":");

    expect(() => decrypt(tampered)).toThrow();
  });

  it("should still read values stored with the former AES-256-CBC format", () => {
    const key = Buffer.from(process.env.CRYPTO_SECRET, "hex");
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    const legacy = iv.toString("hex") + ":" + Buffer.concat([cipher.update("legacy-token"), cipher.final()]).toString("hex");

    expect(decrypt(legacy)).toBe("legacy-token");
  });
});
