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
    {
      match: exact("/organization/add-member"),
      message: (ctx) => {
        const userId = ctx.body?.["userId"];
        const role = ctx.body?.["role"];
        return `${userLabel(ctx)} added user ${userId} as ${role ?? "member"}`;
      },
    },
    {
      match: exact("/organization/create-team"),
      message: (ctx) => {
        const name = ctx.body?.["name"];
        return `${userLabel(ctx)} created team "${name}"`;
      },
    },
    {
      match: exact("/organization/update-team"),
      message: (ctx) => {
        const teamId = ctx.body?.["teamId"];
        return `${userLabel(ctx)} updated team ${teamId}`;
      },
    },
    {
      match: exact("/organization/remove-team"),
      message: (ctx) => {
        const teamId = ctx.body?.["teamId"];
        return `${userLabel(ctx)} removed team ${teamId}`;
      },
    },
    {
      match: exact("/organization/add-team-member"),
      message: (ctx) => {
        const userId = ctx.body?.["userId"];
        const teamId = ctx.body?.["teamId"];
        return `${userLabel(ctx)} added user ${userId} to team ${teamId}`;
      },
    },
    {
      match: exact("/organization/remove-team-member"),
      message: (ctx) => {
        const userId = ctx.body?.["userId"];
        const teamId = ctx.body?.["teamId"];
        return `${userLabel(ctx)} removed user ${userId} from team ${teamId}`;
      },
    },
    {
      match: exact("/organization/set-active-team"),
      message: (ctx) => {
        const teamId = ctx.body?.["teamId"];
        return `${userLabel(ctx)} switched to team ${teamId}`;
      },
    },
    {
      match: exact("/organization/create-role"),
      message: (ctx) => {
        const roleName = ctx.body?.["roleName"];
        return `${userLabel(ctx)} created organization role "${roleName}"`;
      },
    },
    {
      match: exact("/organization/update-role"),
      message: (ctx) => {
        const roleId = ctx.body?.["roleId"];
        return `${userLabel(ctx)} updated organization role ${roleId}`;
      },
    },
    {
      match: exact("/organization/delete-role"),
      message: (ctx) => {
        const roleId = ctx.body?.["roleId"];
        return `${userLabel(ctx)} deleted organization role ${roleId}`;
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
    {
      match: exact("/organization/add-member"),
      message: (ctx) => {
        const userId = ctx.body?.["userId"];
        return `${userLabel(ctx)} failed to add user ${userId} — ${describeError(ctx.errorCode)}`;
      },
    },
    {
      match: exact("/organization/create-team"),
      message: (ctx) => `${userLabel(ctx)} failed to create team — ${describeError(ctx.errorCode)}`,
    },
    {
      match: exact("/organization/remove-team"),
      message: (ctx) => {
        const teamId = ctx.body?.["teamId"];
        return `${userLabel(ctx)} failed to remove team ${teamId} — ${describeError(ctx.errorCode)}`;
      },
    },
    {
      match: exact("/organization/add-team-member"),
      message: (ctx) => `${userLabel(ctx)} failed to add team member — ${describeError(ctx.errorCode)}`,
    },
    {
      match: exact("/organization/remove-team-member"),
      message: (ctx) => `${userLabel(ctx)} failed to remove team member — ${describeError(ctx.errorCode)}`,
    },
    {
      match: exact("/organization/create-role"),
      message: (ctx) => `${userLabel(ctx)} failed to create organization role — ${describeError(ctx.errorCode)}`,
    },
    {
      match: exact("/organization/delete-role"),
      message: (ctx) => {
        const roleId = ctx.body?.["roleId"];
        return `${userLabel(ctx)} failed to delete organization role ${roleId} — ${describeError(ctx.errorCode)}`;
      },
    },
  ],
};
