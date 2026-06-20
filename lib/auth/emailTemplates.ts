import type { LinkType, OtpType } from "./verifyWebhook";

// Jinja Meguri brand palette — mirrors app/globals.css design tokens
const C = {
  sand: "#f5f2eb",
  washi: "#fbf9f4",
  stone: "#1a201c",
  ink: "#3f4a42", // muted body ink (between stone and moss-light) for readable copy
  moss: "#223f2d",
  mossLight: "#48624f",
  torii: "#c94b32",
  toriiDark: "#af3a23",
  border: "rgba(72,98,79,0.18)",
  borderSoft: "rgba(72,98,79,0.12)",
} as const;

// Google Fonts import (progressive enhancement — Gmail strips it, serif fallbacks cover it)
const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Noto+Serif+JP:wght@400;700&display=swap');`;

const FONT_SANS = `"DM Sans", ui-sans-serif, system-ui, -apple-system, sans-serif`;
const FONT_DISPLAY = `"Cormorant Garamond", "Noto Serif JP", Georgia, serif`;

// Torii gate — built from divs/tables so it renders everywhere (Gmail strips SVG).
// kasagi (top beam) overhangs two pillars, with a nuki (second beam) between.
function torii(): string {
  const beam = `background:${C.torii};`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 16px;">
  <tr><td style="padding:0;">
    <div style="width:110px;height:9px;${beam}border-radius:2px 2px 1px 1px;"></div>
  </td></tr>
  <tr><td align="center" style="padding:4px 0 0;">
    <div style="width:86px;height:6px;${beam}border-radius:1px;"></div>
  </td></tr>
  <tr><td style="padding:0;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="110" style="width:110px;">
      <tr>
        <td align="left" style="padding-left:12px;"><div style="width:9px;height:40px;${beam}border-radius:0 0 1px 1px;"></div></td>
        <td align="right" style="padding-right:12px;"><div style="width:9px;height:40px;${beam}border-radius:0 0 1px 1px;"></div></td>
      </tr>
    </table>
  </td></tr>
</table>`;
}

function layout(subject: string, preheader: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="light only"/>
<title>${subject}</title>
<style>${FONT_IMPORT}
*{margin:0;padding:0;box-sizing:border-box;}
body{background:${C.sand};font-family:${FONT_SANS};color:${C.stone};-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;}
a{color:${C.torii};}
</style>
</head>
<body>
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${preheader}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.sand};padding:44px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" style="max-width:540px;" cellpadding="0" cellspacing="0">

      <!-- Header -->
      <tr><td style="padding-bottom:30px;text-align:center;">
        ${torii()}
        <div style="font-family:${FONT_DISPLAY};font-size:25px;font-weight:600;color:${C.stone};letter-spacing:0.05em;">Jinja Meguri</div>
        <div style="font-family:${FONT_SANS};font-size:10px;font-weight:600;color:${C.mossLight};letter-spacing:0.32em;margin-top:8px;text-transform:uppercase;">神社巡り &nbsp;·&nbsp; Shrines of Japan</div>
      </td></tr>

      <!-- Card (washi w/ wabi-sabi dashed inner border) -->
      <tr><td style="background:${C.washi};border:1px solid ${C.border};border-radius:6px;padding:6px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px dashed ${C.borderSoft};border-radius:4px;">
          <tr><td style="padding:36px 40px;">
            ${bodyHtml}
          </td></tr>
        </table>
      </td></tr>

      <!-- Footer -->
      <tr><td style="padding-top:26px;text-align:center;">
        <div style="color:${C.torii};font-size:11px;letter-spacing:0.5em;margin-bottom:12px;">◇</div>
        <div style="font-size:11px;color:${C.mossLight};font-family:${FONT_SANS};letter-spacing:0.06em;line-height:1.6;">
          A field guide to the shrines of Japan.
        </div>
        <div style="font-size:11px;color:${C.mossLight};font-family:${FONT_SANS};margin-top:6px;letter-spacing:0.03em;opacity:0.85;">
          If you did not request this, you can safely ignore this message.
        </div>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function eyebrow(text: string): string {
  return `<div style="font-family:${FONT_SANS};font-size:10px;font-weight:600;color:${C.torii};letter-spacing:0.2em;text-transform:uppercase;margin-bottom:14px;">${text}</div>`;
}

function heading(text: string): string {
  return `<h1 style="font-family:${FONT_DISPLAY};font-size:29px;font-weight:600;color:${C.stone};margin-bottom:14px;line-height:1.2;">${text}</h1>`;
}

function para(text: string): string {
  return `<p style="font-family:${FONT_SANS};font-size:15px;line-height:1.7;color:${C.ink};margin-bottom:20px;">${text}</p>`;
}

function ctaButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:30px auto 10px;">
  <tr><td style="background:${C.torii};border-radius:4px;border-bottom:2px solid ${C.toriiDark};">
    <a href="${href}" style="display:inline-block;padding:14px 34px;font-family:${FONT_SANS};font-size:11px;font-weight:600;color:${C.washi};text-decoration:none;letter-spacing:0.14em;text-transform:uppercase;"><span style="color:${C.washi};text-decoration:none;">${label}</span></a>
  </td></tr>
</table>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid ${C.borderSoft};margin:26px 0 18px;"/>`;
}

function note(text: string): string {
  return `<p style="font-family:${FONT_SANS};font-size:12px;color:${C.mossLight};line-height:1.65;">${text}</p>`;
}

function fallbackLink(url: string): string {
  return `<p style="font-family:${FONT_SANS};font-size:12px;color:${C.mossLight};margin-top:12px;line-height:1.6;">
      Button not working? Paste this link into your browser:<br/>
      <a href="${url}" style="color:${C.torii};word-break:break-all;text-decoration:underline;">${url}</a>
    </p>`;
}

function otpCode(code: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:28px auto 12px;">
  <tr><td style="background:${C.sand};border:1px solid ${C.border};border-radius:5px;padding:18px 30px;text-align:center;">
    <span style="font-family:${FONT_DISPLAY};font-size:38px;font-weight:600;letter-spacing:0.34em;color:${C.stone};">${code}</span>
  </td></tr>
</table>
<div style="text-align:center;font-family:${FONT_SANS};font-size:11px;color:${C.mossLight};letter-spacing:0.06em;">This code expires in 10 minutes.</div>`;
}

// --- Public API ---

export type EmailContent = { subject: string; html: string };

const MAGIC_LINK_COPY: Record<
  LinkType,
  {
    subject: string;
    preheader: string;
    eyebrow: string;
    heading: string;
    intro: string;
    cta: string;
    note: string;
  }
> = {
  "email-verification": {
    subject: "Verify your email — Jinja Meguri",
    preheader: "Verify your email to finish setting up your account.",
    eyebrow: "Welcome",
    heading: "Confirm your email",
    intro:
      "You're one step from the gate. Verify your email to finish setting up your Jinja Meguri account and begin exploring Japan's sacred sites.",
    cta: "Verify email",
    note: "This link expires in 24 hours. Didn't create an account? You can safely ignore this email.",
  },
  "sign-in": {
    subject: "Your sign-in link — Jinja Meguri",
    preheader: "Your secure, single-use sign-in link is ready.",
    eyebrow: "Secure sign-in",
    heading: "Your sign-in link",
    intro:
      "Use the button below to sign in to Jinja Meguri. For your security, this link works only once.",
    cta: "Sign in",
    note: "This link expires in 10 minutes and can be used only once.",
  },
  "forget-password": {
    subject: "Reset your password — Jinja Meguri",
    preheader: "Reset your Jinja Meguri password.",
    eyebrow: "Password reset",
    heading: "Reset your password",
    intro:
      "We received a request to reset your password. Choose a new one using the button below.",
    cta: "Reset password",
    note: "This link expires in 1 hour. If you didn't request this, your password is unchanged.",
  },
};

export function renderMagicLinkEmail(
  linkType: LinkType,
  url: string,
): EmailContent {
  const copy = MAGIC_LINK_COPY[linkType];
  const body =
    eyebrow(copy.eyebrow) +
    heading(copy.heading) +
    para(copy.intro) +
    ctaButton(copy.cta, url) +
    divider() +
    note(copy.note) +
    fallbackLink(url);
  return { subject: copy.subject, html: layout(copy.subject, copy.preheader, body) };
}

const OTP_COPY: Record<
  OtpType,
  { subject: string; preheader: string; eyebrow: string; heading: string; intro: string }
> = {
  "email-verification": {
    subject: "Your verification code — Jinja Meguri",
    preheader: "Your email verification code.",
    eyebrow: "Welcome",
    heading: "Confirm your email",
    intro: "Enter this code to verify your email and activate your account.",
  },
  "sign-in": {
    subject: "Your sign-in code — Jinja Meguri",
    preheader: "Your sign-in code.",
    eyebrow: "Secure sign-in",
    heading: "Your sign-in code",
    intro: "Enter this code to finish signing in to Jinja Meguri.",
  },
  "forget-password": {
    subject: "Your password reset code — Jinja Meguri",
    preheader: "Your password reset code.",
    eyebrow: "Password reset",
    heading: "Reset your password",
    intro: "Enter this code to continue resetting your password.",
  },
};

export function renderOtpEmail(otpType: OtpType, code: string): EmailContent {
  const copy = OTP_COPY[otpType];
  const body =
    eyebrow(copy.eyebrow) +
    heading(copy.heading) +
    para(copy.intro) +
    otpCode(code) +
    divider() +
    note("Do not share this code with anyone. Jinja Meguri will never ask for it.");
  return { subject: copy.subject, html: layout(copy.subject, copy.preheader, body) };
}
