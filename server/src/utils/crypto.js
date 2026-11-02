import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const LEGACY_ALGORITHM = "aes-256-cbc";
const VERSION = "v2";

/**
 * @function getKey
 * @description Reads CRYPTO_SECRET, which must be 32 bytes encoded as 64 hex characters.
 * @returns {Buffer} The encryption key.
 */
const getKey = () => {
  const secret = process.env.CRYPTO_SECRET;
  if (!secret || !/^[0-9a-fA-F]{64}$/.test(secret)) {
    throw new Error("CRYPTO_SECRET must be 64 hex characters (generate one with: openssl rand -hex 32)");
  }
  return Buffer.from(secret, "hex");
};

/**
 * @function encrypt
 * @description Encrypts a string with AES-256-GCM and a fresh random IV.
 * @param {string} text - Plain text.
 * @returns {string} "v2:<iv>:<authTag>:<ciphertext>" in hex.
 */
export const encrypt = (text) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [VERSION, iv.toString("hex"), tag.toString("hex"), encrypted.toString("hex")].join(":");
};

/**
 * @function decrypt
 * @description Decrypts a value produced by encrypt. Values from the former AES-256-CBC format
 * ("<iv>:<ciphertext>") are still readable so already-stored tokens keep working.
 * @param {string} payload - Encrypted value.
 * @returns {string} Plain text.
 */
export const decrypt = (payload) => {
  const parts = payload.split(":");

  if (parts[0] === VERSION && parts.length === 4) {
    const [, ivHex, tagHex, encryptedHex] = parts;
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return Buffer.concat([decipher.update(Buffer.from(encryptedHex, "hex")), decipher.final()]).toString("utf8");
  }

  const [ivHex, encryptedHex] = parts;
  const decipher = crypto.createDecipheriv(LEGACY_ALGORITHM, getKey(), Buffer.from(ivHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedHex, "hex")), decipher.final()]).toString("utf8");
};
