import crypto from "crypto";

const algorithm = "aes-256-cbc";

const secretKey = process.env.CRYPTO_SECRET;

const iv = crypto.randomBytes(16);

// Chiffrer

export const encrypt = (text) => {
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey, "hex"), iv);

  let encrypted = cipher.update(text);

  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return iv.toString("hex") + ":" + encrypted.toString("hex");
};

// Déchiffrer

export const decrypt = (text) => {
  const [ivHex, encryptedHex] = text.split(":");

  const iv = Buffer.from(ivHex, "hex");

  const encryptedText = Buffer.from(encryptedHex, "hex");

  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey, "hex"), iv);

  let decrypted = decipher.update(encryptedText);

  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString();
};
