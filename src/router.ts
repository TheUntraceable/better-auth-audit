import type { AuditLogOptions, AuditRouteHandler, AuditRouter } from "./types";
import {
  baseRouter,
  twoFactorRouter,
  adminRouter,
  organizationRouter,
  passkeyRouter,
  magicLinkRouter,
  usernameRouter,
  anonymousRouter,
  phoneNumberRouter,
  apiKeyRouter,
  oneTimeTokenRouter,
  multiSessionRouter,
} from "./routers";

/** All built-in routers keyed by id */
const builtinRouters: Record<string, AuditRouter> = {
  [baseRouter.id]: baseRouter,
  [twoFactorRouter.id]: twoFactorRouter,
  [adminRouter.id]: adminRouter,
  [organizationRouter.id]: organizationRouter,
  [passkeyRouter.id]: passkeyRouter,
  [magicLinkRouter.id]: magicLinkRouter,
  [usernameRouter.id]: usernameRouter,
  [anonymousRouter.id]: anonymousRouter,
  [phoneNumberRouter.id]: phoneNumberRouter,
  [apiKeyRouter.id]: apiKeyRouter,
  [oneTimeTokenRouter.id]: oneTimeTokenRouter,
  [multiSessionRouter.id]: multiSessionRouter,
};

type ResolvedRoutes = {
  success: AuditRouteHandler[];
  failure: AuditRouteHandler[];
};

/**
 * Resolves the active set of route handlers based on plugin options
 * and which better-auth plugins are installed.
 */
export function resolveRoutes(
  options: AuditLogOptions,
  installedPluginIds: string[],
): ResolvedRoutes {
  const overrides = options.routers ?? {};
  const logFailures = options.logFailures !== false; // defaults to true

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

  return {
    success: activeRouters.flatMap((r) => r.routes),
    failure: logFailures
      ? activeRouters.flatMap((r) => r.failureRoutes ?? [])
      : [],
  };
}
