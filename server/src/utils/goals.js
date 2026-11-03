/**
 * @function inferGoalDirection
 * @description A target below the current value means the user wants the stat to go down (weight, a run time).
 * @param {number|null} current - The stat's current numeric value.
 * @param {number} target - The goal target.
 * @returns {"increase"|"decrease"}
 */
export const inferGoalDirection = (current, target) =>
  current !== null && current !== undefined && target < current ? "decrease" : "increase";

/**
 * @function isGoalReached
 * @param {number|null} value - The stat's current numeric value.
 * @param {{ target: number, direction?: string }} goal - The goal; goals saved before directions existed count as "increase".
 * @returns {boolean}
 */
export const isGoalReached = (value, goal) => {
  if (value === null || value === undefined || typeof goal?.target !== "number") return false;
  return goal.direction === "decrease" ? value <= goal.target : value >= goal.target;
};
