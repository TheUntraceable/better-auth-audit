import type { AuditRouter } from "../types";
import { userLabel, exact, fromBody, describeError } from "./utils";

export const organizationRouter: AuditRouter = {
  id: "organization",
  routes: [
    {
      match: exact("/organization/create"),
      message: (ctx) => {
        const name = ctx.body?.["name"];
        return `${userLabel(ctx)} created organization "${name}"`;
      },
      metadata: fromBody("name", "slug"),
    },
    {
      match: exact("/organization/update"),
      message: (ctx) => {
        const orgId = ctx.body?.["organizationId"];
        return orgId
          ? `${userLabel(ctx)} updated organization ${orgId}`
          : `${userLabel(ctx)} updated their active organization`;
      },
      metadata: fromBody("organizationId"),
    },
    {
      match: exact("/organization/delete"),
      message: (ctx) => {
        const orgId = ctx.body?.["organizationId"];
        return `${userLabel(ctx)} deleted organization ${orgId}`;
      },
      metadata: fromBody("organizationId"),
    },
    {
      match: exact("/organization/invite-member"),
      message: (ctx) => {
        const email = ctx.body?.["email"];
        const role = ctx.body?.["role"];
        return `${userLabel(ctx)} invited ${email} as ${role}`;
      },
      metadata: fromBody("email", "role", "organizationId", "teamId"),
    },
    {
      match: exact("/organization/accept-invitation"),
      message: (ctx) => `${userLabel(ctx)} accepted an organization invitation`,
      metadata: fromBody("invitationId"),
    },
    {
      match: exact("/organization/cancel-invitation"),
      message: (ctx) => {
        const invitationId = ctx.body?.["invitationId"];
        return `${userLabel(ctx)} cancelled invitation ${invitationId}`;
      },
      metadata: fromBody("invitationId"),
    },
    {
      match: exact("/organization/reject-invitation"),
      message: (ctx) => `${userLabel(ctx)} rejected an organization invitation`,
      metadata: fromBody("invitationId"),
    },
    {
      match: exact("/organization/remove-member"),
      message: (ctx) => {
        const memberId = ctx.body?.["memberIdOrEmail"];
        return `${userLabel(ctx)} removed member ${memberId}`;
      },
      metadata: fromBody("memberIdOrEmail", "organizationId"),
    },
    {
      match: exact("/organization/update-member-role"),
      message: (ctx) => {
        const memberId = ctx.body?.["memberId"];
        const role = ctx.body?.["role"];
        return `${userLabel(ctx)} changed role of member ${memberId} to "${role}"`;
      },
      metadata: fromBody("memberId", "role", "organizationId"),
    },
    {
      match: exact("/organization/set-active"),
      message: (ctx) => {
        const orgId = ctx.body?.["organizationId"];
        return `${userLabel(ctx)} switched to organization ${orgId}`;
      },
      metadata: fromBody("organizationId", "organizationSlug"),
    },
    {
      match: exact("/organization/leave"),
      message: (ctx) => {
        const orgId = ctx.body?.["organizationId"];
        return `${userLabel(ctx)} left organization ${orgId}`;
      },
      metadata: fromBody("organizationId"),
    },
    {
      match: exact("/organization/add-member"),
      message: (ctx) => {
        const userId = ctx.body?.["userId"];
        const role = ctx.body?.["role"];
        return `${userLabel(ctx)} added user ${userId} as ${role ?? "member"}`;
      },
      metadata: fromBody("userId", "role", "organizationId", "teamId"),
    },
    {
      match: exact("/organization/create-team"),
      message: (ctx) => {
        const name = ctx.body?.["name"];
        return `${userLabel(ctx)} created team "${name}"`;
      },
      metadata: fromBody("name", "organizationId"),
    },
    {
      match: exact("/organization/update-team"),
      message: (ctx) => {
        const teamId = ctx.body?.["teamId"];
        return `${userLabel(ctx)} updated team ${teamId}`;
      },
      metadata: fromBody("teamId"),
    },
    {
      match: exact("/organization/remove-team"),
      message: (ctx) => {
        const teamId = ctx.body?.["teamId"];
        return `${userLabel(ctx)} removed team ${teamId}`;
      },
      metadata: fromBody("teamId", "organizationId"),
    },
    {
      match: exact("/organization/add-team-member"),
      message: (ctx) => {
        const userId = ctx.body?.["userId"];
        const teamId = ctx.body?.["teamId"];
        return `${userLabel(ctx)} added user ${userId} to team ${teamId}`;
      },
      metadata: fromBody("userId", "teamId"),
    },
    {
      match: exact("/organization/remove-team-member"),
      message: (ctx) => {
        const userId = ctx.body?.["userId"];
        const teamId = ctx.body?.["teamId"];
        return `${userLabel(ctx)} removed user ${userId} from team ${teamId}`;
      },
      metadata: fromBody("userId", "teamId"),
    },
    {
      match: exact("/organization/set-active-team"),
      message: (ctx) => {
        const teamId = ctx.body?.["teamId"];
        return `${userLabel(ctx)} switched to team ${teamId}`;
      },
      metadata: fromBody("teamId"),
    },
    {
      match: exact("/organization/create-role"),
      message: (ctx) => {
        const roleName = ctx.body?.["roleName"];
        return `${userLabel(ctx)} created organization role "${roleName}"`;
      },
      metadata: fromBody("roleName", "organizationId"),
    },
    {
      match: exact("/organization/update-role"),
      message: (ctx) => {
        const roleId = ctx.body?.["roleId"];
        return `${userLabel(ctx)} updated organization role ${roleId}`;
      },
      metadata: fromBody("roleId", "organizationId"),
    },
    {
      match: exact("/organization/delete-role"),
      message: (ctx) => {
        const roleId = ctx.body?.["roleId"];
        return `${userLabel(ctx)} deleted organization role ${roleId}`;
      },
      metadata: fromBody("roleId", "organizationId"),
    },
  ],
  failureRoutes: [
    {
      match: exact("/organization/create"),
      message: (ctx) => `${userLabel(ctx)} failed to create organization — ${describeError(ctx.errorCode)}`,
      metadata: fromBody("name", "slug"),
    },
    {
      match: exact("/organization/invite-member"),
      message: (ctx) => {
        const email = ctx.body?.["email"];
        return `${userLabel(ctx)} failed to invite ${email} — ${describeError(ctx.errorCode)}`;
      },
      metadata: fromBody("email", "role", "organizationId"),
    },
    {
      match: exact("/organization/accept-invitation"),
      message: (ctx) => `${userLabel(ctx)} failed to accept invitation — ${describeError(ctx.errorCode)}`,
      metadata: fromBody("invitationId"),
    },
    {
      match: exact("/organization/remove-member"),
      message: (ctx) => {
        const memberId = ctx.body?.["memberIdOrEmail"];
        return `${userLabel(ctx)} failed to remove member ${memberId} — ${describeError(ctx.errorCode)}`;
      },
      metadata: fromBody("memberIdOrEmail", "organizationId"),
    },
    {
      match: exact("/organization/update-member-role"),
      message: (ctx) => `${userLabel(ctx)} failed to update member role — ${describeError(ctx.errorCode)}`,
      metadata: fromBody("memberId", "role", "organizationId"),
    },
    {
      match: exact("/organization/add-member"),
      message: (ctx) => {
        const userId = ctx.body?.["userId"];
        return `${userLabel(ctx)} failed to add user ${userId} — ${describeError(ctx.errorCode)}`;
      },
      metadata: fromBody("userId", "role", "organizationId"),
    },
    {
      match: exact("/organization/create-team"),
      message: (ctx) => `${userLabel(ctx)} failed to create team — ${describeError(ctx.errorCode)}`,
      metadata: fromBody("name", "organizationId"),
    },
    {
      match: exact("/organization/remove-team"),
      message: (ctx) => {
        const teamId = ctx.body?.["teamId"];
        return `${userLabel(ctx)} failed to remove team ${teamId} — ${describeError(ctx.errorCode)}`;
      },
      metadata: fromBody("teamId", "organizationId"),
    },
    {
      match: exact("/organization/add-team-member"),
      message: (ctx) => `${userLabel(ctx)} failed to add team member — ${describeError(ctx.errorCode)}`,
      metadata: fromBody("userId", "teamId"),
    },
    {
      match: exact("/organization/remove-team-member"),
      message: (ctx) => `${userLabel(ctx)} failed to remove team member — ${describeError(ctx.errorCode)}`,
      metadata: fromBody("userId", "teamId"),
    },
    {
      match: exact("/organization/create-role"),
      message: (ctx) => `${userLabel(ctx)} failed to create organization role — ${describeError(ctx.errorCode)}`,
      metadata: fromBody("roleName", "organizationId"),
    },
    {
      match: exact("/organization/delete-role"),
      message: (ctx) => {
        const roleId = ctx.body?.["roleId"];
        return `${userLabel(ctx)} failed to delete organization role ${roleId} — ${describeError(ctx.errorCode)}`;
      },
      metadata: fromBody("roleId", "organizationId"),
    },
  ],
};
