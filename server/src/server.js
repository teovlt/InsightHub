import { app } from "./app.js";
import { connectToDatabase } from "./database/connectToDB.js";
import { createServer } from "http";
import { initSockets } from "./sockets/socket.js";

const MIN_SECRET_LENGTH = 32;

/**
 * @function checkSecrets
 * @description Verifies the secrets the server cannot run safely without.
 * Missing or malformed secrets are fatal; short ones only raise a warning.
 * @returns {string[]} Fatal configuration errors.
 */
export function checkSecrets() {
  const errors = [];

  for (const name of ["SECRET_ACCESS_TOKEN", "SESSION_SECRET"]) {
    const value = process.env[name];
    if (!value) {
      errors.push(`Please specify ${name} in the .env file.`);
    } else if (value.length < MIN_SECRET_LENGTH) {
      console.warn(`${name} is shorter than ${MIN_SECRET_LENGTH} characters, generate a stronger one with: openssl rand -hex 32`);
    }
  }

  if (!/^[0-9a-fA-F]{64}$/.test(process.env.CRYPTO_SECRET || "")) {
    errors.push("CRYPTO_SECRET must be 64 hex characters (generate one with: openssl rand -hex 32).");
  }

  return errors;
}

/**
 * Checks the configuration, connects to the database, then starts the HTTP server and WebSockets.
 * Requests are only accepted once MongoDB is reachable.
 */
export async function initServer() {
  // Ensure the PORT environment variable is defined
  if (!process.env.PORT) {
    console.error("Please specify the port number for the HTTP server with the environment variable PORT in the .env file.");
    process.exit(1);
  }

  const secretErrors = checkSecrets();
  if (secretErrors.length > 0) {
    secretErrors.forEach((error) => console.error(error));
    process.exit(1);
  }

  // Connect to the database
  await connectToDatabase();

  // Create an HTTP server using the Express app
  const httpServer = createServer(app);

  // Initialize WebSocket connections
  initSockets(httpServer);

  // Start the HTTP server on the specified port
  httpServer.listen(process.env.PORT, () => {
    console.log("Server listening on port", process.env.PORT, "🚀");
  });
}

// Start the server
initServer();
