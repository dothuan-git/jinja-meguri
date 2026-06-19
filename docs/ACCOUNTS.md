# Admin access

The site has a private admin area for managing shrine content. It is not linked from the
public site and is excluded from search indexing.

> This document is public. It describes the model at a high level only. Exact routes,
> database commands, table names, and environment-variable names are intentionally omitted —
> see the source and your deployment/hosting console for those.

## How auth works

Two independent layers:

1. **Authentication** — a managed, hosted auth service owns the sign-in form, the session
   cookie, and the user records.
2. **Authorization** — signing in is not enough. The account must also appear on an internal
   admin allowlist. Authenticated accounts that are not allow-listed are treated as if the
   admin area does not exist.

Route and action guards live in the application code (see
[`lib/auth/server.ts`](../lib/auth/server.ts)).

## Onboarding a new admin

Three steps. The same email must be used throughout.

1. **Create the person's auth account** in the hosting console. No password is set here.
2. **Add their email to the admin allowlist** (a database entry). Each entry carries a `role`
   — either `admin` (full access, the default) or `editor` (content authoring only, restrictions
   to be defined). Omitting the role defaults to `admin`.
3. **They set their own password.** From the admin sign-in page they use the
   "first time / forgot password" link, receive a one-time link by email (it expires shortly),
   set a password, and can then sign in.

> **Note:** the sign-in / password-reset UI was removed and is being re-implemented from scratch.
> The auth backend (Neon Auth + the `app_admin` allowlist) is unchanged; until the new sign-in UI
> lands, the password flow above has no in-app entry point.

Adding, removing, or changing a role needs no code change or redeploy — it is a database update only.

> In production, the deployed domain must be registered as a trusted origin with the auth
> service, or the emailed link is rejected. Use a real, reachable inbox — the link is only
> delivered by email.

## Removing or demoting an admin

- Remove their entry from the admin allowlist to revoke access entirely (their auth login can remain).
- To change their role, update the `role` value on their allowlist entry.
- To remove them entirely, also delete the account in the hosting console.

## Configuration

The app reads its database connection and auth-service settings from environment variables,
set locally and in the deployment platform. Secrets are never committed; see `.env.example`
for the (non-secret) template.
