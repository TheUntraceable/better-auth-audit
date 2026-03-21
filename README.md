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

The plugin uses Better Auth's `hooks.after` system to intercept endpoint calls and log them with a human-readable `message` describing what happened.

### What gets logged

Each audit log entry contains:

| Field       | Description                              |
| ----------- | ---------------------------------------- |
| `message`   | Human-readable description of the event  |
| `userId`    | The user who performed the action        |
| `endpoint`  | The endpoint path (e.g. `/sign-in/email`)|
| `ipAddress` | Extracted from `x-forwarded-for` / `x-real-ip` |
| `userAgent` | From the request headers                 |
| `metadata`  | Raw request body as JSON                 |

### Covered endpoints

**Base router** (always enabled):

- Sign in (email, social, OAuth callback)
- Sign up
- Sign out
- Update/delete user
- Change email/password, set password, verify password
- Forgot/reset password
- Email verification
- Session management (revoke, revoke others, update)

**Two-factor router** (auto-enabled when `two-factor` plugin is detected):

- Enable/disable 2FA
- TOTP URI generation and verification
- OTP send and verification
- Backup code generation and verification

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
};

auditLog({
  customRouters: [myRouter],
});
```

## License

MIT
