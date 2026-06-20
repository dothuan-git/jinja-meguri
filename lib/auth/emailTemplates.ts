import type { LinkType, OtpType } from "./verifyWebhook";

// Jinja Meguri brand palette — mirrors app/globals.css design tokens
const C = {
  sand: "#f5f2eb",
  washi: "#fbf9f4",
  stone: "#1a201c",
  moss: "#223f2d",
  mossLight: "#48624f",
  torii: "#c94b32",
  toriiDark: "#af3a23",
  border: "rgba(72,98,79,0.18)",
} as const;

// Google Fonts import (progressive enhancement — Gmail strips it, serif fallbacks cover it)
const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Noto+Serif+JP:wght@400;700&display=swap');`;

const FONT_SANS = `"DM Sans", ui-sans-serif, system-ui, -apple-system, sans-serif`;
const FONT_DISPLAY = `"Cormorant Garamond", "Noto Serif JP", Georgia, serif`;

function layout(subject: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${subject}</title>
<style>${FONT_IMPORT}
*{margin:0;padding:0;box-sizing:border-box;}
body{background:${C.sand};font-family:${FONT_SANS};color:${C.stone};-webkit-font-smoothing:antialiased;}
</style>
</head>
<body>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.sand};padding:40px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" style="max-width:520px;" cellpadding="0" cellspacing="0">

      <!-- Header -->
      <tr><td style="padding-bottom:28px;text-align:center;">
        <!-- Hanko seal -->
        <div style="display:inline-block;border:2.2px solid ${C.torii};color:${C.torii};font-family:${FONT_DISPLAY};font-weight:700;font-size:22px;line-height:1;padding:8px 10px;margin-bottom:12px;">神</div>
        <div style="font-family:${FONT_DISPLAY};font-size:22px;font-weight:600;color:${C.stone};letter-spacing:0.08em;">Jinja Meguri</div>
        <div style="font-family:${FONT_DISPLAY};font-size:14px;color:${C.mossLight};letter-spacing:0.3em;margin-top:2px;">神社巡り</div>
      </td></tr>

      <!-- Card -->
      <tr><td style="background:${C.washi};border:1px solid ${C.border};border-radius:4px;padding:36px 40px;">
        ${bodyHtml}
      </td></tr>

      <!-- Footer -->
      <tr><td style="padding-top:24px;text-align:center;">
        <div style="font-size:11px;color:${C.mossLight};font-family:${FONT_SANS};letter-spacing:0.08em;">
          A field guide to the shrines of Japan.
        </div>
        <div style="font-size:11px;color:${C.mossLight};font-family:${FONT_SANS};margin-top:6px;letter-spacing:0.04em;">
          If you did not request this, you can safely ignore this message.
        </div>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function heading(text: string): string {
  return `<h1 style="font-family:${FONT_DISPLAY};font-size:26px;font-weight:600;color:${C.stone};margin-bottom:12px;line-height:1.25;">${text}</h1>`;
}

function para(text: string): string {
  return `<p style="font-size:15px;line-height:1.65;color:${C.mossLight};margin-bottom:20px;">${text}</p>`;
}

function ctaButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr><td style="background:${C.torii};border-radius:4px;">
    <a href="${href}" style="display:inline-block;padding:13px 28px;font-family:${FONT_SANS};font-size:11px;font-weight:700;color:${C.washi};text-decoration:none;letter-spacing:0.12em;text-transform:uppercase;">${label}</a>
  </td></tr>
</table>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid ${C.border};margin:24px 0;"/>`;
}

function otpCode(code: string): string {
  return `<div style="text-align:center;margin:28px 0;">
  <div style="display:inline-block;background:${C.sand};border:1px solid ${C.border};border-radius:4px;padding:18px 32px;">
    <span style="font-family:${FONT_DISPLAY};font-size:36px;font-weight:600;letter-spacing:0.35em;color:${C.stone};">${code}</span>
  </div>
  <div style="font-size:11px;color:${C.mossLight};margin-top:10px;letter-spacing:0.08em;font-family:${FONT_SANS};">This code expires in 10 minutes.</div>
</div>`;
}

// --- Public API ---

export type EmailContent = { subject: string; html: string };

const MAGIC_LINK_COPY: Record<
  LinkType,
  { subject: string; heading: string; intro: string; cta: string; note: string }
> = {
  "email-verification": {
    subject: "Verify your email — Jinja Meguri",
    heading: "Step beyond the gateway.",
    intro:
      "Welcome. To complete your account and begin your pilgrimage through Japan's sacred sites, please verify your email address.",
    cta: "Verify my email",
    note: "This link expires in 24 hours. If you did not create an account, no action is needed.",
  },
  "sign-in": {
    subject: "Your sign-in link — Jinja Meguri",
    heading: "Welcome back.",
    intro:
      "A sign-in link has been prepared for you. Click below to enter your sanctuary.",
    cta: "Sign in",
    note: "This link expires in 10 minutes and can only be used once.",
  },
  "forget-password": {
    subject: "Reset your password — Jinja Meguri",
    heading: "Restore your sanctuary.",
    intro:
      "We received a request to reset the password for your Jinja Meguri account. Click below to choose a new password.",
    cta: "Reset password",
    note: "This link expires in 1 hour. If you did not request a reset, your account is safe and no changes have been made.",
  },
};

export function renderMagicLinkEmail(
  linkType: LinkType,
  url: string,
): EmailContent {
  const copy = MAGIC_LINK_COPY[linkType];
  const body =
    heading(copy.heading) +
    para(copy.intro) +
    ctaButton(copy.cta, url) +
    divider() +
    `<p style="font-size:12px;color:${C.mossLight};font-family:${FONT_SANS};line-height:1.6;">${copy.note}</p>` +
    `<p style="font-size:12px;color:${C.mossLight};font-family:${FONT_SANS};margin-top:10px;line-height:1.6;">
      Or copy this link into your browser:<br/>
      <span style="color:${C.torii};word-break:break-all;">${url}</span>
    </p>`;
  return { subject: copy.subject, html: layout(copy.subject, body) };
}

const OTP_COPY: Record<
  OtpType,
  { subject: string; heading: string; intro: string }
> = {
  "email-verification": {
    subject: "Your verification code — Jinja Meguri",
    heading: "Verify your email.",
    intro: "Enter the code below to confirm your email address and activate your account.",
  },
  "sign-in": {
    subject: "Your sign-in code — Jinja Meguri",
    heading: "Welcome back.",
    intro: "Use the code below to complete your sign-in.",
  },
  "forget-password": {
    subject: "Your password reset code — Jinja Meguri",
    heading: "Reset your password.",
    intro: "Enter the code below to proceed with resetting your password.",
  },
};

export function renderOtpEmail(otpType: OtpType, code: string): EmailContent {
  const copy = OTP_COPY[otpType];
  const body =
    heading(copy.heading) +
    para(copy.intro) +
    otpCode(code) +
    divider() +
    `<p style="font-size:12px;color:${C.mossLight};font-family:${FONT_SANS};line-height:1.6;">
      Do not share this code with anyone. Jinja Meguri will never ask for it.
    </p>`;
  return { subject: copy.subject, html: layout(copy.subject, body) };
}
