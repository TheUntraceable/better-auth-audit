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

export const anonymousRouter: AuditRouter = {
  id: "anonymous",
  routes: [
    {
      match: exact("/sign-in/anonymous"),
      message: (ctx) => `Anonymous session created`,
    },
    {
      match: exact("/delete-anonymous-user"),
      message: (ctx) => `${userLabel(ctx)} deleted their anonymous account`,
    },
  ],
  failureRoutes: [
    {
      match: exact("/sign-in/anonymous"),
      message: (ctx) => `Failed anonymous sign-in (${errorCode(ctx)})`,
    },
  ],
};
