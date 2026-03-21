import type { AuditRouter } from "../types";
import { userLabel, exact, describeError } from "./utils";

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
          ? `Failed sign-in for username "${username}" — ${describeError(ctx.errorCode)}`
          : `Failed username sign-in — ${describeError(ctx.errorCode)}`;
      },
    },
  ],
};
