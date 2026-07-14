/**
 * How the endpoint was invoked:
 * - `"http"` — over HTTP via `auth.handler` (a client request).
 * - `"server"` — a direct `auth.api.*` call from server code.
 * - `"system"` — a direct `auth.api.*` call that self-identified as
 *   automation via the {@link AUDIT_SYSTEM_HEADER} header (cron jobs,
 *   cleanup tasks, migrations). Never inferred: anonymous server-side
 *   auth flows (e.g. a sign-in attempt from a server action) stay
 *   `"server"`.
 */
export type AuditSource = "http" | "server" | "system";

/**
 * Marks a direct `auth.api.*` call as automation. The value is a short
 * reason (e.g. "session-cleanup") stored in the entry's metadata as
 * `systemReason`. Ignored on HTTP requests so clients cannot spoof it —
 * but never forward untrusted client headers into `auth.api.*` calls,
 * or the marker loses that guarantee.
 */
export const AUDIT_SYSTEM_HEADER = "x-audit-system";

export type MessageContext = {
  /** The endpoint path, e.g. "/sign-in/email" */
  path: string;
  /** Whether the call came in over HTTP or via a direct `auth.api.*` call */
  source: AuditSource;
  /** Request body, if available */
  body?: Record<string, unknown>;
  /** The endpoint's returned data, if available */
  response?: unknown;
  /** Error code from APIError, if this is a failure event */
  errorCode?: string;
  /** User info from session, if available */
  user?: { id: string; email?: string; name?: string };
  /** Request headers */
  headers?: Headers;
};

export type AuditRouteHandler = {
  match: (path: string) => boolean;
  message: (ctx: MessageContext) => string | null;
  /**
   * Structured details stored in the entry's `metadata` column.
   * Never include secrets (passwords, tokens, OTP codes) here.
   */
  metadata?: (ctx: MessageContext) => Record<string, unknown> | null | undefined;
};

export type AuditRouter = {
  id: string;
  routes: AuditRouteHandler[];
  failureRoutes?: AuditRouteHandler[];
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

  /**
   * Log failed auth attempts (e.g. wrong password, invalid 2FA code).
   * Defaults to true.
   */
  logFailures?: boolean;

  /**
   * Log actions invoked directly on the server via `auth.api.*`
   * (no HTTP request involved). Governs both `source: "server"` and
   * `source: "system"` entries. Defaults to true.
   */
  logServerActions?: boolean;

  /**
   * Attach extra metadata to every audit entry. Merged over any
   * route-level metadata. Return null/undefined to add nothing.
   * Never include secrets (passwords, tokens, OTP codes).
   */
  metadata?: (ctx: MessageContext) => Record<string, unknown> | null | undefined;
};
