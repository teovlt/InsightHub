import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import sinon from "sinon";
import mongoose from "mongoose";
import { connectToDatabase } from "../../../src/database/connectToDB";

describe("connectToDatabase", () => {
  let connectStub;

  beforeEach(() => {
    connectStub = sinon.stub(mongoose, "connect");
  });

  afterEach(() => {
    connectStub.restore();
  });

  it("should log an error and exit if MONG_URI is not specified", () => {
    delete process.env.MONG_URI;
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, "error");

    connectToDatabase();

    expect(consoleErrorSpy).toHaveBeenCalledWith("Please specify the MongoDB URI in the .env file.");
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("should call mongoose.connect and log success message on successful connection", async () => {
    process.env.MONG_URI = "mongodb://testuri";
    connectStub.resolves();

    const consoleLogSpy = vi.spyOn(console, "log");

    await connectToDatabase();

    expect(connectStub.calledOnce).toBe(true);
    expect(connectStub.calledWith(process.env.MONG_URI)).toBe(true);
    expect(consoleLogSpy).toHaveBeenCalledWith("Connected to the database 🧰");

    consoleLogSpy.mockRestore();
  });

  it("should call mongoose.connect, log error message and exit on connection failure", async () => {
    process.env.MONG_URI = "mongodb://testuri";
    const error = new Error("Connection error");
    connectStub.rejects(error);

    const consoleErrorSpy = vi.spyOn(console, "error");
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {});

    await connectToDatabase();

    expect(connectStub.calledOnce).toBe(true);
    expect(connectStub.calledWith(process.env.MONG_URI)).toBe(true);
    expect(consoleErrorSpy).toHaveBeenCalledWith("Error connecting to the database: ", error);
    expect(exitSpy).toHaveBeenCalledWith(1);

    consoleErrorSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
