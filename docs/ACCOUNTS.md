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
2. **Authorization** — signing in is not enough. The account's **role** (stored on the user
   record in the hosted auth service) must be `admin`. Accounts with any other role see the
   regular site and are treated as if the admin area does not exist.

Route and action guards live in the application code (see
[`lib/auth/server.ts`](../lib/auth/server.ts)).

## Onboarding a new admin

Admins are **promoted from an ordinary account** — there is no separate admin sign-up, and
no allowlist to maintain.

1. **They self-register** at the public Sign up page and set their own password.
2. **You promote them** by setting that account's role to `admin` on the user record in the
   hosted auth service (a one-line database update, or the service's set-role admin action).

Both steps need no code change or redeploy. Demotion is the reverse — set the role back to the
normal-user value. Users can never promote themselves: sign-up always creates a normal-user role.

## User accounts

Anyone can self-register from the public **Sign up** page. A self-registered account is a **normal
user** — it is created in the hosted auth service with the normal-user role (not `admin`), so it
sees the regular site (and a placeholder "User Controls" surface) but none of the admin editing
affordances. Promotion to admin happens only when a manager sets the account's role to `admin`
(the onboarding step above) — users cannot self-promote.

- **Sign up / Sign in** are linked from the site nav (a profile icon replaces them once signed in).
- **Social sign-in** (e.g. *Continue with Google*) is offered on both the Sign up and Sign in pages —
  OAuth is one flow for both. A first-time social sign-in creates a normal-user account (same role rules
  as email sign-up; no self-promotion). Each provider must be **enabled in the hosted auth service's
  console** with an OAuth client id/secret (registered in that provider's developer console) and the
  app's callback URL — there is no provider config in application code, and the button errors until the
  provider is enabled.
- **Email verification is required**: after signing up, the user must click the link emailed to them
  before they can sign in. The hosted auth service must have email verification enabled and a
  reachable sender configured.
- Each user has a private profile page (owner-only; others get a 404) reachable from the profile icon.

> In production, the deployed domain must be registered as a trusted origin with the auth
> service, or the emailed link is rejected. Use a real, reachable inbox — the link is only
> delivered by email.

## Removing or demoting an admin

- Set the account's role back to the normal-user value to revoke admin access (their login
  remains, now as a normal user).
- To remove them entirely, delete the account in the hosting console.

## Configuration

The app reads its database connection and auth-service settings from environment variables,
set locally and in the deployment platform. Secrets are never committed; see `.env.example`
for the (non-secret) template.

### Auth emails (Resend)

Auth emails (verification links, sign-in codes, password resets) are delivered via
[Resend](https://resend.com) through a Neon Auth webhook. When Neon Auth needs to send an
email it POSTs a signed event to `/api/webhooks/neon-auth`; the handler verifies the
signature, renders a branded HTML template, and sends it via Resend.

**Required env vars** (add to `.env.local` and your deployment platform):

```
RESEND_API_KEY=re_...
MAIL_FROM="Jinja Meguri <onboarding@resend.dev>"
```

> **Test sender:** `onboarding@resend.dev` (Resend's shared address) only delivers to the
> email address registered on your Resend account. To send to arbitrary users, verify your
> own domain in the Resend dashboard and update `MAIL_FROM` accordingly.

**Register the webhook with Neon** (run once per branch after deploying):

```bash
curl -X PUT "https://console.neon.tech/api/v2/projects/{project_id}/branches/{branch_id}/auth/webhooks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NEON_API_KEY" \
  -d '{
    "enabled": true,
    "webhook_url": "https://<your-deployed-host>/api/webhooks/neon-auth",
    "enabled_events": ["send.otp", "send.magic_link"],
    "timeout_seconds": 5
  }'
```

Find your `project_id` and `branch_id` in the Neon Console URL or via `neonctl projects list`.

> **HTTPS only:** Neon Auth rejects localhost, raw IPs, and private addresses. For local
> testing, expose the dev server through an ngrok HTTPS tunnel and register that URL.
