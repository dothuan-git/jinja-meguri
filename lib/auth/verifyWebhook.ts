import crypto from "node:crypto";

type Jwk = { kid: string; [key: string]: unknown };
type JwksCache = { keys: Jwk[]; fetchedAt: number } | null;

let jwksCache: JwksCache = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function getJwks(): Promise<Jwk[]> {
  if (jwksCache && Date.now() - jwksCache.fetchedAt < CACHE_TTL_MS) {
    return jwksCache.keys;
  }
  const res = await fetch(
    `${process.env.NEON_AUTH_BASE_URL}/.well-known/jwks.json`,
  );
  if (!res.ok) throw new Error(`Failed to fetch JWKS: ${res.status}`);
  const data = (await res.json()) as { keys: Jwk[] };
  jwksCache = { keys: data.keys, fetchedAt: Date.now() };
  return data.keys;
}

async function findKey(kid: string): Promise<Jwk> {
  let keys = await getJwks();
  let key = keys.find((k) => k.kid === kid);
  if (!key) {
    // Refresh once on unknown kid (key rotation)
    jwksCache = null;
    keys = await getJwks();
    key = keys.find((k) => k.kid === kid);
  }
  if (!key) throw new Error(`Key ${kid} not found in JWKS`);
  return key;
}

export type NeonWebhookEventType =
  | "send.otp"
  | "send.magic_link"
  | "user.before_create"
  | "user.created"
  | "phone_number.verified";

export type OtpType = "sign-in" | "email-verification" | "forget-password";
export type LinkType = "sign-in" | "email-verification" | "forget-password";

export type NeonWebhookPayload = {
  event_id: string;
  event_type: NeonWebhookEventType;
  timestamp: string;
  context: { endpoint_id: string; project_name: string };
  user: {
    id?: string;
    email?: string;
    name?: string;
    email_verified?: boolean;
    created_at?: string;
  };
  event_data:
    | {
        otp_code: string;
        otp_type: OtpType;
        delivery_preference?: "email" | "sms";
        expires_at: string;
        ip_address: string;
        user_agent: string;
      }
    | {
        link_type: LinkType;
        link_url: string;
        token: string;
        expires_at: string;
        ip_address: string;
        user_agent: string;
      }
    | {
        auth_provider: string;
        ip_address: string;
        user_agent: string;
      };
};

export async function verifyNeonWebhook(
  rawBody: string,
  headers: Headers,
): Promise<NeonWebhookPayload> {
  const signature = headers.get("x-neon-signature");
  const kid = headers.get("x-neon-signature-kid");
  const timestamp = headers.get("x-neon-timestamp");

  if (!signature || !kid || !timestamp) {
    throw new Error("Missing required Neon webhook headers");
  }

  const jwk = await findKey(kid);
  const publicKey = crypto.createPublicKey({ key: jwk as crypto.JsonWebKeyInput["key"], format: "jwk" });

  const [headerB64, emptyPayload, signatureB64] = signature.split(".");
  if (emptyPayload !== "") throw new Error("Expected detached JWS format");

  // Double base64url encoding per RFC 7515: bind timestamp into the signing input
  const payloadB64 = Buffer.from(rawBody, "utf8").toString("base64url");
  const signaturePayloadB64 = Buffer.from(
    `${timestamp}.${payloadB64}`,
    "utf8",
  ).toString("base64url");
  const signingInput = `${headerB64}.${signaturePayloadB64}`;

  const isValid = crypto.verify(
    null,
    Buffer.from(signingInput),
    publicKey,
    Buffer.from(signatureB64, "base64url"),
  );
  if (!isValid) throw new Error("Invalid webhook signature");

  // Reject requests older than 5 minutes (replay guard)
  const ageMs = Date.now() - parseInt(timestamp, 10);
  if (ageMs > 5 * 60 * 1000) throw new Error("Webhook timestamp too old");

  return JSON.parse(rawBody) as NeonWebhookPayload;
}
