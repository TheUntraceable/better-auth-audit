import type { BetterAuthPlugin } from "better-auth";

type PluginSchema = NonNullable<BetterAuthPlugin["schema"]>;

export const schema = {
  auditLog: {
    modelName: "audit_log",
    fields: {
      userId: {
        type: "string",
        required: false,
        references: { model: "user", field: "id", onDelete: "set null" },
        index: true,
      },
      message: {
        type: "string",
        required: true,
      },
      endpoint: {
        type: "string",
        required: true,
      },
      ipAddress: {
        type: "string",
        required: false,
      },
      userAgent: {
        type: "string",
        required: false,
      },
      metadata: {
        type: "json",
        required: false,
      },
      success: {
        type: "boolean",
        required: true,
        input: false,
      },
      errorCode: {
        type: "string",
        required: false,
      },
      createdAt: {
        type: "date",
        required: true,
        input: false,
      },
    },
  },
} satisfies PluginSchema;
