import assert from "node:assert/strict";
import { createCreatorSignup, InfraiError } from "./creator_signup.ts";

const originalFetch = globalThis.fetch;
const calls: Array<{ path: string; body: Record<string, unknown> }> = [];
globalThis.fetch = async (input, init) => {
  const url = String(input);
  calls.push({ path: new URL(url).pathname, body: JSON.parse(String(init?.body)) });
  const body = calls.length === 1 ? { ok: true, data: { verified: false }, metadata: {} } : { ok: true, data: { user_id: "creator-42" }, metadata: {} };
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
};

try {
  await assert.rejects(
    createCreatorSignup({ email: "writer@example.com", password: "long-enough-password", name: "Mina", widget_record_id: "widget-record-42", captchaToken: "token", ip: "203.0.113.4", vendor: "hcaptcha", action: "creator_signup", idempotency_key: "signup-42" }, "test-key"),
    (error: unknown) => error instanceof InfraiError && error.status === 422,
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, "/v1/captcha/verify");
  assert.equal(calls[0].body.token, "token");
  assert.equal(calls[0].body.widget_record_id, "widget-record-42");
  console.log("captcha rejection blocks creator registration before user creation");
} finally {
  globalThis.fetch = originalFetch;
}
