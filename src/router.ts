import type { AuditLogOptions, AuditRouteHandler, AuditRouter } from "./types";
import type { PathMatcher } from "./routers/utils";
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

/** Finds the handler for a path, or `undefined` if none matches. */
export type RouteMatcher = (path: string) => AuditRouteHandler | undefined;

type ResolvedRoutes = {
  success: RouteMatcher;
  failure: RouteMatcher;
};

/**
 * Compiles a flat list of handlers into a fast matcher. Handlers created with
 * `exact()` are indexed by their literal path for O(1) lookup; any remaining
 * (prefix/custom) matchers fall back to a linear scan. First match wins, so
 * the original array order is preserved within each tier.
 */
function compileMatcher(handlers: AuditRouteHandler[]): RouteMatcher {
  const exactMap = new Map<string, AuditRouteHandler>();
  const fallback: AuditRouteHandler[] = [];

  for (const handler of handlers) {
    const exactPath = (handler.match as PathMatcher).exactPath;
    if (typeof exactPath === "string") {
      if (!exactMap.has(exactPath)) exactMap.set(exactPath, handler);
    } else {
      fallback.push(handler);
    }
  }

  return (path) => exactMap.get(path) ?? fallback.find((h) => h.match(path));
}

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
    success: compileMatcher(activeRouters.flatMap((r) => r.routes)),
    failure: compileMatcher(
      logFailures ? activeRouters.flatMap((r) => r.failureRoutes ?? []) : [],
    ),
  };
}
