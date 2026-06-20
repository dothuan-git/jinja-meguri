export const runtime = "nodejs";

import { Resend } from "resend";
import { verifyNeonWebhook } from "@/lib/auth/verifyWebhook";
import {
  renderMagicLinkEmail,
  renderOtpEmail,
} from "@/lib/auth/emailTemplates";
import type { LinkType, OtpType } from "@/lib/auth/verifyWebhook";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM =
  process.env.MAIL_FROM ?? "Jinja Meguri <onboarding@resend.dev>";

export async function POST(request: Request): Promise<Response> {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return Response.json({ error: "Failed to read body" }, { status: 400 });
  }

  let payload;
  try {
    payload = await verifyNeonWebhook(rawBody, request.headers as Headers);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed";
    return Response.json({ error: message }, { status: 401 });
  }

  const { event_type, event_data, user } = payload;
  const to = user.email;

  if (!to) {
    return Response.json({ error: "No recipient email in payload" }, { status: 400 });
  }

  try {
    if (event_type === "send.otp") {
      const data = event_data as {
        otp_code: string;
        otp_type: OtpType;
      };
      const { subject, html } = renderOtpEmail(data.otp_type, data.otp_code);
      await resend.emails.send({ from: FROM, to, subject, html });
    } else if (event_type === "send.magic_link") {
      const data = event_data as { link_type: LinkType; link_url: string };
      const { subject, html } = renderMagicLinkEmail(data.link_type, data.link_url);
      await resend.emails.send({ from: FROM, to, subject, html });
    }
    // Non-email events (user.created, etc.) — acknowledge and ignore
  } catch (err) {
    // Return 500 so Neon Auth retries (max 3 attempts, 15s global budget)
    const message = err instanceof Error ? err.message : "Send failed";
    console.error("[neon-auth webhook] email send error:", message);
    return Response.json({ error: message }, { status: 500 });
  }

  return Response.json({ success: true });
}
