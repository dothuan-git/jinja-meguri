import { NextResponse } from "next/server";
import type { LinkType, OtpType } from "@/lib/auth/verifyWebhook";
import {
  renderMagicLinkEmail,
  renderOtpEmail,
  type EmailContent,
} from "@/lib/auth/emailTemplates";

// Dev-only gallery for previewing the transactional email templates without
// signing up or hitting the Neon Auth webhook. Visit /dev/emails.
// Never served in production.

export const dynamic = "force-dynamic";

const SAMPLE_URL =
  "https://jinja-meguri.example/auth/callback?token=preview-0a1b2c3d4e5f6g7h8i9j";
const SAMPLE_CODE = "847291";

const LINK_TYPES: LinkType[] = ["email-verification", "sign-in", "forget-password"];
const OTP_TYPES: OtpType[] = ["email-verification", "sign-in", "forget-password"];

type Variant = { key: string; label: string; content: EmailContent };

function variants(): Variant[] {
  return [
    ...LINK_TYPES.map((t) => ({
      key: `ml-${t}`,
      label: `Magic link · ${t}`,
      content: renderMagicLinkEmail(t, SAMPLE_URL),
    })),
    ...OTP_TYPES.map((t) => ({
      key: `otp-${t}`,
      label: `OTP code · ${t}`,
      content: renderOtpEmail(t, SAMPLE_CODE),
    })),
  ];
}

function indexPage(items: Variant[]): string {
  const cards = items
    .map(
      (v) => `<section style="display:flex;flex-direction:column;gap:8px;">
  <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;">
    <h2 style="margin:0;font-size:14px;font-weight:600;color:#1a201c;">${v.label}</h2>
    <a href="?preview=${v.key}" target="_blank" rel="noreferrer" style="font-size:12px;color:#c94b32;">open full ↗</a>
  </div>
  <div style="font-size:12px;color:#48624f;">${v.content.subject}</div>
  <iframe src="?preview=${v.key}" title="${v.label}" style="width:100%;height:640px;border:1px solid rgba(72,98,79,0.2);border-radius:6px;background:#f5f2eb;"></iframe>
</section>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Email previews · Jinja Meguri</title>
<style>
  body{margin:0;background:#eceae4;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;color:#1a201c;padding:28px;}
  h1{font-size:18px;margin:0 0 4px;}
  p.lede{margin:0 0 24px;font-size:13px;color:#48624f;}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:28px;}
</style>
</head>
<body>
  <h1>Transactional email previews</h1>
  <p class="lede">Browser rendering of the templates in <code>lib/auth/emailTemplates.ts</code>. Confirm real-client quirks (Gmail/Outlook) with an actual send before shipping.</p>
  <div class="grid">
${cards}
  </div>
</body>
</html>`;
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }

  const items = variants();
  const preview = new URL(request.url).searchParams.get("preview");

  if (preview) {
    const match = items.find((v) => v.key === preview);
    if (!match) return new NextResponse("Unknown preview", { status: 404 });
    return new NextResponse(match.content.html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return new NextResponse(indexPage(items), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
