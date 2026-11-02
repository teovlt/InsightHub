import { describe, it, expect } from "vitest";
import { parseStatValue } from "../../../src/utils/statValue.js";

describe("parseStatValue", () => {
  it("should read plain, spaced and comma numbers", () => {
    expect(parseStatValue("142")).toEqual({ type: "number", numericValue: 142 });
    expect(parseStatValue("4 210")).toEqual({ type: "number", numericValue: 4210 });
    expect(parseStatValue("12,5")).toEqual({ type: "number", numericValue: 12.5 });
    expect(parseStatValue(-3)).toEqual({ type: "number", numericValue: -3 });
  });

  it("should read durations in seconds", () => {
    expect(parseStatValue("5:12")).toEqual({ type: "duration", numericValue: 312 });
    expect(parseStatValue("1:05:12")).toEqual({ type: "duration", numericValue: 3912 });
  });

  it("should keep anything else as text", () => {
    expect(parseStatValue("great")).toEqual({ type: "text", numericValue: null });
    expect(parseStatValue("5:75")).toEqual({ type: "text", numericValue: null });
    expect(parseStatValue("")).toEqual({ type: "text", numericValue: null });
  });
});
