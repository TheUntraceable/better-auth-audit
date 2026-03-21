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

## Failure Events

The plugin currently only logs successful operations. Failed auth attempts are equally critical for security auditing — brute force detection, credential stuffing, suspicious admin activity, etc.

### How failures work in Better Auth

Better Auth throws `APIError` objects on failure. These still pass through `hooks.after` as `ctx.context.returned`, but the current code skips them by checking for the `statusCode` property (`src/index.ts:29-31`). To capture failures, the `after` hook needs to detect `APIError` instances and log them separately.

### Critical failures to capture

#### Base auth failures

| Endpoint | Failure | Why it matters |
|---|---|---|
| `POST /sign-in/email` | Wrong password, user not found | Brute force / credential stuffing detection |
| `POST /sign-in/social` | OAuth denied or failed | Detect OAuth misconfig or user-initiated aborts |
| `POST /callback/*` | OAuth callback error | Provider failures, replay attacks |
| `POST /sign-in/username` | Wrong password, user not found | Brute force via username |
| `POST /sign-in/phone-number` | Wrong password | Brute force via phone |
| `POST /sign-in/magic-link` | Invalid/expired token | Token abuse or phishing attempts |
| `POST /sign-in/passkey` | Challenge failed, no credential | WebAuthn failure detection |
| `POST /sign-in/anonymous` | Rate limited | Guest abuse |
| `POST /sign-up/email` | Email already exists, validation failure | Account enumeration, abuse |
| `POST /forget-password` | User not found | Email enumeration |
| `POST /reset-password` | Invalid/expired token | Token brute forcing |
| `POST /verify-email` | Invalid/expired token | Token abuse |
| `POST /verify-password` | Wrong password | Re-auth failures |

#### Two-factor failures

| Endpoint | Failure | Why it matters |
|---|---|---|
| `POST /two-factor/verify-totp` | Wrong TOTP code | 2FA brute force |
| `POST /two-factor/verify-otp` | Wrong OTP code | 2FA brute force |
| `POST /two-factor/verify-backup-code` | Wrong backup code | Backup code exhaustion attacks |
| `POST /two-factor/send-otp` | Rate limited | OTP spam / abuse |

#### Admin failures

| Endpoint | Failure | Why it matters |
|---|---|---|
| `POST /admin/create-user` | Duplicate email, permission denied | Admin misuse or compromised admin |
| `POST /admin/set-role` | Invalid role, permission denied | Privilege escalation attempts |
| `POST /admin/ban-user` | User not found, permission denied | Unauthorized admin actions |
| `POST /admin/impersonate-user` | Permission denied, target is admin | Unauthorized impersonation |
| `POST /admin/remove-user` | Permission denied | Unauthorized deletion |

#### Organization failures

| Endpoint | Failure | Why it matters |
|---|---|---|
| `POST /organization/invite-member` | Already invited, permission denied | Invitation abuse |
| `POST /organization/accept-invitation` | Expired, already accepted | Stale/invalid token use |
| `POST /organization/remove-member` | Permission denied | Unauthorized member removal |

#### API key failures

| Endpoint | Failure | Why it matters |
|---|---|---|
| `POST /api-key/create` | Permission denied, limit reached | Key proliferation |
| (verification) | Invalid key, expired, rate limited | Key abuse / theft detection |

#### Phone number failures

| Endpoint | Failure | Why it matters |
|---|---|---|
| `POST /phone-number/verify` | Wrong OTP, too many attempts | OTP brute force |
| `POST /phone-number/send-otp` | Rate limited | SMS pumping / toll fraud |

### Proposed implementation

Add a `logFailures` option (default: `true`) and a parallel `"failure"` event type:

```ts
auditLog({
  logFailures: true,
  // Optional: customize which failures to log
  failureEndpoints: [
    "/sign-in/email",
    "/sign-in/username",
    "/two-factor/verify-totp",
    // ...
  ],
});
```

Failure log entries would include an additional `success: false` field and the error code:

| Field | Description |
|---|---|
| `success` | `false` for failure events |
| `errorCode` | The `APIError` code (e.g. `INVALID_PASSWORD`) |
| `message` | Human-readable failure description |
| `endpoint` | The endpoint that failed |
| `ipAddress` | Source IP |
| `userAgent` | Request user agent |

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
