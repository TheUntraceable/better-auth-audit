import type { AuditRouter } from "../types";
import {
  bodyEmail,
  describeError,
  exact,
  fromBody,
  userLabel,
} from "./utils";

export const emailOtpRouter: AuditRouter = {
  id: "email-otp",
  routes: [
    {
      match: exact("/email-otp/send-verification-otp"),
      message: (ctx) => {
        const type = ctx.body?.["type"] ?? "verification";
        return `${bodyEmail(ctx)} requested an email OTP for ${type}`;
      },
      metadata: fromBody("type"),
    },
    {
      match: exact("/email-otp/check-verification-otp"),
      message: (ctx) => `${bodyEmail(ctx)} passed an email OTP check`,
      metadata: fromBody("type"),
    },
    {
      match: exact("/email-otp/verify-email"),
      message: (ctx) => `${bodyEmail(ctx)} verified their email via OTP`,
    },
    {
      match: exact("/sign-in/email-otp"),
      message: (ctx) => `${bodyEmail(ctx)} signed in via email OTP`,
    },
    {
      match: exact("/email-otp/request-password-reset"),
      message: (ctx) =>
        `Password reset via email OTP requested for ${bodyEmail(ctx)}`,
    },
    {
      match: exact("/forget-password/email-otp"),
      message: (ctx) =>
        `Password reset via email OTP requested for ${bodyEmail(ctx)}`,
    },
    {
      match: exact("/email-otp/reset-password"),
      message: (ctx) =>
        `Password was reset via email OTP for ${bodyEmail(ctx)}`,
    },
    {
      match: exact("/email-otp/request-email-change"),
      message: (ctx) =>
        `${userLabel(ctx)} requested an email change via OTP`,
    },
    {
      match: exact("/email-otp/change-email"),
      message: (ctx) => `${userLabel(ctx)} changed their email via OTP`,
    },
  ],
  failureRoutes: [
    {
      match: exact("/email-otp/send-verification-otp"),
      message: (ctx) =>
        `Failed to send an email OTP to ${bodyEmail(ctx)} — ${describeError(ctx.errorCode)}`,
      metadata: fromBody("type"),
    },
    {
      match: exact("/email-otp/check-verification-otp"),
      message: (ctx) =>
        `${bodyEmail(ctx)} failed an email OTP check — ${describeError(ctx.errorCode)}`,
      metadata: fromBody("type"),
    },
    {
      match: exact("/email-otp/verify-email"),
      message: (ctx) =>
        `${bodyEmail(ctx)} failed email verification via OTP — ${describeError(ctx.errorCode)}`,
    },
    {
      match: exact("/sign-in/email-otp"),
      message: (ctx) =>
        `Failed email OTP sign-in for ${bodyEmail(ctx)} — ${describeError(ctx.errorCode)}`,
    },
    {
      match: exact("/email-otp/reset-password"),
      message: (ctx) =>
        `Password reset via email OTP failed for ${bodyEmail(ctx)} — ${describeError(ctx.errorCode)}`,
    },
    {
      match: exact("/email-otp/change-email"),
      message: (ctx) =>
        `${userLabel(ctx)} failed to change their email via OTP — ${describeError(ctx.errorCode)}`,
    },
  ],
};
