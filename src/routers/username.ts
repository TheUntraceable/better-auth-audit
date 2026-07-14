import type { AuditRouter } from "../types";
import { userLabel, exact, fromBody, describeError } from "./utils";

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
      metadata: fromBody("username"),
    },
  ],
  failureRoutes: [
    {
      match: exact("/sign-in/username"),
      message: (ctx) => {
        const username = ctx.body?.["username"];
        return typeof username === "string"
          ? `Failed sign-in for username "${username}" — ${describeError(ctx.errorCode)}`
          : `Failed username sign-in — ${describeError(ctx.errorCode)}`;
      },
      metadata: fromBody("username"),
    },
  ],
};
