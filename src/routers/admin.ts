import type { AuditRouter } from "../types";
import { userLabel, bodyEmail, exact, describeError } from "./utils";

export const adminRouter: AuditRouter = {
  id: "admin",
  routes: [
    {
      match: exact("/admin/create-user"),
      message: (ctx) => `${userLabel(ctx)} created user ${bodyEmail(ctx)}`,
    },
    {
      match: exact("/admin/set-role"),
      message: (ctx) => {
        const userId = ctx.body?.["userId"];
        const role = ctx.body?.["role"];
        return `${userLabel(ctx)} set role "${role}" for user ${userId}`;
      },
    },
    {
      match: exact("/admin/set-user-password"),
      message: (ctx) => {
        const userId = ctx.body?.["userId"];
        return `${userLabel(ctx)} set password for user ${userId}`;
      },
    },
    {
      match: exact("/admin/update-user"),
      message: (ctx) => {
        const userId = ctx.body?.["data"] && typeof ctx.body.data === "object"
          ? (ctx.body.data as Record<string, unknown>).userId ?? ctx.body.userId
          : ctx.body?.["userId"];
        return `${userLabel(ctx)} updated user ${userId}`;
      },
    },
    {
      match: exact("/admin/ban-user"),
      message: (ctx) => {
        const userId = ctx.body?.["userId"];
        return `${userLabel(ctx)} banned user ${userId}`;
      },
    },
    {
      match: exact("/admin/unban-user"),
      message: (ctx) => {
        const userId = ctx.body?.["userId"];
        return `${userLabel(ctx)} unbanned user ${userId}`;
      },
    },
    {
      match: exact("/admin/impersonate-user"),
      message: (ctx) => {
        const userId = ctx.body?.["userId"];
        return `${userLabel(ctx)} started impersonating user ${userId}`;
      },
    },
    {
      match: exact("/admin/stop-impersonating"),
      message: (ctx) => `${userLabel(ctx)} stopped impersonating`,
    },
    {
      match: exact("/admin/revoke-user-session"),
      message: (ctx) => {
        const token = ctx.body?.["sessionToken"];
        return `${userLabel(ctx)} revoked session ${token}`;
      },
    },
    {
      match: exact("/admin/revoke-user-sessions"),
      message: (ctx) => {
        const userId = ctx.body?.["userId"];
        return `${userLabel(ctx)} revoked all sessions for user ${userId}`;
      },
    },
    {
      match: exact("/admin/remove-user"),
      message: (ctx) => {
        const userId = ctx.body?.["userId"];
        return `${userLabel(ctx)} removed user ${userId}`;
      },
    },
  ],
  failureRoutes: [
    {
      match: exact("/admin/create-user"),
      message: (ctx) => `${userLabel(ctx)} failed to create user ${bodyEmail(ctx)} — ${describeError(ctx.errorCode)}`,
    },
    {
      match: exact("/admin/set-role"),
      message: (ctx) => `${userLabel(ctx)} failed to set role — ${describeError(ctx.errorCode)}`,
    },
    {
      match: exact("/admin/ban-user"),
      message: (ctx) => {
        const userId = ctx.body?.["userId"];
        return `${userLabel(ctx)} failed to ban user ${userId} — ${describeError(ctx.errorCode)}`;
      },
    },
    {
      match: exact("/admin/unban-user"),
      message: (ctx) => {
        const userId = ctx.body?.["userId"];
        return `${userLabel(ctx)} failed to unban user ${userId} — ${describeError(ctx.errorCode)}`;
      },
    },
    {
      match: exact("/admin/impersonate-user"),
      message: (ctx) => {
        const userId = ctx.body?.["userId"];
        return `${userLabel(ctx)} failed to impersonate user ${userId} — ${describeError(ctx.errorCode)}`;
      },
    },
    {
      match: exact("/admin/revoke-user-sessions"),
      message: (ctx) => {
        const userId = ctx.body?.["userId"];
        return `${userLabel(ctx)} failed to revoke sessions for user ${userId} — ${describeError(ctx.errorCode)}`;
      },
    },
    {
      match: exact("/admin/remove-user"),
      message: (ctx) => {
        const userId = ctx.body?.["userId"];
        return `${userLabel(ctx)} failed to remove user ${userId} — ${describeError(ctx.errorCode)}`;
      },
    },
  ],
};
