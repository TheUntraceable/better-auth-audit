import type { BetterAuthPlugin } from "better-auth";

export const auditLog = () => {
  return {
    id: "audit-log",
  } satisfies BetterAuthPlugin;
};
