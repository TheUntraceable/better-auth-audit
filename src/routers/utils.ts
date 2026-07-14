import type { MessageContext } from "../types";

export function userLabel(ctx: MessageContext): string {
  if (ctx.user?.email) return ctx.user.email;
  if (ctx.user?.name) return ctx.user.name;
  if (ctx.user?.id) return `user ${ctx.user.id}`;
  if (ctx.source === "system") return "System";
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

/** A path matcher. When created via {@link exact} it carries the literal
 * target on `exactPath`, allowing the resolver to index it for O(1) lookup. */
export type PathMatcher = ((path: string) => boolean) & { exactPath?: string };

export function exact(target: string): PathMatcher {
  const match: PathMatcher = (path) => path === target;
  match.exactPath = target;
  return match;
}

export function errorCode(ctx: MessageContext): string {
  return ctx.errorCode ?? "UNKNOWN_ERROR";
}

/**
 * Builds a metadata extractor that picks the given fields from the request
 * body. Only primitive values (string/number/boolean) are copied, so nested
 * objects and missing fields are silently skipped. Never pass fields that
 * may hold secrets (passwords, tokens, OTP codes).
 */
export function fromBody(...keys: string[]) {
  return (ctx: MessageContext): Record<string, unknown> | null => {
    if (!ctx.body) return null;
    const out: Record<string, unknown> = {};
    for (const key of keys) {
      const value = ctx.body[key];
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        out[key] = value;
      }
    }
    return Object.keys(out).length > 0 ? out : null;
  };
}

const ERROR_DESCRIPTIONS: Record<string, string> = {
  // Base auth
  USER_NOT_FOUND: "user not found",
  FAILED_TO_CREATE_USER: "failed to create user",
  FAILED_TO_CREATE_SESSION: "failed to create session",
  FAILED_TO_UPDATE_USER: "failed to update user",
  FAILED_TO_GET_SESSION: "failed to get session",
  INVALID_PASSWORD: "wrong password",
  INVALID_EMAIL: "invalid email address",
  INVALID_EMAIL_OR_PASSWORD: "invalid email or password",
  INVALID_USER: "invalid user",
  SOCIAL_ACCOUNT_ALREADY_LINKED: "social account already linked",
  PROVIDER_NOT_FOUND: "OAuth provider not found",
  INVALID_TOKEN: "invalid or expired token",
  TOKEN_EXPIRED: "token expired",
  ID_TOKEN_NOT_SUPPORTED: "id_token not supported",
  FAILED_TO_GET_USER_INFO: "failed to get user info from provider",
  USER_EMAIL_NOT_FOUND: "email not found from provider",
  EMAIL_NOT_VERIFIED: "email not verified",
  PASSWORD_TOO_SHORT: "password too short",
  PASSWORD_TOO_LONG: "password too long",
  USER_ALREADY_EXISTS: "user already exists",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "email already registered",
  EMAIL_CAN_NOT_BE_UPDATED: "email cannot be updated",
  CREDENTIAL_ACCOUNT_NOT_FOUND: "no credential account found",
  ACCOUNT_NOT_FOUND: "account not found",
  SESSION_EXPIRED: "session expired",
  FAILED_TO_UNLINK_LAST_ACCOUNT: "cannot unlink last account",
  USER_ALREADY_HAS_PASSWORD: "user already has a password",
  CROSS_SITE_NAVIGATION_LOGIN_BLOCKED: "cross-site navigation blocked",
  VERIFICATION_EMAIL_NOT_ENABLED: "verification email not enabled",
  EMAIL_ALREADY_VERIFIED: "email already verified",
  EMAIL_MISMATCH: "email mismatch",
  SESSION_NOT_FRESH: "session not fresh — re-authenticate required",
  LINKED_ACCOUNT_ALREADY_EXISTS: "linked account already exists",
  INVALID_ORIGIN: "invalid origin",
  INVALID_CALLBACK_URL: "invalid callback URL",
  INVALID_REDIRECT_URL: "invalid redirect URL",
  INVALID_ERROR_CALLBACK_URL: "invalid error callback URL",
  INVALID_NEW_USER_CALLBACK_URL: "invalid new user callback URL",
  MISSING_OR_NULL_ORIGIN: "missing or null origin",
  CALLBACK_URL_REQUIRED: "callback URL required",
  FAILED_TO_CREATE_VERIFICATION: "failed to create verification",
  FIELD_NOT_ALLOWED: "field not allowed",
  MISSING_FIELD: "missing required field",
  PASSWORD_ALREADY_SET: "password already set",

  // Two-factor
  OTP_NOT_ENABLED: "OTP not enabled",
  OTP_HAS_EXPIRED: "OTP expired",
  TOTP_NOT_ENABLED: "TOTP not enabled",
  TWO_FACTOR_NOT_ENABLED: "two-factor not enabled",
  BACKUP_CODES_NOT_ENABLED: "backup codes not enabled",
  INVALID_BACKUP_CODE: "invalid backup code",
  INVALID_CODE: "invalid verification code",
  TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE: "too many attempts — request a new code",
  INVALID_TWO_FACTOR_COOKIE: "invalid two-factor cookie",

  // Admin
  YOU_CANNOT_BAN_YOURSELF: "cannot ban yourself",
  YOU_ARE_NOT_ALLOWED_TO_CHANGE_USERS_ROLE: "not allowed to change user roles",
  YOU_ARE_NOT_ALLOWED_TO_CREATE_USERS: "not allowed to create users",
  YOU_ARE_NOT_ALLOWED_TO_LIST_USERS: "not allowed to list users",
  YOU_ARE_NOT_ALLOWED_TO_LIST_USERS_SESSIONS: "not allowed to list user sessions",
  YOU_ARE_NOT_ALLOWED_TO_BAN_USERS: "not allowed to ban users",
  YOU_ARE_NOT_ALLOWED_TO_IMPERSONATE_USERS: "not allowed to impersonate users",
  YOU_ARE_NOT_ALLOWED_TO_REVOKE_USERS_SESSIONS: "not allowed to revoke sessions",
  YOU_ARE_NOT_ALLOWED_TO_DELETE_USERS: "not allowed to delete users",
  YOU_ARE_NOT_ALLOWED_TO_SET_USERS_PASSWORD: "not allowed to set user passwords",
  BANNED_USER: "user is banned",
  YOU_ARE_NOT_ALLOWED_TO_GET_USER: "not allowed to view user",
  NO_DATA_TO_UPDATE: "no data provided to update",
  YOU_ARE_NOT_ALLOWED_TO_UPDATE_USERS: "not allowed to update users",
  YOU_CANNOT_REMOVE_YOURSELF: "cannot remove yourself",
  YOU_ARE_NOT_ALLOWED_TO_SET_NON_EXISTENT_VALUE: "cannot set non-existent value",
  YOU_CANNOT_IMPERSONATE_ADMINS: "cannot impersonate admins",
  INVALID_ROLE_TYPE: "invalid role type",

  // Organization
  YOU_ARE_NOT_ALLOWED_TO_CREATE_A_NEW_ORGANIZATION: "not allowed to create organization",
  YOU_HAVE_REACHED_THE_MAXIMUM_NUMBER_OF_ORGANIZATIONS: "maximum organization limit reached",
  ORGANIZATION_ALREADY_EXISTS: "organization already exists",
  ORGANIZATION_SLUG_ALREADY_TAKEN: "organization slug already taken",
  ORGANIZATION_NOT_FOUND: "organization not found",
  USER_IS_NOT_A_MEMBER_OF_THE_ORGANIZATION: "user is not a member",
  YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_ORGANIZATION: "not allowed to update organization",
  YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_ORGANIZATION: "not allowed to delete organization",
  NO_ACTIVE_ORGANIZATION: "no active organization",
  USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION: "user is already a member",
  MEMBER_NOT_FOUND: "member not found",
  ROLE_NOT_FOUND: "role not found",
  YOU_ARE_NOT_ALLOWED_TO_CREATE_A_NEW_TEAM: "not allowed to create team",
  TEAM_ALREADY_EXISTS: "team already exists",
  TEAM_NOT_FOUND: "team not found",
  YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER: "cannot leave as sole owner",
  YOU_CANNOT_LEAVE_THE_ORGANIZATION_WITHOUT_AN_OWNER: "cannot leave without an owner",
  YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_MEMBER: "not allowed to remove member",
  YOU_ARE_NOT_ALLOWED_TO_INVITE_USERS_TO_THIS_ORGANIZATION: "not allowed to invite users",
  USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION: "user already invited",
  INVITATION_NOT_FOUND: "invitation not found",
  YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION: "not the invitation recipient",
  EMAIL_VERIFICATION_REQUIRED_BEFORE_ACCEPTING_OR_REJECTING_INVITATION: "email verification required before accepting invitation",
  YOU_ARE_NOT_ALLOWED_TO_CANCEL_THIS_INVITATION: "not allowed to cancel invitation",
  INVITER_IS_NO_LONGER_A_MEMBER_OF_THE_ORGANIZATION: "inviter is no longer a member",
  YOU_ARE_NOT_ALLOWED_TO_INVITE_USER_WITH_THIS_ROLE: "not allowed to invite with this role",
  FAILED_TO_RETRIEVE_INVITATION: "failed to retrieve invitation",
  YOU_HAVE_REACHED_THE_MAXIMUM_NUMBER_OF_TEAMS: "maximum team limit reached",
  UNABLE_TO_REMOVE_LAST_TEAM: "cannot remove last team",
  YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_MEMBER: "not allowed to update member",
  ORGANIZATION_MEMBERSHIP_LIMIT_REACHED: "membership limit reached",
  INVITATION_LIMIT_REACHED: "invitation limit reached",
  TEAM_MEMBER_LIMIT_REACHED: "team member limit reached",
  USER_IS_NOT_A_MEMBER_OF_THE_TEAM: "user is not a team member",
  YOU_ARE_NOT_ALLOWED_TO_ACCESS_THIS_ORGANIZATION: "not allowed to access organization",
  YOU_ARE_NOT_A_MEMBER_OF_THIS_ORGANIZATION: "not a member of this organization",
  ROLE_NAME_IS_ALREADY_TAKEN: "role name already taken",
  CANNOT_DELETE_A_PRE_DEFINED_ROLE: "cannot delete predefined role",
  ROLE_IS_ASSIGNED_TO_MEMBERS: "role is assigned to members",

  // Phone number
  OTP_EXPIRED: "OTP expired",
  INVALID_OTP: "invalid OTP",
  TOO_MANY_ATTEMPTS: "too many attempts — rate limited",
  INVALID_PHONE_NUMBER: "invalid phone number",
  PHONE_NUMBER_EXIST: "phone number already registered",
  PHONE_NUMBER_NOT_EXIST: "phone number not found",
  INVALID_PHONE_NUMBER_OR_PASSWORD: "invalid phone number or password",
  UNEXPECTED_ERROR: "unexpected error",
  OTP_NOT_FOUND: "OTP not found",
  PHONE_NUMBER_NOT_VERIFIED: "phone number not verified",
  PHONE_NUMBER_CANNOT_BE_UPDATED: "phone number cannot be updated",
  SEND_OTP_NOT_IMPLEMENTED: "send OTP not implemented",

  // Anonymous
  COULD_NOT_CREATE_SESSION: "could not create session",
  ANONYMOUS_USERS_CANNOT_SIGN_IN_AGAIN_ANONYMOUSLY: "anonymous users cannot re-sign in",
  FAILED_TO_DELETE_ANONYMOUS_USER: "failed to delete anonymous user",
  USER_IS_NOT_ANONYMOUS: "user is not anonymous",
  DELETE_ANONYMOUS_USER_DISABLED: "anonymous user deletion disabled",

  // Username
  INVALID_USERNAME_OR_PASSWORD: "invalid username or password",
  USERNAME_IS_ALREADY_TAKEN: "username already taken",
  USERNAME_TOO_SHORT: "username too short",
  USERNAME_TOO_LONG: "username too long",
  INVALID_USERNAME: "invalid username",
  INVALID_DISPLAY_USERNAME: "invalid display username",

  // Multi-session
  INVALID_SESSION_TOKEN: "invalid session token",
};

export function describeError(code: string | undefined | null): string {
  if (!code) return "unknown error";
  return ERROR_DESCRIPTIONS[code] ?? code.toLowerCase().replace(/_/g, " ");
}
