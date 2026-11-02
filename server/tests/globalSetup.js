import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer;

/**
 * Starts an in-memory MongoDB and sets the environment shared by every test file,
 * so the suite runs without Docker, a local database or real secrets.
 */
export async function setup() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  process.env.NODE_ENV = "test";
  process.env.MONG_URI = `${uri}insighthub`;
  process.env.MONG_URI_TEST = `${uri}insighthub-test`;
  process.env.PORT = "3999";
  process.env.CORS_ORIGIN = "http://localhost:5173";
  process.env.SECRET_ACCESS_TOKEN = "test-access-token-secret-0123456789abcdef";
  process.env.SESSION_SECRET = "test-session-secret-0123456789abcdef";
  process.env.CRYPTO_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  process.env.GITHUB_CLIENT_ID = "test-github-client-id";
  process.env.GITHUB_CLIENT_SECRET = "test-github-client-secret";
  delete process.env.COOKIE_SAMESITE;
}

export async function teardown() {
  await mongoServer?.stop();
}
