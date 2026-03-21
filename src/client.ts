import type { BetterAuthClientPlugin } from "better-auth/client";
import type { auditLog } from "./index";
export const auditLogClient = () => {
  return {
    id: "audit-log",
    $InferServerPlugin: {} as ReturnType<typeof auditLog>,
    pathMethods: {
      "/audit-log/logs": "GET",
    },
  } satisfies BetterAuthClientPlugin;
};
