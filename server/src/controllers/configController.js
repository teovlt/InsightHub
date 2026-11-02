import { Config } from "../models/configModel.js";
import { logLevels } from "../utils/enums/logLevel.js";
import { createLog } from "./logController.js";
import { Constants } from "../../constants/constants.js";
import { handleServerError } from "../utils/httpErrors.js";

/**
 * Gets configuration settings based on provided keys.
 * @returns {Object} JSON response with configuration settings.
 */
export const getConfig = async (req, res) => {
  // Only whitelisted keys are readable: this route is public
  const keys = typeof req.query.keys === "string" ? req.query.keys.split(",").filter((key) => Constants.PUBLIC_CONFIG_KEYS.includes(key)) : [];

  try {
    const configItems = await Config.find({ key: { $in: keys } });

    res.status(200).json({ config: configItems });
  } catch (error) {
    handleServerError(res, error);
  }
};

/**
 * Updates configuration settings based on provided keys and values.
 * @returns {Object} JSON response with updated configuration settings.
 */
export const updateConfig = async (req, res) => {
  const { keys, config } = req.body;

  if (!Array.isArray(keys) || typeof config !== "object" || config === null) {
    return res.status(400).json({ message: "Invalid input format" });
  }

  try {
    for (const key of keys) {
      if (Object.hasOwn(config, key)) {
        await Config.findOneAndUpdate({ key }, { value: config[key] }, { new: true, upsert: true });
        createLog({
          level: logLevels.INFO,
          message: `Configuration updated for key : ${key}`,
          userId: req.userId,
        });
      } else {
        createLog({
          level: logLevels.ERROR,
          message: `Key ${key} not found in config object`,
          userId: req.userId,
        });
        return res.status(400).json({ message: `Key ${key} not found in config object` });
      }
    }

    res.json({ message: "Configuration updated successfully" });
  } catch (error) {
    handleServerError(res, error);
  }
};
