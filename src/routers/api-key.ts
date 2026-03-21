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

export const apiKeyRouter: AuditRouter = {
  id: "api-key",
  routes: [
    {
      match: exact("/api-key/create"),
      message: (ctx) => {
        const name = ctx.body?.["name"];
        return name
          ? `${userLabel(ctx)} created API key "${name}"`
          : `${userLabel(ctx)} created an API key`;
      },
    },
    {
      match: exact("/api-key/update"),
      message: (ctx) => {
        const keyId = ctx.body?.["keyId"];
        return `${userLabel(ctx)} updated API key ${keyId}`;
      },
    },
    {
      match: exact("/api-key/delete"),
      message: (ctx) => {
        const keyId = ctx.body?.["keyId"];
        return `${userLabel(ctx)} deleted API key ${keyId}`;
      },
    },
  ],
  failureRoutes: [
    {
      match: exact("/api-key/create"),
      message: (ctx) => `${userLabel(ctx)} failed to create API key (${errorCode(ctx)})`,
    },
  ],
};
