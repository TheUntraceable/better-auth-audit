import type { AuditRouter, MessageContext } from "../types";

function userLabel(ctx: MessageContext): string {
  if (ctx.user?.email) return ctx.user.email;
  if (ctx.user?.name) return ctx.user.name;
  if (ctx.user?.id) return `user ${ctx.user.id}`;
  return "Unknown user";
}

function bodyPhone(ctx: MessageContext): string {
  const phone = ctx.body?.["phoneNumber"];
  return typeof phone === "string" ? phone : "unknown";
}

function exact(target: string) {
  return (path: string) => path === target;
}

function errorCode(ctx: MessageContext): string {
  return ctx.errorCode ?? "UNKNOWN_ERROR";
}

export const phoneNumberRouter: AuditRouter = {
  id: "phone-number",
  routes: [
    {
      match: exact("/sign-in/phone-number"),
      message: (ctx) => `Signed in via phone number ${bodyPhone(ctx)}`,
    },
    {
      match: exact("/phone-number/send-otp"),
      message: (ctx) => `OTP sent to ${bodyPhone(ctx)}`,
    },
    {
      match: exact("/phone-number/verify"),
      message: (ctx) => `${bodyPhone(ctx)} verified via OTP`,
    },
    {
      match: exact("/phone-number/request-password-reset"),
      message: (ctx) => `Password reset OTP sent to ${bodyPhone(ctx)}`,
    },
    {
      match: exact("/phone-number/reset-password"),
      message: (ctx) => `Password reset via phone OTP for ${bodyPhone(ctx)}`,
    },
  ],
  failureRoutes: [
    {
      match: exact("/sign-in/phone-number"),
      message: (ctx) => `Failed sign-in for phone ${bodyPhone(ctx)} (${errorCode(ctx)})`,
    },
    {
      match: exact("/phone-number/verify"),
      message: (ctx) => `Failed OTP verification for ${bodyPhone(ctx)} (${errorCode(ctx)})`,
    },
    {
      match: exact("/phone-number/send-otp"),
      message: (ctx) => `Failed to send OTP to ${bodyPhone(ctx)} (${errorCode(ctx)})`,
    },
    {
      match: exact("/phone-number/reset-password"),
      message: (ctx) => `Failed phone password reset for ${bodyPhone(ctx)} (${errorCode(ctx)})`,
    },
  ],
};
