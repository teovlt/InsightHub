/**
 * @function inferGoalDirection
 * @description A target below the current value means the user wants the stat to go down (weight, a run time).
 * @param {number|null} current - The stat's current numeric value.
 * @param {number} target - The goal target.
 * @returns {"increase"|"decrease"}
 */
export const inferGoalDirection = (current, target) =>
  current !== null && current !== undefined && target < current ? "decrease" : "increase";
