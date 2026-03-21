import type { AuditRouter, MessageContext } from "../types";

function userLabel(ctx: MessageContext): string {
  if (ctx.user?.email) return ctx.user.email;
  if (ctx.user?.name) return ctx.user.name;
  if (ctx.user?.id) return `user ${ctx.user.id}`;
  return "Unknown user";
}

function exact(target: string) {
  return (path: string) => path === target;
}

export const twoFactorRouter: AuditRouter = {
  id: "two-factor",
  routes: [
    {
      match: exact("/two-factor/enable"),
      message: (ctx) => `${userLabel(ctx)} enabled two-factor authentication`,
    },
    {
      match: exact("/two-factor/disable"),
      message: (ctx) => `${userLabel(ctx)} disabled two-factor authentication`,
    },
    {
      match: exact("/two-factor/get-totp-uri"),
      message: (ctx) => `${userLabel(ctx)} generated a TOTP URI`,
    },
    {
      match: exact("/two-factor/verify-totp"),
      message: (ctx) => `${userLabel(ctx)} verified via TOTP`,
    },
    {
      match: exact("/two-factor/send-otp"),
      message: (ctx) => `${userLabel(ctx)} requested a two-factor OTP`,
    },
    {
      match: exact("/two-factor/verify-otp"),
      message: (ctx) => `${userLabel(ctx)} verified via OTP`,
    },
    {
      match: exact("/two-factor/verify-backup-code"),
      message: (ctx) => `${userLabel(ctx)} verified via backup code`,
    },
    {
      match: exact("/two-factor/generate-backup-codes"),
      message: (ctx) => `${userLabel(ctx)} generated new backup codes`,
    },
  ],
};
