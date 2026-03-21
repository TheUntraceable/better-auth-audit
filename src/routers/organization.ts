import type { AuditRouter } from "../types";
import { userLabel, exact, describeError } from "./utils";

export const organizationRouter: AuditRouter = {
  id: "organization",
  routes: [
    {
      match: exact("/organization/create"),
      message: (ctx) => {
        const name = ctx.body?.["name"];
        return `${userLabel(ctx)} created organization "${name}"`;
      },
    },
    {
      match: exact("/organization/update"),
      message: (ctx) => {
        const orgId = ctx.body?.["organizationId"] ?? ctx.body?.["data"];
        return `${userLabel(ctx)} updated organization ${orgId}`;
      },
    },
    {
      match: exact("/organization/delete"),
      message: (ctx) => {
        const orgId = ctx.body?.["organizationId"];
        return `${userLabel(ctx)} deleted organization ${orgId}`;
      },
    },
    {
      match: exact("/organization/invite-member"),
      message: (ctx) => {
        const email = ctx.body?.["email"];
        const role = ctx.body?.["role"];
        return `${userLabel(ctx)} invited ${email} as ${role}`;
      },
    },
    {
      match: exact("/organization/accept-invitation"),
      message: (ctx) => `${userLabel(ctx)} accepted an organization invitation`,
    },
    {
      match: exact("/organization/cancel-invitation"),
      message: (ctx) => {
        const invitationId = ctx.body?.["invitationId"];
        return `${userLabel(ctx)} cancelled invitation ${invitationId}`;
      },
    },
    {
      match: exact("/organization/reject-invitation"),
      message: (ctx) => `${userLabel(ctx)} rejected an organization invitation`,
    },
    {
      match: exact("/organization/remove-member"),
      message: (ctx) => {
        const memberId = ctx.body?.["memberIdOrEmail"];
        return `${userLabel(ctx)} removed member ${memberId}`;
      },
    },
    {
      match: exact("/organization/update-member-role"),
      message: (ctx) => {
        const memberId = ctx.body?.["memberId"];
        const role = ctx.body?.["role"];
        return `${userLabel(ctx)} changed role of member ${memberId} to "${role}"`;
      },
    },
    {
      match: exact("/organization/set-active"),
      message: (ctx) => {
        const orgId = ctx.body?.["organizationId"];
        return `${userLabel(ctx)} switched to organization ${orgId}`;
      },
    },
    {
      match: exact("/organization/leave"),
      message: (ctx) => {
        const orgId = ctx.body?.["organizationId"];
        return `${userLabel(ctx)} left organization ${orgId}`;
      },
    },
  ],
  failureRoutes: [
    {
      match: exact("/organization/create"),
      message: (ctx) => `${userLabel(ctx)} failed to create organization — ${describeError(ctx.errorCode)}`,
    },
    {
      match: exact("/organization/invite-member"),
      message: (ctx) => {
        const email = ctx.body?.["email"];
        return `${userLabel(ctx)} failed to invite ${email} — ${describeError(ctx.errorCode)}`;
      },
    },
    {
      match: exact("/organization/accept-invitation"),
      message: (ctx) => `${userLabel(ctx)} failed to accept invitation — ${describeError(ctx.errorCode)}`,
    },
    {
      match: exact("/organization/remove-member"),
      message: (ctx) => {
        const memberId = ctx.body?.["memberIdOrEmail"];
        return `${userLabel(ctx)} failed to remove member ${memberId} — ${describeError(ctx.errorCode)}`;
      },
    },
    {
      match: exact("/organization/update-member-role"),
      message: (ctx) => `${userLabel(ctx)} failed to update member role — ${describeError(ctx.errorCode)}`,
    },
  ],
};
