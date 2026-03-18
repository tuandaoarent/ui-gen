// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";

vi.mock("server-only", () => ({}));

const mockSet = vi.fn();
const mockGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({ set: mockSet, get: mockGet })),
}));

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

describe("createSession", () => {
  beforeEach(() => {
    mockSet.mockClear();
    mockGet.mockClear();
    vi.unstubAllEnvs();
  });

  test("sets auth-token cookie with correct name", async () => {
    const { createSession } = await import("@/lib/auth");
    await createSession("user-1", "user@example.com");

    expect(mockSet).toHaveBeenCalledOnce();
    const [cookieName] = mockSet.mock.calls[0];
    expect(cookieName).toBe("auth-token");
  });

  test("cookie is httpOnly and sameSite lax", async () => {
    const { createSession } = await import("@/lib/auth");
    await createSession("user-1", "user@example.com");

    const [, , options] = mockSet.mock.calls[0];
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  test("cookie is not secure outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { createSession } = await import("@/lib/auth");
    await createSession("user-1", "user@example.com");

    const [, , options] = mockSet.mock.calls[0];
    expect(options.secure).toBe(false);
  });

  test("cookie is secure in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { createSession } = await import("@/lib/auth");
    await createSession("user-1", "user@example.com");

    const [, , options] = mockSet.mock.calls[0];
    expect(options.secure).toBe(true);
  });

  test("cookie expires in ~7 days", async () => {
    const before = Date.now();
    const { createSession } = await import("@/lib/auth");
    await createSession("user-1", "user@example.com");
    const after = Date.now();

    const [, , options] = mockSet.mock.calls[0];
    const expiresMs = options.expires.getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    expect(expiresMs).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(expiresMs).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });

  test("JWT token contains userId and email", async () => {
    const { createSession } = await import("@/lib/auth");
    await createSession("user-42", "test@example.com");

    const [, token] = mockSet.mock.calls[0];
    const { payload } = await jwtVerify(token, JWT_SECRET);

    expect(payload.userId).toBe("user-42");
    expect(payload.email).toBe("test@example.com");
  });

  test("JWT token is signed with HS256", async () => {
    const { createSession } = await import("@/lib/auth");
    await createSession("user-1", "user@example.com");

    const [, token] = mockSet.mock.calls[0];
    const header = JSON.parse(atob(token.split(".")[0]));
    expect(header.alg).toBe("HS256");
  });
});

async function makeToken(
  payload: Record<string, unknown>,
  expiresIn = "7d"
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

describe("getSession", () => {
  beforeEach(() => {
    mockGet.mockClear();
    vi.unstubAllEnvs();
  });

  test("returns null when no cookie is present", async () => {
    mockGet.mockReturnValue(undefined);
    const { getSession } = await import("@/lib/auth");

    expect(await getSession()).toBeNull();
  });

  test("returns SessionPayload for a valid token", async () => {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const token = await makeToken({ userId: "user-1", email: "a@b.com", expiresAt });
    mockGet.mockReturnValue({ value: token });

    const { getSession } = await import("@/lib/auth");
    const session = await getSession();

    expect(session).not.toBeNull();
    expect(session!.userId).toBe("user-1");
    expect(session!.email).toBe("a@b.com");
  });

  test("returns null for a tampered token", async () => {
    const token = await makeToken({ userId: "user-1", email: "a@b.com" });
    const tampered = token.slice(0, -4) + "xxxx";
    mockGet.mockReturnValue({ value: tampered });

    const { getSession } = await import("@/lib/auth");
    expect(await getSession()).toBeNull();
  });

  test("returns null for an expired token", async () => {
    const token = await makeToken({ userId: "user-1", email: "a@b.com" }, "-1s");
    mockGet.mockReturnValue({ value: token });

    const { getSession } = await import("@/lib/auth");
    expect(await getSession()).toBeNull();
  });
});
