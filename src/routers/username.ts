import type { AuditRouter } from "../types";
import { userLabel, exact, errorCode } from "./utils";

export const usernameRouter: AuditRouter = {
  id: "username",
  routes: [
    {
      match: exact("/sign-in/username"),
      message: (ctx) => {
        const username = ctx.body?.["username"];
        return typeof username === "string"
          ? `${username} signed in via username`
          : `User signed in via username`;
      },
    },
  ],
  failureRoutes: [
    {
      match: exact("/sign-in/username"),
      message: (ctx) => {
        const username = ctx.body?.["username"];
        return typeof username === "string"
          ? `Failed sign-in attempt for username "${username}" (${errorCode(ctx)})`
          : `Failed username sign-in (${errorCode(ctx)})`;
      },
    },
  ],
};
