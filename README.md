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
      // Optional: which roles can view all logs (default: ["admin"])
      adminRoles: ["admin"],
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
| `ipAddress` | Extracted from `x-forwarded-for` / `x-real-ip` |
| `userAgent` | From the request headers                 |
| `metadata`  | Reserved for future use (always `null`)  |
| `success`   | `true` for successful actions, `false` for failures |
| `errorCode` | The error code from `APIError` (e.g. `INVALID_PASSWORD`) — only set on failures |

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

```ts
// Client-side: fetch your own logs
const logs = await authClient.auditLog.getAuditLogs({
  query: { limit: 25, offset: 0 },
});

// Admins can fetch all logs or filter by user
const logs = await authClient.auditLog.getAuditLogs({
  query: { userId: "some-user-id" },
});
```

Tenant isolation is enforced — regular users only see their own logs. Users with an admin role (from the [admin plugin](https://better-auth.com/docs/plugins/admin)) can view all logs.

## Custom Routers

You can add your own routers for custom plugins:

```ts
import { auditLog } from "better-auth-audit";
import type { AuditRouter } from "better-auth-audit";

const myRouter: AuditRouter = {
  id: "my-plugin",
  routes: [
    {
      match: (path) => path === "/my-plugin/action",
      message: (ctx) => `${ctx.user?.email ?? "Someone"} performed an action`,
    },
  ],
  failureRoutes: [
    {
      match: (path) => path === "/my-plugin/action",
      message: (ctx) => `${ctx.user?.email ?? "Someone"} failed action (${ctx.errorCode})`,
    },
  ],
};

auditLog({
  customRouters: [myRouter],
});
```

## License

MIT
