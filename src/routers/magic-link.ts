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

export const magicLinkRouter: AuditRouter = {
  id: "magic-link",
  routes: [
    {
      match: exact("/sign-in/magic-link"),
      message: (ctx) => `Magic link sent to ${bodyEmail(ctx)}`,
    },
    {
      match: exact("/magic-link/verify"),
      message: (ctx) => `${userLabel(ctx)} verified magic link`,
    },
  ],
  failureRoutes: [
    {
      match: exact("/sign-in/magic-link"),
      message: (ctx) => `Failed magic link request for ${bodyEmail(ctx)} (${errorCode(ctx)})`,
    },
    {
      match: exact("/magic-link/verify"),
      message: (ctx) => `Failed magic link verification (${errorCode(ctx)})`,
    },
  ],
};
