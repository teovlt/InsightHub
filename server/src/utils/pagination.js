const MAX_PAGE_SIZE = 100;

/**
 * @function getPagination
 * @description Reads page/size from the query string with safe defaults and bounds.
 * @param {Object} query - req.query.
 * @param {number} [defaultSize=10] - Size used when none is given.
 * @returns {{ page: number, size: number, skip: number }} Pagination values.
 */
export const getPagination = (query, defaultSize = 10) => {
  const size = Math.min(Math.max(parseInt(query.size) || defaultSize, 1), MAX_PAGE_SIZE);
  const page = Math.max(parseInt(query.page) || 0, 0);
  return { page, size, skip: page * size };
};
