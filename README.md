# better-auth-audit

Audit log plugin for [Better Auth](https://better-auth.com). Automatically logs auth events with human-readable messages and stores them in your database.

## Installation

```bash
npm install better-auth-audit
```

## Setup

### Server

```ts
import { betterAuth } from "better-auth";
import { auditLog } from "better-auth-audit";

export const auth = betterAuth({
  plugins: [
    auditLog({
      // Optional: override which routers are active
      routers: {
        base: true,
        "two-factor": true,
      },
      // Optional: log failed auth attempts (default: true)
      logFailures: true,
      // Optional: log direct auth.api.* calls made on the server (default: true)
      logServerActions: true,
      // Optional: which roles can view all logs (default: ["admin"])
      adminRoles: ["admin"],
      // Optional: attach extra metadata to every entry
      metadata: (ctx) => ({ region: process.env.REGION }),
    }),
  ],
});
```

### Client

```ts
import { createAuthClient } from "better-auth/client";
import { auditLogClient } from "better-auth-audit/client";

export const authClient = createAuthClient({
  plugins: [auditLogClient()],
});
```

## How It Works

The plugin uses Better Auth's `hooks.after` system to intercept endpoint calls and log them with a human-readable `message` describing what happened. It detects both successful responses and `APIError` failures, logging each with the appropriate `success` flag.

### What gets logged

Each audit log entry contains:

| Field       | Description                              |
| ----------- | ---------------------------------------- |
| `message`   | Human-readable description of the event  |
| `userId`    | The user who performed the action        |
| `endpoint`  | The endpoint path (e.g. `/sign-in/email`)|
| `source`    | `"http"` for requests via `auth.handler`, `"server"` for direct `auth.api.*` calls, `"system"` for direct calls marked as automation (see below) |
| `ipAddress` | Resolved with Better Auth's IP detection — honors your `advanced.ipAddress` config (custom headers, `disableIpTracking`, IPv6 normalization) |
| `userAgent` | From the request headers                 |
| `metadata`  | Structured JSON details for the event (e.g. `provider`, target `userId`, `organizationId`) plus anything returned by your `metadata` option; `impersonatedBy` is added automatically when an admin acts while impersonating |
| `success`   | `true` for successful actions, `false` for failures |
| `errorCode` | The error code from `APIError` (e.g. `INVALID_PASSWORD`) — only set on failures |

### Server-side actions

Calls made directly on the server via `auth.api.*` are logged too — Better Auth
runs plugin hooks for direct API calls, not just HTTP requests. These entries
have `source: "server"`. When headers are forwarded, the entry is attributed
to the acting user's session, so "an admin clicked a button that ran on the
server" stays distinguishable from anonymous machine activity.

```ts
// This is audited just like an HTTP request would be:
await auth.api.banUser({
  body: { userId: "some-user" },
  headers: await headers(), // pass headers to attribute the acting admin + capture IP/UA
});
```

Two things to know:

- **Pass `headers` when acting on behalf of a user.** Without them the entry has
  no session to attribute, so `userId`, `ipAddress` and `userAgent` will be `null`.
- **Opt out** with `logServerActions: false` if you only want user-facing HTTP
  events (e.g. your server runs noisy batch jobs through `auth.api`).

### Covered endpoints

**Base router** (always enabled):

Success: sign in (email, social, OAuth callback), sign up, sign out, update/delete user, change email/password, set/verify password, forgot/reset password, email verification, session management.

Failures: failed sign-in (wrong password, user not found), failed sign-up, failed password verification, failed password/email reset (invalid tokens), OAuth callback errors.

**Two-factor router** (auto-enabled when `two-factor` plugin is detected):

Success: enable/disable 2FA, TOTP URI generation and verification, OTP send and verification, backup code generation and verification.

Failures: failed TOTP/OTP/backup code verification (brute force detection), failed OTP send (rate limiting).

### Plugin routers

Routers are auto-detected based on installed Better Auth plugins. Each router logs both successes and failures:

| Plugin | ID | Events |
|---|---|---|
| **admin** | `admin` | User CRUD, role changes, bans, impersonation, session revocation |
| **organization** | `organization` | Org CRUD, invitations, member management, role updates |
| **passkey** | `passkey` | Passkey sign-in, register, delete, update |
| **email OTP** | `email-otp` | OTP requests, email verification, sign-in, password reset, email changes |
| **magic-link** | `magic-link` | Magic link send and verify |
| **username** | `username` | Username sign-in |
| **anonymous** | `anonymous` | Anonymous sign-in, account deletion |
| **phone-number** | `phone-number` | Phone sign-in, OTP send/verify, password reset |
| **api-key** | `api-key` | API key create, update, delete |
| **one-time-token** | `one-time-token` | One-time token generate and verify |
| **multi-session** | `multi-session` | Session switching and revocation |

## Failure Events

Failure logging is enabled by default (`logFailures: true`). When Better Auth throws an `APIError` on an endpoint that has a matching failure route, the plugin logs it with `success: false` and the error code.

Failure events include:

- **Sign-in failures** — wrong password, user not found (brute force / credential stuffing detection)
- **Sign-up failures** — duplicate email, validation errors (account enumeration)
- **2FA failures** — wrong TOTP/OTP/backup code (2FA brute force)
- **Admin failures** — permission denied, user not found (compromised admin detection)
- **Org failures** — expired invitations, permission denied (unauthorized actions)
- **Phone failures** — wrong OTP, rate limited (OTP brute force, SMS pumping)
- **API key failures** — permission denied, limit reached (key proliferation)
- **Passkey failures** — challenge failed (WebAuthn failure detection)
- **Password/email reset failures** — invalid/expired tokens (token abuse)

Disable failure logging:

```ts
auditLog({
  logFailures: false,
});
```

## Fetching Logs

The endpoint returns `{ logs, total }` — `total` is the count matching your
filters, for building pagination.

```ts
// Client-side: fetch your own logs
const { data } = await authClient.auditLog.logs({
  query: { limit: 25, offset: 0 },
});
// data.logs, data.total

// Admins can fetch all logs or filter by user
const { data } = await authClient.auditLog.logs({
  query: { userId: "some-user-id" },
});

// Filter by endpoint, success or source
const { data } = await authClient.auditLog.logs({
  query: { endpoint: "/sign-in/email", success: "false", source: "http" },
});

// Server-side, as an admin
const { logs, total } = await auth.api.getAuditLogs({
  query: { limit: 100 },
  headers: await headers(),
});
```

Tenant isolation is enforced — regular users only see their own logs. Users with an admin role (from the [admin plugin](https://better-auth.com/docs/plugins/admin)) can view all logs.

## Custom Routers

You can add your own routers for custom plugins:

```ts
import { auditLog, exact, fromBody, userLabel, describeError } from "better-auth-audit";
import type { AuditRouter } from "better-auth-audit";

const myRouter: AuditRouter = {
  id: "my-plugin",
  routes: [
    {
      match: exact("/my-plugin/action"), // exact() paths get O(1) lookup
      message: (ctx) => `${userLabel(ctx)} performed an action`,
      // Optional: structured details stored in the metadata column.
      // fromBody() copies only primitive fields — never put secrets here.
      metadata: fromBody("resourceId"),
    },
  ],
  failureRoutes: [
    {
      match: exact("/my-plugin/action"),
      message: (ctx) => `${userLabel(ctx)} failed action — ${describeError(ctx.errorCode)}`,
    },
  ],
};

auditLog({
  customRouters: [myRouter],
});
```

Route handlers receive a `MessageContext` with `path`, `body`, `response`,
`errorCode`, `user`, `headers` and `source` (`"http"` | `"server"` |
`"system"`). Returning `null` from `message` skips the entry.

### System actions (automation)

Automation — cron jobs, cleanup tasks, migrations — should self-identify by
sending the `x-audit-system` header (exported as `AUDIT_SYSTEM_HEADER`) on its
`auth.api.*` calls. Those entries get `source: "system"`, the header value is
stored in metadata as `systemReason`, and messages fall back to the label
`System` when no session is attached:

```ts
import { AUDIT_SYSTEM_HEADER } from "better-auth-audit";

await auth.api.revokeUserSessions({
  body: { userId: staleUser.id },
  headers: new Headers({ [AUDIT_SYSTEM_HEADER]: "session-cleanup" }),
});
// -> source: "system", metadata: { systemReason: "session-cleanup" }
```

The marker is deliberately explicit-only. It is ignored on HTTP requests so
clients cannot spoof it, and it is never inferred from a missing session —
anonymous server-side auth flows (a sign-in attempt from a server action, say)
remain `source: "server"`. One caveat follows from the HTTP-only guard: do not
forward untrusted client headers wholesale into `auth.api.*` calls.

## License

MIT
