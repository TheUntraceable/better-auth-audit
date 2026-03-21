import type { AuditRouter, MessageContext } from "../types";

function exact(target: string) {
  return (path: string) => path === target;
}

function errorCode(ctx: MessageContext): string {
  return ctx.errorCode ?? "UNKNOWN_ERROR";
}

export const oneTimeTokenRouter: AuditRouter = {
  id: "one-time-token",
  routes: [
    {
      match: exact("/one-time-token/generate"),
      message: (ctx) => "Generated a one-time token",
    },
    {
      match: exact("/one-time-token/verify"),
      message: (ctx) => "Verified a one-time token",
    },
  ],
  failureRoutes: [
    {
      match: exact("/one-time-token/verify"),
      message: (ctx) => `Failed one-time token verification (${errorCode(ctx)})`,
    },
  ],
};
