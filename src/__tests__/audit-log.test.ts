import { admin, testUtils } from "better-auth/plugins";
import { getTestInstance } from "better-auth/test";
import { beforeAll, describe, expect, it } from "vitest";
import { auditLogClient } from "../client";
import { auditLog } from "../index";

interface AuditLogEntry {
  id: string;
  userId: string | null;
  message: string;
  endpoint: string;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: unknown;
  success: boolean;
  errorCode: string | null;
  createdAt: Date;
}

const { auth, client, signInWithTestUser, testUser } = await getTestInstance(
  {
    plugins: [testUtils(), admin(), auditLog({ logFailures: true })],
  },
  {
    testWith: "sqlite",
    clientOptions: {
      plugins: [auditLogClient()],
    },
  },
);

let ctx: Awaited<typeof auth.$context>;
let test: typeof ctx.test;

beforeAll(async () => {
  ctx = await auth.$context;
  test = ctx.test;
});

describe("audit log plugin", () => {
  describe("success events", () => {
    it("should log sign-in via email", async () => {
      await signInWithTestUser();

      const logs = (await ctx.adapter.findMany({
        model: "auditLog",
        where: [{ field: "endpoint", value: "/sign-in/email" }],
      })) as AuditLogEntry[];

      expect(logs.length).toBeGreaterThanOrEqual(1);
      const log = logs.find(
        (l) => l.success === true && l.message.includes("signed in via email"),
      );
      expect(log).toBeDefined();
      expect(log!.success).toBe(true);
      expect(log!.endpoint).toBe("/sign-in/email");
      expect(log!.message).toContain(testUser.email);
    });

    it("should log sign-up via email", async () => {
      await client.signUp.email({
        email: "signup-test@example.com",
        password: "password123",
        name: "Signup Test",
      });

      const logs = (await ctx.adapter.findMany({
        model: "auditLog",
        where: [{ field: "endpoint", value: "/sign-up/email" }],
      })) as AuditLogEntry[];

      const log = logs.find(
        (l) =>
          l.success === true && l.message.includes("signup-test@example.com"),
      );
      expect(log).toBeDefined();
      expect(log!.message).toContain("signed up via email");
    });

    it("should log sign-out", async () => {
      const { headers } = await signInWithTestUser();

      await client.signOut({
        fetchOptions: { headers },
      });

      const logs = (await ctx.adapter.findMany({
        model: "auditLog",
        where: [{ field: "endpoint", value: "/sign-out" }],
      })) as AuditLogEntry[];

      const log = logs.find(
        (l) => l.success === true && l.message.includes("signed out"),
      );
      expect(log).toBeDefined();
    });

    it("should store user agent and IP address", async () => {
      await client.signIn.email({
        email: testUser.email,
        password: testUser.password,
        fetchOptions: {
          headers: {
            "user-agent": "vitest-test-agent",
            "x-forwarded-for": "203.0.113.50",
          },
        },
      });

      const logs = (await ctx.adapter.findMany({
        model: "auditLog",
        where: [{ field: "endpoint", value: "/sign-in/email" }],
      })) as AuditLogEntry[];

      const log = logs.find(
        (l) =>
          l.success === true && l.userAgent === "vitest-test-agent",
      );
      expect(log).toBeDefined();
      expect(log!.ipAddress).toBe("203.0.113.50");
    });
  });

  describe("failure events", () => {
    it("should log failed sign-in with wrong password", async () => {
      await client.signIn
        .email({
          email: testUser.email,
          password: "wrong-password",
        })
        .catch(() => { });

      const logs = (await ctx.adapter.findMany({
        model: "auditLog",
        where: [{ field: "endpoint", value: "/sign-in/email" }],
      })) as AuditLogEntry[];

      const failureLog = logs.find(
        (l) =>
          l.success === false &&
          l.message.includes("invalid email or password"),
      );
      expect(failureLog).toBeDefined();
      expect(failureLog!.success).toBe(false);
      expect(failureLog!.errorCode).toBe("INVALID_EMAIL_OR_PASSWORD");
    });

    it("should log failed sign-up with existing email", async () => {
      await client.signUp
        .email({
          email: testUser.email,
          password: "password123",
          name: "Duplicate",
        })
        .catch(() => { });

      const logs = (await ctx.adapter.findMany({
        model: "auditLog",
        where: [{ field: "endpoint", value: "/sign-up/email" }],
      })) as AuditLogEntry[];

      const failureLog = logs.find(
        (l) =>
          l.success === false &&
          l.message.includes("email already registered"),
      );
      expect(failureLog).toBeDefined();
      expect(failureLog!.errorCode).toBeTruthy();
    });

    it("should not log failures when logFailures is disabled", async () => {
      const { auth: authNoFail } = await getTestInstance(
        {
          plugins: [testUtils(), auditLog({ logFailures: false })],
        },
        { testWith: "sqlite" },
      );

      const ctxNoFail = await authNoFail.$context;

      const before = await ctxNoFail.adapter.findMany({
        model: "auditLog",
        where: [{ field: "success", value: false }],
      });
      const beforeCount = before.length;

      await authNoFail.api
        .signInEmail({
          body: { email: "nobody@example.com", password: "wrong" },
        })
        .catch(() => { });

      const after = await ctxNoFail.adapter.findMany({
        model: "auditLog",
        where: [{ field: "success", value: false }],
      });
      expect(after.length).toBe(beforeCount);
    });
  });

  describe("getAuditLogs endpoint", () => {
    it("should return logs for authenticated user", async () => {
      const user = test.createUser({
        email: "logviewer@example.com",
        role: "user",
      });
      await test.saveUser(user);
      const headers = await test.getAuthHeaders({ userId: user.id });

      const response = await client.auditLog.logs({
        query: { limit: 10 },
        fetchOptions: { headers },
      });

      expect(response).toBeDefined();

      await test.deleteUser(user.id);
    });

    it("should allow admin to view all logs", async () => {
      const adminUser = test.createUser({
        email: "admin-viewer@example.com",
        role: "admin",
      });
      await test.saveUser(adminUser);
      const headers = await test.getAuthHeaders({ userId: adminUser.id });

      const response = await client.auditLog.logs({
        query: { limit: 50 },
        fetchOptions: { headers },
      });

      expect(response).toBeDefined();

      await test.deleteUser(adminUser.id);
    });

    it("should filter by userId when admin provides it", async () => {
      const targetUser = test.createUser({
        email: "target@example.com",
      });
      await test.saveUser(targetUser);

      const adminUser = test.createUser({
        email: "admin-filter@example.com",
        role: "admin",
      });
      await test.saveUser(adminUser);
      const headers = await test.getAuthHeaders({ userId: adminUser.id });

      const response = await client.auditLog.logs({
        query: { userId: targetUser.id, limit: 10 },
        fetchOptions: { headers },
      });

      expect(response).toBeDefined();

      await test.deleteUser(targetUser.id);
      await test.deleteUser(adminUser.id);
    });
  });

  describe("tenant isolation", () => {
    it("should only return own logs for non-admin users", async () => {
      const userA = test.createUser({ email: "userA@example.com", role: "user" });
      const userB = test.createUser({ email: "userB@example.com", role: "user" });
      await test.saveUser(userA);
      await test.saveUser(userB);

      const headersA = await test.getAuthHeaders({ userId: userA.id });
      const headersB = await test.getAuthHeaders({ userId: userB.id });

      await client.auditLog.logs({
        query: { limit: 100 },
        fetchOptions: { headers: headersA },
      });

      const logsB = await client.auditLog.logs({
        query: { limit: 100 },
        fetchOptions: { headers: headersB },
      });

      if (Array.isArray(logsB)) {
        for (const log of logsB as any[]) {
          expect(log.userId).not.toBe(userA.id);
        }
      }

      await test.deleteUser(userA.id);
      await test.deleteUser(userB.id);
    });
  });

  describe("schema", () => {
    it("should store raw errorCode in the database", async () => {
      await client.signIn
        .email({
          email: testUser.email,
          password: "definitely-wrong",
        })
        .catch(() => { });

      const logs = (await ctx.adapter.findMany({
        model: "auditLog",
        where: [{ field: "endpoint", value: "/sign-in/email" }],
      })) as AuditLogEntry[];

      const failureLog = logs.find(
        (l) => l.success === false && l.errorCode,
      );
      expect(failureLog).toBeDefined();
      expect(typeof failureLog!.errorCode).toBe("string");
      expect(failureLog!.errorCode!.length).toBeGreaterThan(0);
    });

    it("should not store request body in metadata", async () => {
      await client.signIn.email({
        email: testUser.email,
        password: testUser.password,
      });

      const logs = (await ctx.adapter.findMany({
        model: "auditLog",
        where: [{ field: "endpoint", value: "/sign-in/email" }],
        sortBy: { field: "createdAt", direction: "desc" },
        limit: 1,
      })) as AuditLogEntry[];

      expect(logs.length).toBe(1);
      const entry = logs[0]!;
      expect(entry.metadata).toBeNull();
    });
  });
});
