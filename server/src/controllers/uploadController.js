import { User } from "../models/userModel.js";
import { Constants } from "../../constants/constants.js";
import { bucket } from "../lib/firebase.js";
import { ALLOWED_AVATAR_TYPES } from "../configuration/storageConfig.js";
import { userRoles } from "../utils/enums/userRoles.js";
import { deleteAvatarFile, toPublicUser } from "../utils/userData.js";
import { handleServerError } from "../utils/httpErrors.js";

export const updateUserAvatar = async (req, res) => {
  try {
    const userId = req.params.id;

    // Users may only change their own avatar; admins may change anyone's
    if (userId !== req.userId && req.user.role !== userRoles.ADMIN) {
      return res.status(403).json({ error: "server.global.errors.forbidden" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "server.global.errors.no_such_user" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "server.upload.errors.no_file" });
    }

    if (!ALLOWED_AVATAR_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({ error: "server.upload.errors.invalid_file_type" });
    }

    if (req.file.size > Constants.AVATAR_MAX_SIZE) {
      return res.status(400).json({ error: `server.upload.errors.limit` });
    }

    await deleteAvatarFile(user.avatar);

    // Nouveau nom unique
    const extension = req.file.mimetype.split("/")[1];
    const filename = `avatars/${userId}_${Date.now()}.${extension}`;

    const blob = bucket.file(filename);
    const blobStream = blob.createWriteStream({
      resumable: false,
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    blobStream.on("error", (err) => {
      handleServerError(res, err);
    });

    blobStream.on("finish", async () => {
      try {
        await blob.makePublic();

        user.avatar = `https://storage.googleapis.com/${bucket.name}/${filename}`;
        await user.save();

        res.status(200).json({
          message: "server.upload.messages.avatar_success",
          user: toPublicUser(user),
        });
      } catch (err) {
        handleServerError(res, err);
      }
    });

    blobStream.end(req.file.buffer);
  } catch (error) {
    handleServerError(res, error);
  }
};
