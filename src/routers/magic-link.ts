import type { AuditRouter } from "../types";
import { userLabel, bodyEmail, exact, describeError } from "./utils";

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
      message: (ctx) => `Failed magic link request for ${bodyEmail(ctx)} — ${describeError(ctx.errorCode)}`,
    },
    {
      match: exact("/magic-link/verify"),
      message: (ctx) => `Failed magic link verification — ${describeError(ctx.errorCode)}`,
    },
  ],
};
