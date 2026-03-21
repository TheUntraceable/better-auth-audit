import type { AuditRouter } from "../types";
import { userLabel, exact, errorCode } from "./utils";

export const anonymousRouter: AuditRouter = {
  id: "anonymous",
  routes: [
    {
      match: exact("/sign-in/anonymous"),
      message: (_ctx) => `Anonymous session created`,
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
