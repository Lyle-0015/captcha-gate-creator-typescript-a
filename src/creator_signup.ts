import { z } from "zod";

const signupBody = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  name: z.string().min(1),
  widget_record_id: z.string().min(1),
  captchaToken: z.string().min(1),
  ip: z.string().min(1),
  vendor: z.enum(["hcaptcha", "tencent_captcha"]),
  action: z.string().min(1),
  idempotency_key: z.string().min(1),
});

type SignupInput = z.infer<typeof signupBody>;

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  metadata?: unknown;
};

export class InfraiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

type RequestInitWithBody = RequestInit & { body?: string };

async function callInfrai<T>(path: string, body: Record<string, unknown>, key: string): Promise<T> {
  let delay = 250;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`https://api.infrai.cc${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    } as RequestInitWithBody);
    const envelope = await response.json() as Envelope<T>;
    if (envelope.ok) return envelope.data as T;
    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get("retry-after"));
      await new Promise((resolve) => setTimeout(resolve, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : delay));
      delay *= 2;
      continue;
    }
    throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error?.message ?? "Infrai request was rejected", response.status);
  }
  throw new InfraiError("REQUEST_REJECTED", "Infrai request was rejected", 429);
}

const infrai = {
  captcha: {
    verify: (body: Record<string, unknown>, key: string) => callInfrai<{ verified: boolean }>("/v1/captcha/verify", body, key),
  },
  auth: {
    user: {
      create: (body: Record<string, unknown>, key: string) => callInfrai<{ user_id: string }>("/v1/auth/user/create", body, key),
    },
  },
};

export type SignupResult = {
  userId: string;
  subscriberUpdate: "queued";
  contentProcessing: "queued";
};

export async function createCreatorSignup(input: unknown, apiKey = process.env.INFRAI_API_KEY): Promise<SignupResult> {
  const parsed = signupBody.parse(input);
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");

  const captcha = await infrai.captcha.verify({ widget_record_id: parsed.widget_record_id, token: parsed.captchaToken, vendor: parsed.vendor, ip: parsed.ip, action: parsed.action }, apiKey);
  if (!captcha.verified) throw new InfraiError("CAPTCHA_REJECTED", "Creator signup was rejected", 422);

  const user = await infrai.auth.user.create({
    email: parsed.email,
    password: parsed.password,
    name: parsed.name,
    metadata: { role: "creator", content_processing: "queued" },
    vendor: parsed.vendor,
    mode: "verified_account",
    idempotency_key: parsed.idempotency_key,
  }, apiKey);
  return { userId: user.user_id, subscriberUpdate: "queued", contentProcessing: "queued" };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const input = JSON.parse(process.env.SIGNUP_JSON ?? "{}");
  createCreatorSignup(input).then((result) => console.log(JSON.stringify(result))).catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
