import mongoose from "mongoose";

/**
 * @function connectToDatabase
 * @description Connects to the MongoDB database using the URI specified in environment variables.
 * Exits on failure so the process manager (Docker restart policy, nodemon) can start over.
 * @returns {Promise<void>} A promise that resolves when the connection is established.
 */
export const connectToDatabase = async () => {
  if (!process.env.MONG_URI) {
    console.error("Please specify the MongoDB URI in the .env file.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONG_URI);
    console.log("Connected to the database 🧰");
  } catch (err) {
    console.error("Error connecting to the database: ", err);
    process.exit(1);
  }
};
