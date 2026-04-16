import type { AuditRouter } from "../types";
import { exact, describeError } from "./utils";

export const multiSessionRouter: AuditRouter = {
  id: "multi-session",
  routes: [
    {
      match: exact("/multi-session/set-active"),
      message: () => "Switched active session",
    },
    {
      match: exact("/multi-session/revoke"),
      message: () => `Revoked a device session`,
    },
  ],
  failureRoutes: [
    {
      match: exact("/multi-session/set-active"),
      message: (ctx) => `Failed to switch active session — ${describeError(ctx.errorCode)}`,
    },
    {
      match: exact("/multi-session/revoke"),
      message: (ctx) => `Failed to revoke device session — ${describeError(ctx.errorCode)}`,
    },
  ],
};
