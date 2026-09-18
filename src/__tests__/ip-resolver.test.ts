import { describe, expect, it, vi } from "vitest";

// Simulates a future better-auth that renames the IP helper again, past both
// names the shim in ../index knows about.
vi.mock("better-auth/api", async () => {
  const actual =
    await vi.importActual<Record<string, unknown>>("better-auth/api");
  // Vitest's ESM mock proxy throws on an export the factory omits entirely,
  // so the absent helpers have to be spelled out as undefined.
  return { ...actual, getIP: undefined, getIp: undefined };
});

const { auditLog } = await import("../index");

describe("IP resolver shim", () => {
  it("should refuse to initialize when better-auth exports no IP helper", () => {
    const ctx = { version: "9.0.0", options: {} };

    expect(() =>
      auditLog().init(ctx as unknown as Parameters<
        ReturnType<typeof auditLog>["init"]
      >[0]),
    ).toThrow(/getIP.*getIp/s);
  });
});
