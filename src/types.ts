export type MessageContext = {
  /** The endpoint path, e.g. "/sign-in/email" */
  path: string;
  /** Request body, if available */
  body?: Record<string, unknown>;
  /** The endpoint's returned data, if available */
  response?: unknown;
  /** User info from session, if available */
  user?: { id: string; email?: string; name?: string };
  /** Request headers */
  headers?: Headers;
};

export type AuditRouteHandler = {
  match: (path: string) => boolean;
  message: (ctx: MessageContext) => string | null;
};

export type AuditRouter = {
  id: string;
  routes: AuditRouteHandler[];
};

export type AuditLogOptions = {
  /**
   * Explicitly enable or disable specific routers by their id.
   * If not specified, routers are auto-detected based on installed plugins.
   * Example: { base: true, twoFactor: false }
   */
  routers?: Record<string, boolean>;

  /**
   * Custom routers to add alongside the built-in ones.
   */
  customRouters?: AuditRouter[];

  /**
   * Admin role names that can view all audit logs.
   * Defaults to ["admin"].
   */
  adminRoles?: string[];
};
