import type { BetterAuthPlugin } from "better-auth";
import {
  createAuthEndpoint,
  createAuthMiddleware,
  getSessionFromCtx,
} from "better-auth/api";
import { APIError } from "better-auth";
import * as z from "zod";
import { schema } from "./schema";
import { resolveRoutes } from "./router";
import type { AuditLogOptions, AuditRouteHandler, MessageContext } from "./types";

export type { AuditLogOptions, AuditRouter, AuditRouteHandler, MessageContext } from "./types";

function getIpFromHeaders(headers?: Headers): string | undefined {
  if (!headers) return undefined;
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    undefined
  );
}

function getEndpointResponse(ctx: { context: { returned?: unknown } }) {
  const returned = ctx.context.returned;
  if (!returned) return null;
  if (returned instanceof Response) {
    return null; // can't synchronously read — skip for error responses
  }
  if (typeof returned === "object" && returned !== null && "statusCode" in returned) {
    return null; // API error — handled by failure routes instead
  }
  return returned;
}

function getApiError(ctx: {
  context: { returned?: unknown };
}): { errorCode: string | null } | null {
  const returned = ctx.context.returned;
  if (!returned) return null;
  if (returned instanceof Response) return null;
  if (
    typeof returned === "object" &&
    returned !== null &&
    "statusCode" in returned &&
    "body" in returned
  ) {
    const body = (returned as Record<string, unknown>).body;
    const code =
      typeof body === "object" && body !== null && "code" in body
        ? (body as Record<string, unknown>).code
        : null;
    return { errorCode: typeof code === "string" ? code : "UNKNOWN" };
  }
  return null;
}

function writeAuditEntry(ctx: Record<string, any>, data: {
  message: string;
  success: boolean;
  errorCode?: string | null;
}) {
  const session = ctx.context?.session ?? ctx.context?.newSession;
  const userId = session?.user?.id;

  return ctx.context.adapter.create({
    model: "auditLog",
    data: {
      userId: userId ?? null,
      message: data.message,
      endpoint: ctx.path,
      ipAddress: getIpFromHeaders(ctx.headers),
      userAgent: ctx.headers?.get("user-agent") ?? null,
      metadata: null,
      success: data.success,
      errorCode: data.errorCode ?? null,
      createdAt: new Date(),
    },
  });
}

export const auditLog = (options: AuditLogOptions = {}) => {
  const adminRoles = options.adminRoles ?? ["admin"];

  let successRoutes: AuditRouteHandler[] = [];
  let failureRoutes: AuditRouteHandler[] = [];

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

            const apiError = getApiError(ctx);

            if (apiError) {
              // This is a failure — find a matching failure route
              const handler = failureRoutes.find((r) => r.match(path));
              if (!handler) return;

              const session = ctx.context.session ?? ctx.context.newSession;
              const user = session?.user as
                | { id: string; email?: string; name?: string }
                | undefined;

              const msgCtx: MessageContext = {
                path,
                body: ctx.body as Record<string, unknown> | undefined,
                errorCode: apiError.errorCode ?? undefined,
                user,
                headers: ctx.headers as Headers | undefined,
              };

              const message = handler.message(msgCtx);
              if (!message) return;

              ctx.context.runInBackground(
                writeAuditEntry(ctx, {
                  message,
                  success: false,
                  errorCode: apiError.errorCode,
                }).catch((err: unknown) => {
                  ctx.context.logger.warn(
                    "[audit-log] Failed to write failure entry:",
                    err,
                  );
                }),
              );
            } else {
              // This is a success — find a matching success route
              const handler = successRoutes.find((r) => r.match(path));
              if (!handler) return;

              const session = ctx.context.session ?? ctx.context.newSession;
              const user = session?.user as
                | { id: string; email?: string; name?: string }
                | undefined;

              const response = getEndpointResponse(ctx);

              const msgCtx: MessageContext = {
                path,
                body: ctx.body as Record<string, unknown> | undefined,
                response: response ?? undefined,
                user,
                headers: ctx.headers as Headers | undefined,
              };

              const message = handler.message(msgCtx);
              if (!message) return;

              ctx.context.runInBackground(
                writeAuditEntry(ctx, {
                  message,
                  success: true,
                }).catch((err: unknown) => {
                  ctx.context.logger.warn(
                    "[audit-log] Failed to write success entry:",
                    err,
                  );
                }),
              );
            }
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
          }),
          requireHeaders: true,
          metadata: {
            openapi: {
              operationId: "getAuditLogs",
              summary: "Get audit logs",
              description:
                "Returns audit logs for the current user. Admins can view all logs or filter by userId.",
              responses: {
                200: {
                  description: "Audit log entries",
                  content: {
                    "application/json": {
                      schema: {
                        type: "array",
                        items: { $ref: "#/components/schemas/AuditLog" },
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

          const { limit, offset, userId } = ctx.query;

          // Tenant isolation: non-admins can only see their own logs
          const where = [];

          if (isAdmin && userId) {
            // Admin filtering by specific user
            where.push({ field: "userId", value: userId });
          } else if (!isAdmin) {
            // Regular user — only their own logs
            where.push({ field: "userId", value: currentUser.id });
          }
          // If admin with no userId filter — return all logs

          const logs = await ctx.context.adapter.findMany({
            model: "auditLog",
            where: where.length > 0 ? where : undefined,
            limit,
            offset,
            sortBy: { field: "createdAt", direction: "desc" },
          });

          return ctx.json(logs);
        },
      ),
    },
  } satisfies BetterAuthPlugin;
};
