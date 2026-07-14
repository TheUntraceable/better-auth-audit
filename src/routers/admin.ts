import type { AuditRouter } from "../types";
import { userLabel, bodyEmail, exact, fromBody, describeError } from "./utils";

export const adminRouter: AuditRouter = {
  id: "admin",
  routes: [
    {
      match: exact("/admin/create-user"),
      message: (ctx) => `${userLabel(ctx)} created user ${bodyEmail(ctx)}`,
      metadata: fromBody("email", "role"),
    },
    {
      match: exact("/admin/set-role"),
      message: (ctx) => {
        const userId = ctx.body?.["userId"];
        const role = ctx.body?.["role"];
        return `${userLabel(ctx)} set role "${role}" for user ${userId}`;
      },
      metadata: fromBody("userId", "role"),
    },
    {
      match: exact("/admin/set-user-password"),
      message: (ctx) => {
        const userId = ctx.body?.["userId"];
        return `${userLabel(ctx)} set password for user ${userId}`;
      },
      metadata: fromBody("userId"),
    },
    {
      match: exact("/admin/update-user"),
      message: (ctx) => {
        const userId = ctx.body?.["data"] && typeof ctx.body.data === "object"
          ? (ctx.body.data as Record<string, unknown>).userId ?? ctx.body.userId
          : ctx.body?.["userId"];
        return `${userLabel(ctx)} updated user ${userId}`;
      },
      metadata: fromBody("userId"),
    },
    {
      match: exact("/admin/ban-user"),
      message: (ctx) => {
        const userId = ctx.body?.["userId"];
        return `${userLabel(ctx)} banned user ${userId}`;
      },
      metadata: fromBody("userId", "banReason", "banExpiresIn"),
    },
    {
      match: exact("/admin/unban-user"),
      message: (ctx) => {
        const userId = ctx.body?.["userId"];
        return `${userLabel(ctx)} unbanned user ${userId}`;
      },
      metadata: fromBody("userId"),
    },
    {
      match: exact("/admin/impersonate-user"),
      message: (ctx) => {
        const userId = ctx.body?.["userId"];
        return `${userLabel(ctx)} started impersonating user ${userId}`;
      },
      metadata: fromBody("userId"),
    },
    {
      match: exact("/admin/stop-impersonating"),
      message: (ctx) => `${userLabel(ctx)} stopped impersonating`,
    },
    {
      match: exact("/admin/revoke-user-session"),
      message: (ctx) => {
        return `${userLabel(ctx)} revoked a user session`;
      },
    },
    {
      match: exact("/admin/revoke-user-sessions"),
      message: (ctx) => {
        const userId = ctx.body?.["userId"];
        return `${userLabel(ctx)} revoked all sessions for user ${userId}`;
      },
      metadata: fromBody("userId"),
    },
    {
      match: exact("/admin/remove-user"),
      message: (ctx) => {
        const userId = ctx.body?.["userId"];
        return `${userLabel(ctx)} removed user ${userId}`;
      },
      metadata: fromBody("userId"),
    },
  ],
  failureRoutes: [
    {
      match: exact("/admin/create-user"),
      message: (ctx) => `${userLabel(ctx)} failed to create user ${bodyEmail(ctx)} — ${describeError(ctx.errorCode)}`,
      metadata: fromBody("email", "role"),
    },
    {
      match: exact("/admin/set-role"),
      message: (ctx) => `${userLabel(ctx)} failed to set role — ${describeError(ctx.errorCode)}`,
      metadata: fromBody("userId", "role"),
    },
    {
      match: exact("/admin/ban-user"),
      message: (ctx) => {
        const userId = ctx.body?.["userId"];
        return `${userLabel(ctx)} failed to ban user ${userId} — ${describeError(ctx.errorCode)}`;
      },
      metadata: fromBody("userId"),
    },
    {
      match: exact("/admin/unban-user"),
      message: (ctx) => {
        const userId = ctx.body?.["userId"];
        return `${userLabel(ctx)} failed to unban user ${userId} — ${describeError(ctx.errorCode)}`;
      },
      metadata: fromBody("userId"),
    },
    {
      match: exact("/admin/impersonate-user"),
      message: (ctx) => {
        const userId = ctx.body?.["userId"];
        return `${userLabel(ctx)} failed to impersonate user ${userId} — ${describeError(ctx.errorCode)}`;
      },
      metadata: fromBody("userId"),
    },
    {
      match: exact("/admin/revoke-user-sessions"),
      message: (ctx) => {
        const userId = ctx.body?.["userId"];
        return `${userLabel(ctx)} failed to revoke sessions for user ${userId} — ${describeError(ctx.errorCode)}`;
      },
      metadata: fromBody("userId"),
    },
    {
      match: exact("/admin/remove-user"),
      message: (ctx) => {
        const userId = ctx.body?.["userId"];
        return `${userLabel(ctx)} failed to remove user ${userId} — ${describeError(ctx.errorCode)}`;
      },
      metadata: fromBody("userId"),
    },
  ],
};
