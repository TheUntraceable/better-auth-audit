import type { BetterAuthPlugin } from "better-auth";
import {
  createAuthEndpoint,
  createAuthMiddleware,
  getSessionFromCtx,
  getIp,
  isAPIError,
} from "better-auth/api";
import { APIError } from "better-auth";
import * as z from "zod";
import { schema } from "./schema";
import { resolveRoutes } from "./router";
import type { RouteMatcher } from "./router";
import {
  AUDIT_SYSTEM_HEADER,
  type AuditLogOptions,
  type AuditRouteHandler,
  type AuditSource,
  type MessageContext,
} from "./types";

export type {
  AuditLogOptions,
  AuditRouter,
  AuditRouteHandler,
  AuditSource,
  MessageContext,
} from "./types";
export { AUDIT_SYSTEM_HEADER } from "./types";
export {
  exact,
  fromBody,
  describeError,
  userLabel,
  bodyEmail,
  bodyPhone,
} from "./routers/utils";

type SessionData = {
  user?: { id: string; email?: string; name?: string };
  session?: { impersonatedBy?: string | null };
};

/** Extracts the returned data for a successful call, or null if there is
 * nothing readable (raw Response objects, API errors). */
function getEndpointResponse(ctx: { context: { returned?: unknown } }) {
  const returned = ctx.context.returned;
  if (!returned) return null;
  if (returned instanceof Response) return null; // can't synchronously read
  if (isAPIError(returned)) return null; // handled by failure routes instead
  return returned;
}

function getApiError(ctx: {
  context: { returned?: unknown };
}): { errorCode: string } | null {
  const returned = ctx.context.returned;
  if (!isAPIError(returned)) return null;
  const code = (returned.body as Record<string, unknown> | undefined)?.code;
  return { errorCode: typeof code === "string" ? code : "UNKNOWN" };
}

function buildMetadata(
  handler: AuditRouteHandler,
  msgCtx: MessageContext,
  session: SessionData | undefined,
  globalMetadata: AuditLogOptions["metadata"],
): Record<string, unknown> | null {
  const merged: Record<string, unknown> = {
    ...(handler.metadata?.(msgCtx) ?? undefined),
    ...(globalMetadata?.(msgCtx) ?? undefined),
  };
  const impersonatedBy = session?.session?.impersonatedBy;
  if (typeof impersonatedBy === "string") {
    merged.impersonatedBy = impersonatedBy;
  }
  if (msgCtx.source === "system") {
    const reason = msgCtx.headers?.get(AUDIT_SYSTEM_HEADER);
    if (reason) merged.systemReason = reason;
  }
  return Object.keys(merged).length > 0 ? merged : null;
}

export const auditLog = (options: AuditLogOptions = {}) => {
  const adminRoles = options.adminRoles ?? ["admin"];
  const logServerActions = options.logServerActions !== false; // defaults to true

  let successRoutes: RouteMatcher = () => undefined;
  let failureRoutes: RouteMatcher = () => undefined;

  return {
    id: "audit-log",

    schema,

    init(ctx) {
      const installedPluginIds = (ctx.options.plugins ?? []).map(
        (p) => p.id,
      );
      const resolved = resolveRoutes(options, installedPluginIds);
      successRoutes = resolved.success;
      failureRoutes = resolved.failure;
    },

    hooks: {
      after: [
        {
          matcher() {
            return true;
          },
          handler: createAuthMiddleware(async (ctx) => {
            const path: string | undefined = ctx.path;
            if (!path) return;

            // Direct auth.api.* calls carry no Request object; HTTP calls
            // through auth.handler always do. The system marker is only
            // honored off-HTTP so clients cannot spoof it.
            const source: AuditSource = ctx.request
              ? "http"
              : ctx.headers?.get(AUDIT_SYSTEM_HEADER)
                ? "system"
                : "server";
            if (source !== "http" && !logServerActions) return;

            const apiError = getApiError(ctx);
            const handler = apiError
              ? failureRoutes(path)
              : successRoutes(path);
            if (!handler) return;

            const session = (ctx.context.session ??
              ctx.context.newSession) as SessionData | undefined | null;
            const user = session?.user;

            const msgCtx: MessageContext = {
              path,
              source,
              body: ctx.body as Record<string, unknown> | undefined,
              response: apiError ? undefined : getEndpointResponse(ctx) ?? undefined,
              errorCode: apiError?.errorCode,
              user,
              headers: ctx.headers as Headers | undefined,
            };

            const message = handler.message(msgCtx);
            if (!message) return;

            const metadata = buildMetadata(
              handler,
              msgCtx,
              session ?? undefined,
              options.metadata,
            );

            const write = ctx.context.adapter
              .create({
                model: "auditLog",
                data: {
                  userId: user?.id ?? null,
                  message,
                  endpoint: path,
                  // Honors advanced.ipAddress config (custom headers,
                  // disableIpTracking, IPv6 normalization).
                  ipAddress: ctx.headers
                    ? getIp(ctx.headers, ctx.context.options)
                    : null,
                  userAgent: ctx.headers?.get("user-agent") ?? null,
                  metadata,
                  source,
                  success: !apiError,
                  errorCode: apiError?.errorCode ?? null,
                  createdAt: new Date(),
                },
              })
              .catch((err: unknown) => {
                ctx.context.logger.warn(
                  "[audit-log] Failed to write audit entry:",
                  err,
                );
              });

            // Awaits unless advanced.backgroundTasks.handler is configured.
            // Fire-and-forget dangles in serverless runtimes (Convex warns,
            // Vercel may kill the write after the response is sent).
            await ctx.context.runInBackgroundOrAwait(write);
          }),
        },
      ],
    },

    endpoints: {
      getAuditLogs: createAuthEndpoint(
        "/audit-log/logs",
        {
          method: "GET",
          query: z.object({
            limit: z.coerce.number().optional().default(50).pipe(z.number().max(200)),
            offset: z.coerce.number().optional().default(0),
            userId: z.string().optional(),
            endpoint: z.string().optional(),
            source: z.enum(["http", "server", "system"]).optional(),
            success: z
              .enum(["true", "false"])
              .transform((v) => v === "true")
              .optional(),
          }),
          requireHeaders: true,
          metadata: {
            openapi: {
              operationId: "getAuditLogs",
              summary: "Get audit logs",
              description:
                "Returns audit logs for the current user. Admins can view all logs or filter by userId. Supports filtering by endpoint, source and success.",
              responses: {
                200: {
                  description: "Audit log entries",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          logs: {
                            type: "array",
                            items: { $ref: "#/components/schemas/AuditLog" },
                          },
                          total: { type: "number" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        async (ctx) => {
          const session = await getSessionFromCtx(ctx);
          if (!session) {
            throw new APIError("UNAUTHORIZED", {
              message: "Unauthorized",
            });
          }

          const currentUser = session.user as {
            id: string;
            role?: string;
          };

          // Determine if user is admin
          const roles = (currentUser.role ?? "user").split(",");
          const isAdmin = roles.some((r) => adminRoles.includes(r.trim()));

          const { limit, offset, userId, endpoint, source, success } =
            ctx.query;

          // Tenant isolation: non-admins can only see their own logs
          const where: { field: string; value: string | boolean }[] = [];

          if (isAdmin && userId) {
            // Admin filtering by specific user
            where.push({ field: "userId", value: userId });
          } else if (!isAdmin) {
            // Regular user — only their own logs
            where.push({ field: "userId", value: currentUser.id });
          }
          // If admin with no userId filter — return all logs

          if (endpoint) where.push({ field: "endpoint", value: endpoint });
          if (source) where.push({ field: "source", value: source });
          if (success !== undefined) {
            where.push({ field: "success", value: success });
          }

          const [logs, total] = await Promise.all([
            ctx.context.adapter.findMany({
              model: "auditLog",
              where: where.length > 0 ? where : undefined,
              limit,
              offset,
              sortBy: { field: "createdAt", direction: "desc" },
            }),
            ctx.context.adapter.count({
              model: "auditLog",
              where: where.length > 0 ? where : undefined,
            }),
          ]);

          return ctx.json({ logs, total });
        },
      ),
    },
  } satisfies BetterAuthPlugin;
};
