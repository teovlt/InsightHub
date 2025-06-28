import { User } from "../models/userModel.js";
import { Constants } from "../../constants/constants.js";
import { bucket } from "../lib/firebase.js";

export const updateUserAvatar = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);

    if (!req.file) {
      return res.status(400).json({ error: "server.upload.errors.no_file" });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/svg+xml"];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: "server.upload.errors.invalid_file_type" });
    }

    if (req.file.size > Constants.AVATAR_MAX_SIZE) {
      return res.status(400).json({ error: `server.upload.errors.limit` });
    }

    if (user.avatar) {
      const oldFileName = user.avatar.split("/").pop();
      const oldFile = bucket.file(`avatars/${oldFileName}`);
      await oldFile.delete().catch(() => {});
    }

    // Nouveau nom unique
    let extension = req.file.mimetype.split("/")[1];
    if (extension.includes("+")) extension = extension.split("+")[0]; // svg+xml → svg

    const filename = `avatars/${userId}_${Date.now()}.${extension}`;

    const blob = bucket.file(filename);
    const blobStream = blob.createWriteStream({
      resumable: false,
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    blobStream.on("error", (err) => {
      console.error(err);
      res.status(500).json({ error: "Upload error", details: err.message });
    });

    blobStream.on("finish", async () => {
      await blob.makePublic();

      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

      user.avatar = publicUrl;
      await user.save();

      res.status(200).json({
        message: "server.upload.messages.avatar_success",
        user,
      });
    });

    blobStream.end(req.file.buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An unexpected error occurred during file upload" });
  }
};
