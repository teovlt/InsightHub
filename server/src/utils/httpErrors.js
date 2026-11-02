/**
 * @function handleServerError
 * @description Sends a safe error response: invalid ObjectIds become a 400, everything else is logged
 * server-side and returned as a generic 500 so internal details never reach the client.
 * @param {Object} res - Express response.
 * @param {Error} err - The caught error.
 * @returns {Object} The express response.
 */
export const handleServerError = (res, err) => {
  if (err?.name === "CastError") {
    return res.status(400).json({ error: "server.global.errors.invalid_id" });
  }
  console.error(err);
  return res.status(500).json({ error: "server.global.errors.internal" });
};
