import type { BetterAuthClientPlugin } from "better-auth/client";

export const auditLogClient = () => {
  return {
    id: "audit-log",
  } satisfies BetterAuthClientPlugin;
};
