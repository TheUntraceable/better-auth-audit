import type { AuditRouter, MessageContext } from "../types";

function userLabel(ctx: MessageContext): string {
  if (ctx.user?.email) return ctx.user.email;
  if (ctx.user?.name) return ctx.user.name;
  if (ctx.user?.id) return `user ${ctx.user.id}`;
  return "Unknown user";
}

function bodyEmail(ctx: MessageContext): string {
  const email = ctx.body?.["email"];
  return typeof email === "string" ? email : "unknown";
}

function exact(target: string) {
  return (path: string) => path === target;
}

function errorCode(ctx: MessageContext): string {
  return ctx.errorCode ?? "UNKNOWN_ERROR";
}

export const baseRouter: AuditRouter = {
  id: "base",
  routes: [
    {
      match: exact("/sign-in/email"),
      message: (ctx) => `${bodyEmail(ctx)} signed in via email`,
    },
    {
      match: exact("/sign-in/social"),
      message: (ctx) => {
        const provider = ctx.body?.["provider"] ?? "unknown";
        return `${bodyEmail(ctx)} signed in via ${provider}`;
      },
    },
    {
      match: (path) => path.startsWith("/callback/"),
      message: (ctx) => {
        const provider = ctx.path.replace("/callback/", "");
        return `${userLabel(ctx)} completed OAuth callback for ${provider}`;
      },
    },
    {
      match: exact("/sign-up/email"),
      message: (ctx) => `${bodyEmail(ctx)} signed up via email`,
    },
    {
      match: exact("/sign-out"),
      message: (ctx) => `${userLabel(ctx)} signed out`,
    },
    {
      match: exact("/update-user"),
      message: (ctx) => `${userLabel(ctx)} updated their profile`,
    },
    {
      match: exact("/delete-user"),
      message: (ctx) => `${userLabel(ctx)} requested account deletion`,
    },
    {
      match: exact("/delete-user/callback"),
      message: (ctx) => `${userLabel(ctx)} completed account deletion`,
    },
    {
      match: exact("/change-email"),
      message: (ctx) => {
        const newEmail = ctx.body?.["newEmail"];
        return typeof newEmail === "string"
          ? `${userLabel(ctx)} changed their email to ${newEmail}`
          : `${userLabel(ctx)} changed their email`;
      },
    },
    {
      match: exact("/change-password"),
      message: (ctx) => `${userLabel(ctx)} changed their password`,
    },
    {
      match: exact("/set-password"),
      message: (ctx) => `${userLabel(ctx)} set a password`,
    },
    {
      match: exact("/verify-password"),
      message: (ctx) => `${userLabel(ctx)} verified their password`,
    },
    {
      match: exact("/forget-password"),
      message: (ctx) => `Password reset requested for ${bodyEmail(ctx)}`,
    },
    {
      match: exact("/reset-password"),
      message: (ctx) => `Password was reset via token`,
    },
    {
      match: exact("/send-verification-email"),
      message: (ctx) => `Verification email sent to ${bodyEmail(ctx)}`,
    },
    {
      match: exact("/verify-email"),
      message: (ctx) => `${userLabel(ctx)} verified their email`,
    },
    {
      match: exact("/revoke-session"),
      message: (ctx) => `${userLabel(ctx)} revoked a session`,
    },
    {
      match: exact("/revoke-sessions"),
      message: (ctx) => `${userLabel(ctx)} revoked multiple sessions`,
    },
    {
      match: exact("/revoke-other-sessions"),
      message: (ctx) => `${userLabel(ctx)} revoked all other sessions`,
    },
    {
      match: exact("/update-session"),
      message: (ctx) => `${userLabel(ctx)} updated session data`,
    },
  ],
  failureRoutes: [
    {
      match: exact("/sign-in/email"),
      message: (ctx) => `Failed sign-in attempt for ${bodyEmail(ctx)} (${errorCode(ctx)})`,
    },
    {
      match: exact("/sign-in/social"),
      message: (ctx) => {
        const provider = ctx.body?.["provider"] ?? "unknown";
        return `Failed sign-in via ${provider} for ${bodyEmail(ctx)} (${errorCode(ctx)})`;
      },
    },
    {
      match: (path) => path.startsWith("/callback/"),
      message: (ctx) => {
        const provider = ctx.path.replace("/callback/", "");
        return `OAuth callback failed for ${provider} (${errorCode(ctx)})`;
      },
    },
    {
      match: exact("/sign-up/email"),
      message: (ctx) => `Failed sign-up attempt for ${bodyEmail(ctx)} (${errorCode(ctx)})`,
    },
    {
      match: exact("/verify-password"),
      message: (ctx) => `${userLabel(ctx)} failed password verification (${errorCode(ctx)})`,
    },
    {
      match: exact("/forget-password"),
      message: (ctx) => `Password reset requested for non-existent ${bodyEmail(ctx)} (${errorCode(ctx)})`,
    },
    {
      match: exact("/reset-password"),
      message: (ctx) => `Failed password reset — invalid or expired token (${errorCode(ctx)})`,
    },
    {
      match: exact("/verify-email"),
      message: (ctx) => `Failed email verification — invalid or expired token (${errorCode(ctx)})`,
    },
  ],
};
