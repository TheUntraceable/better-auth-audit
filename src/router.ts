import type { AuditLogOptions, AuditRouteHandler, AuditRouter } from "./types";
import { baseRouter, twoFactorRouter } from "./routers";

/** All built-in routers keyed by id */
const builtinRouters: Record<string, AuditRouter> = {
  [baseRouter.id]: baseRouter,
  [twoFactorRouter.id]: twoFactorRouter,
};

/**
 * Resolves the active set of route handlers based on plugin options
 * and which better-auth plugins are installed.
 */
export function resolveRoutes(
  options: AuditLogOptions,
  installedPluginIds: string[],
): AuditRouteHandler[] {
  const overrides = options.routers ?? {};

  const activeRouters: AuditRouter[] = [];

  for (const [id, router] of Object.entries(builtinRouters)) {
    // If explicitly overridden, respect that
    if (id in overrides) {
      if (overrides[id]) activeRouters.push(router);
      continue;
    }

    // "base" is always enabled by default
    if (id === "base") {
      activeRouters.push(router);
      continue;
    }

    // For plugin-specific routers, auto-enable if the plugin is installed
    if (installedPluginIds.includes(id)) {
      activeRouters.push(router);
    }
  }

  // Add any custom routers the user provided
  if (options.customRouters) {
    for (const router of options.customRouters) {
      const override = overrides[router.id];
      if (override === false) continue;
      activeRouters.push(router);
    }
  }

  return activeRouters.flatMap((r) => r.routes);
}
