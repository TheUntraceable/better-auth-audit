import type { AuditRouter } from "../types";
import { exact, errorCode } from "./utils";

export const multiSessionRouter: AuditRouter = {
  id: "multi-session",
  routes: [
    {
      match: exact("/multi-session/set-active"),
      message: () => "Switched active session",
    },
    {
      match: exact("/multi-session/revoke"),
      message: (ctx) => {
        const token = ctx.body?.["sessionToken"];
        return `Revoked device session ${token}`;
      },
    },
  ],
  failureRoutes: [
    {
      match: exact("/multi-session/set-active"),
      message: (ctx) => `Failed to switch active session (${errorCode(ctx)})`,
    },
    {
      match: exact("/multi-session/revoke"),
      message: (ctx) => `Failed to revoke device session (${errorCode(ctx)})`,
    },
  ],
};
