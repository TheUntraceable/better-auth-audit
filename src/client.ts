import type { BetterAuthClientPlugin } from "better-auth/client";

export const auditLogClient = () => {
  return {
    id: "audit-log",
    $InferServerPlugin: {} as ReturnType<typeof import("./index").auditLog>,
    pathMethods: {
      "/audit-log/logs": "GET",
    },
  } satisfies BetterAuthClientPlugin;
};
