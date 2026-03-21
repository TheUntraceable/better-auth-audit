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
