import https from "https";
import { bucket } from "../lib/firebase.js";

/**
 * Télécharge une image à partir d'une URL et l'upload direct sur Firebase Storage.
 * @param {string} photoURL - L'URL de l'image.
 * @param {string} userId - L'ID de l'utilisateur pour nom unique.
 * @param {string} extension - Extension du fichier (default jpg).
 * @return {Promise<string>} - L'URL publique Firebase.
 */
export const saveAvatarFromUrl = (photoURL, userId, extension = "jpg") => {
  return new Promise((resolve, reject) => {
    const filename = `avatars/avatar_${userId}_${Date.now()}.${extension}`;
    const file = bucket.file(filename);

    https
      .get(photoURL, (response) => {
        if (response.statusCode !== 200) {
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
      .on("error", (err) => reject(err));
  });
};
