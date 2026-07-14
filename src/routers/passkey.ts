import type { AuditRouter } from "../types";
import { userLabel, exact, fromBody, describeError } from "./utils";

export const passkeyRouter: AuditRouter = {
  id: "passkey",
  routes: [
    {
      match: exact("/sign-in/passkey"),
      message: (ctx) => `${userLabel(ctx)} signed in via passkey`,
    },
    {
      match: exact("/passkey/add-passkey"),
      message: (ctx) => {
        const name = ctx.body?.["name"];
        return name
          ? `${userLabel(ctx)} registered passkey "${name}"`
          : `${userLabel(ctx)} registered a new passkey`;
      },
      metadata: fromBody("name"),
    },
    {
      match: exact("/passkey/delete-passkey"),
      message: (ctx) => {
        const id = ctx.body?.["id"];
        return `${userLabel(ctx)} deleted passkey ${id}`;
      },
      metadata: fromBody("id"),
    },
    {
      match: exact("/passkey/update-passkey"),
      message: (ctx) => {
        const id = ctx.body?.["id"];
        const name = ctx.body?.["name"];
        return `${userLabel(ctx)} renamed passkey ${id} to "${name}"`;
      },
      metadata: fromBody("id", "name"),
    },
  ],
  failureRoutes: [
    {
      match: exact("/sign-in/passkey"),
      message: (ctx) => `${userLabel(ctx)} failed passkey sign-in — ${describeError(ctx.errorCode)}`,
    },
    {
      match: exact("/passkey/add-passkey"),
      message: (ctx) => `${userLabel(ctx)} failed to register passkey — ${describeError(ctx.errorCode)}`,
    },
  ],
};
