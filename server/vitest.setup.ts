// vitest.setup.ts
import mongoose from "mongoose";
import { Writable } from "stream";
import { beforeAll, afterAll, beforeEach, vi } from "vitest";

// Firebase is replaced by in-memory fakes: no credentials or network needed.
// Tests drive Google sign-in through firebaseAuth.verifyIdToken (see tests/helpers.js).
vi.mock("./src/lib/firebase.js", () => {
  const file = (name: string) => ({
    name,
    delete: vi.fn(async () => {}),
    makePublic: vi.fn(async () => {}),
    createWriteStream: () =>
      new Writable({
        write(_chunk, _encoding, callback) {
          callback();
        },
      }),
  });

  return {
    bucket: { name: "test-bucket", file: vi.fn(file) },
    firebaseAuth: { verifyIdToken: vi.fn(async () => Promise.reject(new Error("No token configured"))) },
  };
});

// Avatars are fetched from DiceBear/Google in production; tests must not hit the network
vi.mock("./src/utils/saveAvatarFromUrl.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("./src/utils/saveAvatarFromUrl.js")>();
  return {
    ...original,
    saveAvatarFromUrl: vi.fn(
      async (_url: string, userId: string, extension = "jpg") => `https://storage.googleapis.com/test-bucket/avatars/avatar_${userId}.${extension}`,
    ),
  };
});

beforeAll(async () => {
  await mongoose.connect(process.env.MONG_URI_TEST as string);
});

beforeEach(async () => {
  // Reset BDD
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
});
