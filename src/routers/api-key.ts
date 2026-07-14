import type { AuditRouter } from "../types";
import { userLabel, exact, fromBody, describeError } from "./utils";

export const apiKeyRouter: AuditRouter = {
  id: "api-key",
  routes: [
    {
      match: exact("/api-key/create"),
      message: (ctx) => {
        const name = ctx.body?.["name"];
        return name
          ? `${userLabel(ctx)} created API key "${name}"`
          : `${userLabel(ctx)} created an API key`;
      },
      metadata: fromBody("name", "prefix"),
    },
    {
      match: exact("/api-key/update"),
      message: (ctx) => {
        const keyId = ctx.body?.["keyId"];
        return `${userLabel(ctx)} updated API key ${keyId}`;
      },
      metadata: fromBody("keyId", "name"),
    },
    {
      match: exact("/api-key/delete"),
      message: (ctx) => {
        const keyId = ctx.body?.["keyId"];
        return `${userLabel(ctx)} deleted API key ${keyId}`;
      },
      metadata: fromBody("keyId"),
    },
  ],
  failureRoutes: [
    {
      match: exact("/api-key/create"),
      message: (ctx) => `${userLabel(ctx)} failed to create API key — ${describeError(ctx.errorCode)}`,
    },
  ],
};
