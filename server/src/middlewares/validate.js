/**
 * @function parseBody
 * @description Validates a payload against a zod schema.
 * Missing required fields map to 422 "missing_fields" (the historical contract), any other problem to 400.
 * @param {import("zod").ZodTypeAny} schema - Schema to validate against.
 * @param {unknown} payload - The data to validate.
 * @returns {{ data?: Object, status?: number, error?: Object }} Parsed data, or an error response to send.
 */
export const parseBody = (schema, payload) => {
  const result = schema.safeParse(payload ?? {});
  if (result.success) return { data: result.data };

  const missing = result.error.issues.some((issue) => issue.code === "invalid_type" && issue.received === "undefined");
  return {
    status: missing ? 422 : 400,
    error: {
      error: missing ? "server.global.errors.missing_fields" : "server.global.errors.invalid_fields",
      fields: result.error.issues.map((issue) => issue.path.join(".")),
    },
  };
};

/**
 * @function validateBody
 * @description Middleware that validates req.body and replaces it with the parsed (stripped) data.
 * @param {import("zod").ZodTypeAny} schema - Schema to validate against.
 * @returns {Function} Express middleware.
 */
export const validateBody = (schema) => (req, res, next) => {
  const { data, status, error } = parseBody(schema, req.body);
  if (error) return res.status(status).json(error);
  req.body = data;
  next();
};
