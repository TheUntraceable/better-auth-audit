import type { AuditRouter, MessageContext } from "../types";

function userLabel(ctx: MessageContext): string {
  if (ctx.user?.email) return ctx.user.email;
  if (ctx.user?.name) return ctx.user.name;
  if (ctx.user?.id) return `user ${ctx.user.id}`;
  return "Unknown user";
}

function exact(target: string) {
  return (path: string) => path === target;
}

function errorCode(ctx: MessageContext): string {
  return ctx.errorCode ?? "UNKNOWN_ERROR";
}

export const passkeyRouter: AuditRouter = {
  id: "passkey",
  routes: [
    {
      match: exact("/sign-in/passkey"),
      message: (ctx) => `${userLabel(ctx)} signed in via passkey`,
    },
    {
      match: exact("/passkey/add-passkey"),
      message: (ctx) => {
        const name = ctx.body?.["name"];
        return name
          ? `${userLabel(ctx)} registered passkey "${name}"`
          : `${userLabel(ctx)} registered a new passkey`;
      },
    },
    {
      match: exact("/passkey/delete-passkey"),
      message: (ctx) => {
        const id = ctx.body?.["id"];
        return `${userLabel(ctx)} deleted passkey ${id}`;
      },
    },
    {
      match: exact("/passkey/update-passkey"),
      message: (ctx) => {
        const id = ctx.body?.["id"];
        const name = ctx.body?.["name"];
        return `${userLabel(ctx)} renamed passkey ${id} to "${name}"`;
      },
    },
  ],
  failureRoutes: [
    {
      match: exact("/sign-in/passkey"),
      message: (ctx) => `${userLabel(ctx)} failed passkey sign-in (${errorCode(ctx)})`,
    },
    {
      match: exact("/passkey/add-passkey"),
      message: (ctx) => `${userLabel(ctx)} failed to register passkey (${errorCode(ctx)})`,
    },
  ],
};
