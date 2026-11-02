import https from "https";
import { bucket } from "../lib/firebase.js";

// Only these hosts may be fetched, so a user-supplied URL can never make the server call an arbitrary address (SSRF).
const ALLOWED_HOSTS = ["api.dicebear.com"];
const ALLOWED_HOST_SUFFIXES = [".googleusercontent.com"];

/**
 * @function isAllowedAvatarUrl
 * @description Checks that an avatar URL uses https and points to a trusted avatar provider.
 * @param {string} photoURL - The URL to check.
 * @returns {boolean} True when the URL may be downloaded.
 */
export const isAllowedAvatarUrl = (photoURL) => {
  let url;
  try {
    url = new URL(photoURL);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  return ALLOWED_HOSTS.includes(url.hostname) || ALLOWED_HOST_SUFFIXES.some((suffix) => url.hostname.endsWith(suffix));
};

/**
 * Télécharge une image à partir d'une URL et l'upload direct sur Firebase Storage.
 * @param {string} photoURL - L'URL de l'image (doit appartenir à un hôte autorisé).
 * @param {string} userId - L'ID de l'utilisateur pour nom unique.
 * @param {string} extension - Extension du fichier (default jpg).
 * @return {Promise<string>} - L'URL publique Firebase.
 */
export const saveAvatarFromUrl = (photoURL, userId, extension = "jpg") => {
  return new Promise((resolve, reject) => {
    if (!isAllowedAvatarUrl(photoURL)) {
      return reject(new Error("Avatar URL host is not allowed"));
    }

    const filename = `avatars/avatar_${userId}_${Date.now()}.${extension}`;
    const file = bucket.file(filename);

    https
      .get(photoURL, { timeout: 10000 }, (response) => {
        if (response.statusCode !== 200) {
          response.resume();
          return reject(new Error(`Failed to get image, status code: ${response.statusCode}`));
        }

        const writeStream = file.createWriteStream({
          resumable: false,
          metadata: {
            contentType: response.headers["content-type"] || "image/jpeg",
          },
        });

        response.pipe(writeStream);

        writeStream.on("error", (err) => reject(err));

        writeStream.on("finish", async () => {
          try {
            await file.makePublic();
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
            resolve(publicUrl);
          } catch (err) {
            reject(err);
          }
        });
      })
      .on("timeout", function () {
        this.destroy(new Error("Avatar download timed out"));
      })
      .on("error", (err) => reject(err));
  });
};
