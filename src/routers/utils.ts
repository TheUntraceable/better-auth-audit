import type { MessageContext } from "../types";

export function userLabel(ctx: MessageContext): string {
  if (ctx.user?.email) return ctx.user.email;
  if (ctx.user?.name) return ctx.user.name;
  if (ctx.user?.id) return `user ${ctx.user.id}`;
  return "Unknown user";
}

export function bodyEmail(ctx: MessageContext): string {
  const email = ctx.body?.["email"];
  return typeof email === "string" ? email : "unknown";
}

export function bodyPhone(ctx: MessageContext): string {
  const phone = ctx.body?.["phoneNumber"];
  return typeof phone === "string" ? phone : "unknown";
}

export function exact(target: string) {
  return (path: string) => path === target;
}

export function errorCode(ctx: MessageContext): string {
  return ctx.errorCode ?? "UNKNOWN_ERROR";
}
