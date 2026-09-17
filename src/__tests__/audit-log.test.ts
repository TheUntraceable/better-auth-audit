import { emailOTPClient } from "better-auth/client/plugins";
import { admin, emailOTP, testUtils } from "better-auth/plugins";
import { getTestInstance } from "better-auth/test";
import { beforeAll, describe, expect, it } from "vitest";
import { auditLogClient } from "../client";
import { AUDIT_SYSTEM_HEADER, auditLog } from "../index";

interface AuditLogEntry {
  id: string;
  userId: string | null;
  message: string;
  endpoint: string;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: unknown;
  source: "http" | "server" | "system" | null;
  success: boolean;
  errorCode: string | null;
  createdAt: Date;
}

function parseMetadata(entry: AuditLogEntry): Record<string, unknown> | null {
  if (entry.metadata == null) return null;
  if (typeof entry.metadata === "string") return JSON.parse(entry.metadata);
  return entry.metadata as Record<string, unknown>;
}

const emailOtps = new Map<string, string>();

const { auth, client, signInWithTestUser, testUser } = await getTestInstance(
  {
    plugins: [
      testUtils(),
      admin(),
      emailOTP({
        async sendVerificationOTP({ email, otp }) {
          emailOtps.set(email, otp);
        },
      }),
      auditLog({ logFailures: true }),
    ],
  },
  {
    testWith: "sqlite",
    clientOptions: {
      plugins: [emailOTPClient(), auditLogClient()],
    },
  },
);

let ctx: Awaited<typeof auth.$context>;
let test: typeof ctx.test;

beforeAll(async () => {
  ctx = await auth.$context;
  test = ctx.test;

  // better-auth >=1.7 treats an `emailVerified: false` row as carrying no
  // proof of mailbox ownership, so the first email-primary proof to resolve
  // to it (the email OTP sign-in below) deletes every account linked to it —
  // including the password credential the rest of this suite signs in with.
  const existing = await ctx.internalAdapter.findUserByEmail(testUser.email);
  if (existing && !existing.user.emailVerified) {
    await ctx.internalAdapter.updateUser(existing.user.id, {
      emailVerified: true,
    });
  }
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

    it("should log sign-in via email OTP", async () => {
      await client.emailOtp.sendVerificationOtp({
        email: testUser.email,
        type: "sign-in",
      });
      const otp = emailOtps.get(testUser.email);
      expect(otp).toBeDefined();

      await client.signIn.emailOtp({
        email: testUser.email,
        otp: otp!,
      });

      const logs = (await ctx.adapter.findMany({
        model: "auditLog",
        where: [{ field: "endpoint", value: "/sign-in/email-otp" }],
      })) as AuditLogEntry[];

      const log = logs.find(
        (entry) =>
          entry.success && entry.message.includes("signed in via email OTP"),
      );
      expect(log).toBeDefined();
      expect(log!.message).toContain(testUser.email);
      expect(log!.source).toBe("http");
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

    it("should mark client calls with source: http", async () => {
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

      expect(logs[0]!.source).toBe("http");
    });
  });

  describe("server-side actions (auth.api.*)", () => {
    it("should log direct api calls with source: server", async () => {
      await auth.api.signUpEmail({
        body: {
          email: "server-action@example.com",
          password: "password123",
          name: "Server Action",
        },
      });
      const logs = (await ctx.adapter.findMany({
        model: "auditLog",
        where: [{ field: "endpoint", value: "/sign-up/email" }],
      })) as AuditLogEntry[];

      const log = logs.find(
        (l) => l.success && l.message.includes("server-action@example.com"),
      );
      expect(log).toBeDefined();
      expect(log!.source).toBe("server");
      expect(log!.userAgent).toBeNull();
    });

    it("should log failed direct api calls", async () => {
      await auth.api
        .signInEmail({
          body: { email: testUser.email, password: "wrong-server-password" },
        })
        .catch(() => { });
      const logs = (await ctx.adapter.findMany({
        model: "auditLog",
        where: [{ field: "endpoint", value: "/sign-in/email" }],
        sortBy: { field: "createdAt", direction: "desc" },
      })) as AuditLogEntry[];

      const log = logs.find((l) => !l.success && l.source === "server");
      expect(log).toBeDefined();
      expect(log!.errorCode).toBe("INVALID_EMAIL_OR_PASSWORD");
    });

    it("should attribute server calls made with headers to the acting user", async () => {
      const actingAdmin = test.createUser({
        email: "server-admin@example.com",
        role: "admin",
      });
      await test.saveUser(actingAdmin);
      const target = test.createUser({ email: "ban-target@example.com" });
      await test.saveUser(target);
      const headers = await test.getAuthHeaders({ userId: actingAdmin.id });

      await auth.api.banUser({
        body: { userId: target.id },
        headers,
      });
      const logs = (await ctx.adapter.findMany({
        model: "auditLog",
        where: [{ field: "endpoint", value: "/admin/ban-user" }],
      })) as AuditLogEntry[];

      const log = logs.find((l) => l.success);
      expect(log).toBeDefined();
      expect(log!.userId).toBe(actingAdmin.id);
      expect(log!.source).toBe("server");
      expect(parseMetadata(log!)).toMatchObject({ userId: target.id });

      await test.deleteUser(target.id);
      await test.deleteUser(actingAdmin.id);
    });

    it("should mark direct api calls carrying the system header as source: system", async () => {
      await auth.api.signUpEmail({
        body: {
          email: "cron-created@example.com",
          password: "password123",
          name: "Cron Created",
        },
        headers: new Headers({ [AUDIT_SYSTEM_HEADER]: "user-import" }),
      });
      const logs = (await ctx.adapter.findMany({
        model: "auditLog",
        where: [{ field: "endpoint", value: "/sign-up/email" }],
      })) as AuditLogEntry[];

      const log = logs.find(
        (l) => l.success && l.message.includes("cron-created@example.com"),
      );
      expect(log).toBeDefined();
      expect(log!.source).toBe("system");
      expect(parseMetadata(log!)).toMatchObject({
        systemReason: "user-import",
      });
    });

    it("should ignore the system header on HTTP requests (spoof resistance)", async () => {
      await client.signIn.email({
        email: testUser.email,
        password: testUser.password,
        fetchOptions: {
          headers: { [AUDIT_SYSTEM_HEADER]: "spoofed-by-client" },
        },
      });
      const logs = (await ctx.adapter.findMany({
        model: "auditLog",
        where: [{ field: "endpoint", value: "/sign-in/email" }],
        sortBy: { field: "createdAt", direction: "desc" },
        limit: 1,
      })) as AuditLogEntry[];

      expect(logs[0]!.source).toBe("http");
      expect(parseMetadata(logs[0]!)).toBeNull();
    });

    it("should keep anonymous server-side auth flows as source: server, not system", async () => {
      await auth.api
        .signInEmail({
          body: { email: "nobody-here@example.com", password: "wrong" },
        })
        .catch(() => { });
      const logs = (await ctx.adapter.findMany({
        model: "auditLog",
        where: [{ field: "endpoint", value: "/sign-in/email" }],
        sortBy: { field: "createdAt", direction: "desc" },
      })) as AuditLogEntry[];

      const log = logs.find((l) => !l.success && l.userId === null);
      expect(log).toBeDefined();
      expect(log!.source).toBe("server");
    });

    it("should not log server actions when logServerActions is disabled", async () => {
      const { auth: authNoServer } = await getTestInstance(
        {
          plugins: [testUtils(), auditLog({ logServerActions: false })],
        },
        { testWith: "sqlite" },
      );
      const ctxNoServer = await authNoServer.$context;

      await authNoServer.api.signUpEmail({
        body: {
          email: "invisible@example.com",
          password: "password123",
          name: "Invisible",
        },
      });
      const logs = await ctxNoServer.adapter.findMany({
        model: "auditLog",
        where: [{ field: "endpoint", value: "/sign-up/email" }],
      });
      expect(logs.length).toBe(0);
    });
  });

  describe("metadata", () => {
    it("should merge global metadata from options into every entry", async () => {
      const { auth: authMeta } = await getTestInstance(
        {
          plugins: [
            testUtils(),
            auditLog({
              metadata: (msgCtx) => ({ region: "eu-west-1", path: msgCtx.path }),
            }),
          ],
        },
        { testWith: "sqlite" },
      );
      const ctxMeta = await authMeta.$context;

      await authMeta.api.signUpEmail({
        body: {
          email: "meta@example.com",
          password: "password123",
          name: "Meta",
        },
      });
      const logs = (await ctxMeta.adapter.findMany({
        model: "auditLog",
        where: [{ field: "endpoint", value: "/sign-up/email" }],
      })) as AuditLogEntry[];

      const log = logs.find((l) => l.message.includes("meta@example.com"));
      expect(log).toBeDefined();
      expect(parseMetadata(log!)).toMatchObject({
        region: "eu-west-1",
        path: "/sign-up/email",
      });
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

    it("should log failed email OTP sign-in", async () => {
      await client.signIn.emailOtp({
        email: testUser.email,
        otp: "000000",
      });

      const logs = (await ctx.adapter.findMany({
        model: "auditLog",
        where: [{ field: "endpoint", value: "/sign-in/email-otp" }],
      })) as AuditLogEntry[];

      const failureLog = logs.find(
        (entry) =>
          !entry.success && entry.message.includes("Failed email OTP sign-in"),
      );
      expect(failureLog).toBeDefined();
      expect(failureLog!.errorCode).toBeTruthy();
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

      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data!.logs)).toBe(true);
      expect(typeof response.data!.total).toBe("number");

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

      expect(response.data).toBeDefined();
      expect(response.data!.total).toBeGreaterThan(0);

      await test.deleteUser(adminUser.id);
    });

    it("should filter by success and endpoint", async () => {
      const adminUser = test.createUser({
        email: "admin-success-filter@example.com",
        role: "admin",
      });
      await test.saveUser(adminUser);
      const headers = await test.getAuthHeaders({ userId: adminUser.id });

      const response = await client.auditLog.logs({
        query: { success: "false", endpoint: "/sign-in/email", limit: 100 },
        fetchOptions: { headers },
      });

      expect(response.data).toBeDefined();
      const logs = response.data!.logs as AuditLogEntry[];
      expect(logs.length).toBeGreaterThan(0);
      for (const log of logs) {
        expect(log.success).toBe(false);
        expect(log.endpoint).toBe("/sign-in/email");
      }

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

      expect(response.data).toBeDefined();

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

      const responseB = await client.auditLog.logs({
        query: { limit: 100 },
        fetchOptions: { headers: headersB },
      });

      expect(responseB.data).toBeDefined();
      for (const log of responseB.data!.logs as AuditLogEntry[]) {
        expect(log.userId).not.toBe(userA.id);
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
