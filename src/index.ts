import type { BetterAuthPlugin } from "better-auth";
import {
  createAuthEndpoint,
  createAuthMiddleware,
  getSessionFromCtx,
} from "better-auth/api";
import * as z from "zod";
import { schema } from "./schema";
import { resolveRoutes } from "./router";
import type { AuditLogOptions, MessageContext } from "./types";

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
    return null; // API error
  }
  return returned;
}

export const auditLog = (options: AuditLogOptions = {}) => {
  const adminRoles = options.adminRoles ?? ["admin"];

  let routes: ReturnType<typeof resolveRoutes> = [];

  return {
    id: "audit-log",

    schema,

    init(ctx) {
      const installedPluginIds = (ctx.options.plugins ?? []).map(
        (p) => p.id,
      );
      routes = resolveRoutes(options, installedPluginIds);
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

            // Find a matching route handler
            const handler = routes.find((r) => r.match(path));
            if (!handler) return;

            // Build message context
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

            // Write audit log entry
            await ctx.context.adapter.create({
              model: "auditLog",
              data: {
                userId: user?.id ?? null,
                message,
                endpoint: path,
                ipAddress: getIpFromHeaders(ctx.headers as Headers | undefined),
                userAgent:
                  (ctx.headers as Headers | undefined)?.get("user-agent") ??
                  null,
                metadata: ctx.body ? JSON.stringify(ctx.body) : null,
              },
            });
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
            limit: z.coerce.number().optional().default(50),
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
            throw new Error("Unauthorized");
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
