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

See [Plugins to Add](#plugins-to-add) for the full list of planned routers.

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

## Plugins to Add

The following Better Auth plugins should have built-in audit routers. They are auto-detected by plugin ID and only activate when the corresponding plugin is installed.

### admin (id: `admin`)

Admin-level user management operations. Critical for security auditing.

| Endpoint | Description |
|---|---|
| `POST /admin/create-user` | Admin created a new user |
| `POST /admin/set-role` | Admin changed a user's role |
| `POST /admin/set-user-password` | Admin set a user's password |
| `POST /admin/update-user` | Admin updated a user's details |
| `POST /admin/ban-user` | Admin banned a user |
| `POST /admin/unban-user` | Admin unbanned a user |
| `POST /admin/impersonate-user` | Admin impersonated a user |
| `POST /admin/stop-impersonating` | Admin stopped impersonating |
| `POST /admin/revoke-user-session` | Admin revoked a specific session |
| `POST /admin/revoke-user-sessions` | Admin revoked all sessions for a user |
| `POST /admin/remove-user` | Admin removed (deleted) a user |

### organization (id: `organization`)

Organization, member, and invitation management.

| Endpoint | Description |
|---|---|
| `POST /organization/create` | Created a new organization |
| `POST /organization/update` | Updated organization details |
| `POST /organization/delete` | Deleted an organization |
| `POST /organization/invite-member` | Invited a member to the organization |
| `POST /organization/accept-invitation` | Accepted an organization invitation |
| `POST /organization/cancel-invitation` | Cancelled an invitation |
| `POST /organization/reject-invitation` | Rejected an invitation |
| `POST /organization/remove-member` | Removed a member from the organization |
| `POST /organization/update-member-role` | Updated a member's role |
| `POST /organization/set-active` | Set the active organization |
| `POST /organization/leave` | Left the organization |

### passkey (id: `passkey`)

WebAuthn/passkey registration and authentication.

| Endpoint | Description |
|---|---|
| `POST /sign-in/passkey` | Signed in via passkey |
| `POST /passkey/add-passkey` | Registered a new passkey |
| `POST /passkey/delete-passkey` | Deleted a passkey |
| `POST /passkey/update-passkey` | Renamed a passkey |

### magic-link (id: `magicLink`)

Passwordless email magic link authentication.

| Endpoint | Description |
|---|---|
| `POST /sign-in/magic-link` | Requested a magic link sign-in |
| `GET /magic-link/verify` | Verified a magic link token |

### username (id: `username`)

Username-based authentication.

| Endpoint | Description |
|---|---|
| `POST /sign-in/username` | Signed in via username |
| `POST /is-username-available` | Checked username availability |

### anonymous (id: `anonymous`)

Guest/anonymous session management.

| Endpoint | Description |
|---|---|
| `POST /sign-in/anonymous` | Signed in anonymously |
| `POST /delete-anonymous-user` | Deleted anonymous user account |

### phone-number (id: `phoneNumber`)

Phone number and OTP authentication.

| Endpoint | Description |
|---|---|
| `POST /sign-in/phone-number` | Signed in via phone number |
| `POST /phone-number/send-otp` | Sent OTP to phone number |
| `POST /phone-number/verify` | Verified phone number with OTP |
| `POST /phone-number/request-password-reset` | Requested password reset via phone |
| `POST /phone-number/reset-password` | Reset password via phone OTP |

### api-key (id: `apiKey`)

API key lifecycle management.

| Endpoint | Description |
|---|---|
| `POST /api-key/create` | Created an API key |
| `POST /api-key/update` | Updated an API key |
| `POST /api-key/delete` | Deleted an API key |

### one-time-token (id: `oneTimeToken`)

Single-use session token generation and verification.

| Endpoint | Description |
|---|---|
| `GET /one-time-token/generate` | Generated a one-time token |
| `POST /one-time-token/verify` | Verified a one-time token |

### multi-session (id: `multiSession`)

Multiple concurrent sessions per user.

| Endpoint | Description |
|---|---|
| `POST /multi-session/set-active` | Set active session from multiple |
| `POST /multi-session/revoke` | Revoked a device session |

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
