import type { AuditRouter } from "../types";
import { exact, errorCode } from "./utils";

export const oneTimeTokenRouter: AuditRouter = {
  id: "one-time-token",
  routes: [
    {
      match: exact("/one-time-token/generate"),
      message: () => "Generated a one-time token",
    },
    {
      match: exact("/one-time-token/verify"),
      message: () => "Verified a one-time token",
    },
  ],
  failureRoutes: [
    {
      match: exact("/one-time-token/verify"),
      message: (ctx) => `Failed one-time token verification (${errorCode(ctx)})`,
    },
  ],
};
